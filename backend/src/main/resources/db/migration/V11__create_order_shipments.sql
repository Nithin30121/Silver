-- Parcels booked with Delhivery. One order can have several rows when a booking is cancelled and the parcel
-- is booked again, but at most one booking that isn't cancelled. Like orders, this table is backend-only:
-- no browser role can read or write it.
--   waybill           Delhivery's tracking number (AWB) for the parcel
--   reference         the order reference Delhivery was given; a rebooking gets a suffix, as references must be unique
--   state             BOOKED (waiting for pickup), IN_TRANSIT, DELIVERED, RETURNING, RETURNED, LOST or CANCELLED
--   courier_status_*  Delhivery's own latest scan, shown to the owner as it is
create table public.order_shipments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    waybill text not null unique,
    reference text not null,
    payment_mode text not null,
    cod_amount numeric(12, 2) not null default 0,
    weight_grams integer not null,
    state text not null default 'BOOKED',
    courier_status text,
    courier_status_type text,
    courier_location text,
    courier_status_at timestamptz,
    checked_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint order_shipments_payment_mode_valid check (payment_mode in ('PREPAID', 'COD')),
    constraint order_shipments_cod_amount_valid check (cod_amount >= 0),
    constraint order_shipments_weight_valid check (weight_grams between 1 and 50000),
    constraint order_shipments_state_valid check (state in ('BOOKED', 'IN_TRANSIT', 'DELIVERED', 'RETURNING', 'RETURNED', 'LOST', 'CANCELLED'))
);

create unique index order_shipments_one_live_per_order_idx on public.order_shipments (order_id) where state <> 'CANCELLED';
create index order_shipments_order_created_idx on public.order_shipments (order_id, created_at desc);
create index order_shipments_moving_idx on public.order_shipments (checked_at nulls first)
    where state in ('BOOKED', 'IN_TRANSIT', 'RETURNING');

create trigger order_shipments_set_updated_at
    before update on public.order_shipments
    for each row execute function public.set_updated_at();

revoke all on table public.order_shipments from anon, authenticated;
alter table public.order_shipments enable row level security;
