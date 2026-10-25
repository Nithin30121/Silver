-- =============================================================================
-- SILVESTO LUXE: extensible catalogue categories and product assignments
--
-- The storefront currently reads products from src/data/products.ts. This
-- migration intentionally does not alter that data or move the storefront to
-- database queries; it creates the secure catalogue foundation for that later
-- change.
-- =============================================================================

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null,
    parent_id uuid references public.categories (id) on delete restrict,
    category_type text not null default 'collection',
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint categories_name_not_blank check (length(btrim(name)) > 0),
    constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    constraint categories_display_order_non_negative check (display_order >= 0),
    constraint categories_type_valid check (category_type in ('landing_page', 'audience', 'collection', 'items')),
    constraint categories_not_own_parent check (parent_id is null or parent_id <> id)
);

-- Slugs only need to be unique among siblings: both Men's and Women's branches
-- can therefore have a "rings" page without inventing presentation-only names.
create unique index categories_root_slug_unique
    on public.categories (slug)
    where parent_id is null;

create unique index categories_sibling_slug_unique
    on public.categories (parent_id, slug)
    where parent_id is not null;

create index categories_active_parent_order_idx
    on public.categories (parent_id, display_order, name)
    where is_active;

create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    description text not null default '',
    price numeric(12, 2) not null,
    image_url text,
    stock_quantity integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint products_name_not_blank check (length(btrim(name)) > 0),
    constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    constraint products_price_non_negative check (price >= 0),
    constraint products_stock_non_negative check (stock_quantity >= 0)
);

create index products_active_name_idx
    on public.products (name)
    where is_active;

create table public.category_products (
    category_id uuid not null references public.categories (id) on delete cascade,
    product_id uuid not null references public.products (id) on delete cascade,
    display_order integer not null default 0,
    primary key (category_id, product_id),
    constraint category_products_display_order_non_negative check (display_order >= 0)
);

create index category_products_product_order_idx
    on public.category_products (product_id, display_order);

create index category_products_category_order_idx
    on public.category_products (category_id, display_order);

-- Reuse the audited timestamp trigger function introduced by the profiles
-- migration. The trigger keeps timestamps correct for administrator updates.
create trigger categories_set_updated_at
    before update on public.categories
    for each row
    execute function public.set_updated_at();

create trigger products_set_updated_at
    before update on public.products
    for each row
    execute function public.set_updated_at();

-- A check constraint can prevent direct self-parenting but cannot detect a
-- longer cycle. This trigger keeps the taxonomy a real tree at any depth.
create function public.prevent_category_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.parent_id is null then
        return new;
    end if;

    if exists (
        with recursive ancestors as (
            select category.id, category.parent_id
            from public.categories as category
            where category.id = new.parent_id

            union all

            select category.id, category.parent_id
            from public.categories as category
            join ancestors on category.id = ancestors.parent_id
        )
        select 1 from ancestors where id = new.id
    ) then
        raise exception 'A category cannot be assigned to one of its descendants'
            using errcode = '23514';
    end if;

    return new;
end;
$$;

create trigger categories_prevent_cycle
    before insert or update of parent_id on public.categories
    for each row
    execute function public.prevent_category_cycle();

revoke execute on function public.prevent_category_cycle() from public, anon, authenticated;

-- Centralized authorization helper. It runs as the database owner so policy
-- evaluation is not constrained by profiles' customer-facing RLS policy.
create function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles as profile
        where profile.id = (select auth.uid())
          and profile.role = 'admin'
    );
$$;

revoke all on function public.is_catalog_admin() from public, anon;
grant execute on function public.is_catalog_admin() to authenticated;

-- Supabase grants table API privileges by default. Start from no access and
-- grant only the operations backed by the policies below.
revoke all on table public.categories, public.products, public.category_products from anon, authenticated;
grant select on table public.categories, public.products, public.category_products to anon, authenticated;
grant insert, update, delete on table public.categories, public.products, public.category_products to authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.category_products enable row level security;

create policy "Public can view active categories"
    on public.categories for select
    to anon, authenticated
    using (is_active);

create policy "Catalog administrators manage categories"
    on public.categories for all
    to authenticated
    using ((select public.is_catalog_admin()))
    with check ((select public.is_catalog_admin()));

create policy "Public can view active products"
    on public.products for select
    to anon, authenticated
    using (is_active);

create policy "Catalog administrators manage products"
    on public.products for all
    to authenticated
    using ((select public.is_catalog_admin()))
    with check ((select public.is_catalog_admin()));

-- Do not expose assignments to unpublished records or inactive categories.
create policy "Public can view assignments for active catalogue records"
    on public.category_products for select
    to anon, authenticated
    using (
        exists (
            select 1 from public.categories as category
            where category.id = category_products.category_id
              and category.is_active
        )
        and exists (
            select 1 from public.products as product
            where product.id = category_products.product_id
              and product.is_active
        )
    );

create policy "Catalog administrators manage product assignments"
    on public.category_products for all
    to authenticated
    using ((select public.is_catalog_admin()))
    with check ((select public.is_catalog_admin()));

-- Seed the requested hierarchy. Stable IDs plus ON CONFLICT DO NOTHING make
-- this safe to execute repeatedly without duplicate branches or categories.
insert into public.categories (id, name, slug, parent_id, category_type, display_order)
values
    ('10000000-0000-0000-0000-000000000001', 'Landing Page', 'landing', null, 'landing_page', 0),
    ('10000000-0000-0000-0000-000000000010', 'Men', 'men', '10000000-0000-0000-0000-000000000001', 'audience', 0),
    ('10000000-0000-0000-0000-000000000011', 'All Men''s Jewellery', 'all-jewellery', '10000000-0000-0000-0000-000000000010', 'collection', 0),
    ('10000000-0000-0000-0000-000000000012', 'Rings', 'rings', '10000000-0000-0000-0000-000000000010', 'collection', 1),
    ('10000000-0000-0000-0000-000000000013', 'Bracelet', 'bracelet', '10000000-0000-0000-0000-000000000010', 'collection', 2),
    ('10000000-0000-0000-0000-000000000014', 'Items', 'items', '10000000-0000-0000-0000-000000000010', 'items', 3),
    ('10000000-0000-0000-0000-000000000020', 'Women', 'women', '10000000-0000-0000-0000-000000000001', 'audience', 1),
    ('10000000-0000-0000-0000-000000000021', 'All Women''s Jewellery', 'all-jewellery', '10000000-0000-0000-0000-000000000020', 'collection', 0),
    ('10000000-0000-0000-0000-000000000022', 'Rings', 'rings', '10000000-0000-0000-0000-000000000020', 'collection', 1),
    ('10000000-0000-0000-0000-000000000023', 'Bracelets', 'bracelets', '10000000-0000-0000-0000-000000000020', 'collection', 2),
    ('10000000-0000-0000-0000-000000000024', 'Necklaces', 'necklaces', '10000000-0000-0000-0000-000000000020', 'collection', 3),
    ('10000000-0000-0000-0000-000000000025', 'Items', 'items', '10000000-0000-0000-0000-000000000020', 'items', 4)
on conflict (id) do nothing;
