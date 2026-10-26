-- The initial Supabase CLI migrations have already created the catalogue tables.
-- This migration is additive and safe for the linked production database.

alter table public.categories
    add column if not exists description text not null default '',
    add column if not exists image_url text;

alter table public.products
    add column if not exists sku text,
    add column if not exists weight_grams numeric(10, 3);

create unique index if not exists products_sku_unique
    on public.products (sku)
    where sku is not null;

alter table public.products
    drop constraint if exists products_weight_non_negative;

alter table public.products
    add constraint products_weight_non_negative check (weight_grams is null or weight_grams >= 0);

create table if not exists public.product_images (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products (id) on delete cascade,
    storage_path text not null,
    image_url text,
    alt_text text not null default '',
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    constraint product_images_storage_path_not_blank check (length(btrim(storage_path)) > 0),
    constraint product_images_display_order_non_negative check (display_order >= 0),
    constraint product_images_product_path_unique unique (product_id, storage_path)
);

create index if not exists product_images_product_order_idx
    on public.product_images (product_id, display_order);

-- Product-image metadata is backend-managed. Browser API roles have no direct
-- table access; image bytes will later be delivered through Supabase Storage.
revoke all on table public.product_images from anon, authenticated;
alter table public.product_images enable row level security;

-- The brand is not a category. Men and Women are the active root categories.
update public.categories
set parent_id = null
where id in (
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000020'
);

update public.categories
set is_active = false
where id = '10000000-0000-0000-0000-000000000001';

update public.categories
set name = 'Bracelets', slug = 'bracelets'
where id = '10000000-0000-0000-0000-000000000013';
