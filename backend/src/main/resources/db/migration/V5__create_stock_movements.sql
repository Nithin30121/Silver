-- Stock history: one row for every change to a product's stock count, so admins can see why it moved.
-- History starts when this migration runs; earlier stock counts have no recorded movements.

create table public.stock_movements (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products (id) on delete cascade,
    quantity_change integer not null,
    quantity_after integer not null,
    reason text not null,
    order_id uuid references public.orders (id) on delete set null,
    actor_id uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint stock_movements_change_not_zero check (quantity_change <> 0),
    constraint stock_movements_quantity_after_non_negative check (quantity_after >= 0),
    constraint stock_movements_reason_valid check (reason in ('INITIAL', 'MANUAL', 'SALE', 'CANCELLATION'))
);

comment on table public.stock_movements is 'Append-only stock history written by the backend. No browser access.';
comment on column public.stock_movements.actor_id is 'The admin who changed stock, or the customer whose checkout reserved it.';

create index stock_movements_product_created_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements (created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id);

-- Like the order tables, the backend is the only access path.
revoke all on table public.stock_movements from anon, authenticated;
alter table public.stock_movements enable row level security;
