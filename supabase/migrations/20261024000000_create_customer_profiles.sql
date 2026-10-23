-- =============================================================================
-- SILVESTO LUXE: customer profiles
--
-- Supabase Auth (the auth.users table) owns each customer's identity: email,
-- password hash and email-verification status. This table only adds the
-- profile details the shop needs, keyed by the same user id.
--
-- Security model:
--   * Row Level Security: a signed-in customer can see and change only their own row.
--   * Column privileges: customers may update full_name and nothing else, so they
--     can never promote themselves by changing "role".
--   * No INSERT or DELETE access for customers: rows are created by a trigger when
--     Supabase Auth creates the user, and removed automatically when the user is deleted.
--   * Logged-out visitors (the "anon" role) have no access at all.
-- =============================================================================

create table public.profiles (
    id         uuid        primary key references auth.users (id) on delete cascade,
    full_name  text        not null default '',
    -- Convenience copy kept in sync by a trigger. Supabase Auth remains the
    -- authority for the customer's email and whether it is verified.
    email      text,
    role       text        not null default 'customer',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_full_name_length check (char_length(full_name) <= 100),
    constraint profiles_full_name_trimmed check (full_name = btrim(full_name)),
    constraint profiles_role_valid check (role in ('customer', 'admin'))
);

comment on table public.profiles is 'One row per Supabase Auth user. Customers can read and edit only their own row (RLS).';
comment on column public.profiles.email is 'Copy of auth.users.email for convenience; not authoritative.';
comment on column public.profiles.role is 'Not writable by customers (column privileges). Change only with an administrative role.';


-- -----------------------------------------------------------------------------
-- Privileges. Supabase grants new public tables to anon and authenticated by
-- default, so start from nothing and grant only what the website needs.
-- -----------------------------------------------------------------------------
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- "(select auth.uid())" rather than "auth.uid()" lets Postgres evaluate it once
-- per query instead of once per row (Supabase's performance recommendation).
create policy "Customers can view their own profile"
    on public.profiles
    for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Customers can update their own profile"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);


-- -----------------------------------------------------------------------------
-- Keep updated_at current on every change.
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Create a profile automatically when Supabase Auth creates a user.
--
-- SECURITY DEFINER is required because the Auth service inserts users as its own
-- database role, which has no access to public.profiles. To keep that safe:
--   * search_path is empty and every name is schema-qualified, so the function
--     cannot be tricked into using objects from another schema;
--   * it only ever inserts the new user's own row;
--   * the name comes from user-supplied signup metadata, so it is trimmed and
--     truncated here, ensuring an odd value can never make signup fail;
--   * ON CONFLICT DO NOTHING means a profile can never be duplicated;
--   * nobody can call it directly (EXECUTE revoked below).
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        btrim(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100)),
        new.email
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();


-- Keep the convenience email copy in sync when a customer changes their email.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.profiles
    set email = new.email
    where id = new.id;
    return new;
end;
$$;

create trigger on_auth_user_email_changed
    after update of email on auth.users
    for each row
    when (old.email is distinct from new.email)
    execute function public.handle_user_email_change();


-- Trigger functions are never meant to be called directly by API users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- Backfill: give any users who signed up before this migration a profile too.
-- -----------------------------------------------------------------------------
insert into public.profiles (id, full_name, email)
select
    u.id,
    btrim(left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 100)),
    u.email
from auth.users as u
on conflict (id) do nothing;
