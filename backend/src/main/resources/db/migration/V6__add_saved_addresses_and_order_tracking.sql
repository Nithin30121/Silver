-- Customer account features:
--   * an address book, so customers can pick a saved delivery address at checkout;
--   * courier tracking details on orders, shown to the customer once an order ships;
--   * customers can delete their account. Their saved addresses go with it, while their past
--     orders stay for the shop's records and simply stop pointing at the deleted profile.

create table public.customer_addresses (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.profiles (id) on delete cascade,
    full_name text not null,
    phone text not null,
    address_line text not null,
    city text not null,
    state text not null,
    postal_code text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint customer_addresses_full_name_valid check (length(btrim(full_name)) between 1 and 120),
    constraint customer_addresses_phone_valid check (length(btrim(phone)) between 7 and 20),
    constraint customer_addresses_address_line_valid check (length(btrim(address_line)) between 1 and 300),
    constraint customer_addresses_city_valid check (length(btrim(city)) between 1 and 120),
    constraint customer_addresses_state_valid check (length(btrim(state)) between 1 and 120),
    constraint customer_addresses_postal_code_valid check (postal_code ~ '^[1-9][0-9]{5}$')
);

comment on table public.customer_addresses is 'Saved delivery addresses, managed by the backend. No browser access.';

-- At most one default address per customer.
create unique index customer_addresses_one_default_idx on public.customer_addresses (customer_id) where is_default;
create index customer_addresses_customer_created_idx on public.customer_addresses (customer_id, created_at);

create trigger customer_addresses_set_updated_at
    before update on public.customer_addresses
    for each row execute function public.set_updated_at();

-- Like the order tables, the backend is the only access path.
revoke all on table public.customer_addresses from anon, authenticated;
alter table public.customer_addresses enable row level security;

alter table public.orders
    add column tracking_carrier text,
    add column tracking_number text,
    add column tracking_url text,
    add constraint orders_tracking_carrier_length check (tracking_carrier is null or length(tracking_carrier) <= 80),
    add constraint orders_tracking_number_length check (tracking_number is null or length(tracking_number) <= 80),
    -- Customers see this as a link, so only secure web addresses are stored.
    add constraint orders_tracking_url_https check (tracking_url is null or (tracking_url ~ '^https://' and length(tracking_url) <= 500));

-- An order outlives a deleted account: customer_id becomes null and the order keeps its own
-- snapshot of the delivery details. The old rule blocked deleting any customer who had ordered.
alter table public.orders alter column customer_id drop not null;

-- Look the old rule up by its column rather than assuming PostgreSQL's default name for it.
do $$
declare
    existing record;
begin
    for existing in
        select con.conname
        from pg_constraint con
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
        where con.conrelid = 'public.orders'::regclass
          and con.contype = 'f'
          and con.confrelid = 'public.profiles'::regclass
          and att.attname = 'customer_id'
    loop
        execute format('alter table public.orders drop constraint %I', existing.conname);
    end loop;
end
$$;

alter table public.orders
    add constraint orders_customer_id_fkey foreign key (customer_id) references public.profiles (id) on delete set null;

comment on column public.orders.customer_id is 'The customer who placed the order, or null once they have deleted their account.';
