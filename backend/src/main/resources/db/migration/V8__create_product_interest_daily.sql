-- How many times each piece was added to a wishlist, per day in the shop's time zone. Only counts
-- are kept: nothing about who added a piece is stored. Written and read only by the backend.
create table public.product_interest_daily (
    product_id uuid not null references public.products (id) on delete cascade,
    day date not null,
    wishlist_adds integer not null default 0,
    primary key (product_id, day),
    constraint product_interest_daily_wishlist_adds_valid check (wishlist_adds >= 0)
);

comment on table public.product_interest_daily is 'Daily wishlist-add counts per product, written and read only by the backend. No browser access.';

create index product_interest_daily_day_idx on public.product_interest_daily (day);

revoke all on table public.product_interest_daily from anon, authenticated;
alter table public.product_interest_daily enable row level security;
