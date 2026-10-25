-- Catalogue schema and RLS checks.
-- Run locally: npx supabase test db

begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
    'RLS is enabled on categories'
);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
    'RLS is enabled on products'
);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.category_products'::regclass),
    'RLS is enabled on category_products'
);

select is(
    (select count(*)::integer from public.categories),
    12,
    'The requested category hierarchy is seeded exactly once'
);

select is(
    (select count(*)::integer from public.categories where parent_id = '10000000-0000-0000-0000-000000000001'),
    2,
    'Landing Page has Men and Women children'
);

insert into public.categories (name, slug, category_type, is_active)
values ('Hidden Category', 'hidden-category', 'collection', false);

insert into public.products (name, slug, price, is_active)
values ('Hidden Product', 'hidden-product', 10, false);

-- Public visitors see only active rows and cannot write.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(
    (select count(*)::integer from public.categories),
    12,
    'Anonymous visitors see only active categories'
);

select is_empty(
    $$ select id from public.products where slug = 'hidden-product' $$,
    'Anonymous visitors cannot see inactive products'
);

select throws_ok(
    $$ insert into public.products (name, slug, price) values ('Blocked', 'blocked', 10) $$,
    '42501', null,
    'Anonymous visitors cannot create products'
);

-- A normal signed-in customer has no catalogue write capability.
set local role postgres;
insert into auth.users (id, email)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'catalog-customer@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

select throws_ok(
    $$ insert into public.categories (name, slug, category_type) values ('Blocked', 'blocked', 'collection') $$,
    '42501', null,
    'Customers cannot create categories'
);

-- An administrator can manage catalogue rows.
set local role postgres;
insert into auth.users (id, email)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'catalog-admin@example.test');
update public.profiles set role = 'admin' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}', true);

select lives_ok(
    $$ insert into public.products (name, slug, price) values ('Admin Product', 'admin-product', 10) $$,
    'Administrators can create products'
);

select lives_ok(
    $$ insert into public.category_products (category_id, product_id)
       select '10000000-0000-0000-0000-000000000012', id
       from public.products where slug = 'admin-product' $$,
    'Administrators can assign products to categories'
);

select throws_ok(
    $$ insert into public.category_products (category_id, product_id)
       select '10000000-0000-0000-0000-000000000012', id
       from public.products where slug = 'admin-product' $$,
    '23505', null,
    'Duplicate category-product assignments are rejected'
);

select * from finish();
rollback;
