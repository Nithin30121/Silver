-- Shop-wide settings the owner changes in the admin dashboard, kept in a single row. The storefront
-- may read it, because the silver rate it holds is shown to every visitor; only the backend writes it.
--   silver_rate_per_gram  the silver rate the owner set, shown in the storefront's rate bar
--   silver_rate_set_at    when the owner last set it
create table public.shop_settings (
    id smallint primary key default 1,
    silver_rate_per_gram numeric(10, 2),
    silver_rate_set_at timestamptz,
    updated_at timestamptz not null default now(),
    constraint shop_settings_single_row check (id = 1),
    constraint shop_settings_silver_rate_valid check (silver_rate_per_gram is null or silver_rate_per_gram between 10 and 5000),
    constraint shop_settings_silver_rate_has_time check ((silver_rate_per_gram is null) = (silver_rate_set_at is null))
);

comment on table public.shop_settings is 'One row of owner settings. Readable by the storefront, written only by the backend.';

insert into public.shop_settings (id) values (1);

revoke all on table public.shop_settings from anon, authenticated;
grant select on table public.shop_settings to anon, authenticated;
alter table public.shop_settings enable row level security;
create policy shop_settings_public_read on public.shop_settings for select to anon, authenticated using (true);
