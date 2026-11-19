-- The pieces the owner picks for the home page's Considered Pieces section. Nothing is picked to begin with,
-- so the section keeps showing the first pieces from A to Z until the owner ticks some in the admin dashboard.
alter table public.products
    add column if not exists is_featured boolean not null default false;
