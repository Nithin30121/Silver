-- Customer orders are server-managed through Spring Boot. Browser Supabase roles
-- have no table access; the API validates the Supabase JWT and always scopes a
-- customer request to its token subject.

create sequence if not exists public.order_number_seq start with 100000;

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number text not null unique default (
        'SL-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 8, '0')
    ),
    customer_id uuid not null references public.profiles (id) on delete restrict,
    status text not null default 'PENDING_PAYMENT',
    payment_status text not null default 'PENDING',
    payment_method text not null,
    subtotal numeric(12, 2) not null,
    shipping_amount numeric(12, 2) not null default 0,
    total_amount numeric(12, 2) not null,
    shipping_full_name text not null,
    shipping_email text not null,
    shipping_phone text not null,
    shipping_address text not null,
    shipping_city text not null,
    shipping_state text not null,
    shipping_postal_code text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint orders_status_valid check (status in ('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    constraint orders_payment_status_valid check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    constraint orders_payment_method_valid check (payment_method in ('UPI', 'CARD', 'COD')),
    constraint orders_subtotal_non_negative check (subtotal >= 0),
    constraint orders_shipping_non_negative check (shipping_amount >= 0),
    constraint orders_total_matches_components check (total_amount = subtotal + shipping_amount),
    constraint orders_shipping_full_name_not_blank check (length(btrim(shipping_full_name)) > 0),
    constraint orders_shipping_email_not_blank check (length(btrim(shipping_email)) > 0),
    constraint orders_shipping_phone_not_blank check (length(btrim(shipping_phone)) > 0),
    constraint orders_shipping_address_not_blank check (length(btrim(shipping_address)) > 0),
    constraint orders_shipping_city_not_blank check (length(btrim(shipping_city)) > 0),
    constraint orders_shipping_state_not_blank check (length(btrim(shipping_state)) > 0),
    constraint orders_shipping_postal_code_not_blank check (length(btrim(shipping_postal_code)) > 0)
);

create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create table public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    product_id uuid references public.products (id) on delete set null,
    product_name text not null,
    product_sku text,
    unit_price numeric(12, 2) not null,
    quantity integer not null,
    line_total numeric(12, 2) not null,
    created_at timestamptz not null default now(),

    constraint order_items_product_name_not_blank check (length(btrim(product_name)) > 0),
    constraint order_items_unit_price_non_negative check (unit_price >= 0),
    constraint order_items_quantity_positive check (quantity > 0),
    constraint order_items_line_total_matches check (line_total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    status text not null,
    note text not null default '',
    created_at timestamptz not null default now(),
    constraint order_status_history_status_valid check (status in ('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'))
);

create index order_status_history_order_created_idx on public.order_status_history (order_id, created_at asc);

create trigger orders_set_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

revoke all on table public.orders, public.order_items, public.order_status_history from anon, authenticated;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
