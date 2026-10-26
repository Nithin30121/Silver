-- Flyway records applied migrations in public.flyway_schema_history. On Supabase, tables in the
-- public schema are reachable through the Data API, and this one was created with Supabase's
-- default grants: anyone holding the publishable key could read, change, or delete migration
-- history (for example, to make a future migration look already applied).
--
-- The backend is unaffected: it owns the table, and table owners bypass row level security.
-- These statements are idempotent, so this is safe even if they were already run by hand.
alter table public.flyway_schema_history enable row level security;
revoke all on table public.flyway_schema_history from anon, authenticated;
