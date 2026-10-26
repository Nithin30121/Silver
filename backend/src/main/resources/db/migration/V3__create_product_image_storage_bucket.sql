-- Product photography is publicly readable by the storefront but never writable
-- by browser roles. Spring uses a server-only Supabase secret key for writes.
-- This migration does not alter existing catalogue rows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;
