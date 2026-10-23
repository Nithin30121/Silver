-- Security tests for public.profiles (pgTAP).
--
-- Run locally:          npx supabase test db
-- Run on your project:  npx supabase test db --linked
--
-- Everything happens inside a transaction that is rolled back at the end,
-- so the test users below never persist.

begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- -----------------------------------------------------------------------------
-- Structure
-- -----------------------------------------------------------------------------
select ok(
    (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
    'Row Level Security is enabled on profiles'
);

select policies_are(
    'public', 'profiles',
    array['Customers can view their own profile', 'Customers can update their own profile'],
    'profiles has exactly the expected policies (no insert/delete/public policies)'
);

-- -----------------------------------------------------------------------------
-- Profile creation (as Supabase Auth would create users)
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
    ('11111111-1111-1111-1111-111111111111', 'asha@example.test', '{"full_name": "  Asha Rao  "}'),
    ('22222222-2222-2222-2222-222222222222', 'ravi@example.test', '{"full_name": "Ravi Kumar"}'),
    ('33333333-3333-3333-3333-333333333333', 'long@example.test', jsonb_build_object('full_name', repeat('x', 300))),
    ('44444444-4444-4444-4444-444444444444', 'noname@example.test', '{}');

select is(
    (select count(*)::int from public.profiles where id in (
        '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444')),
    4,
    'A profile is created automatically for every new user'
);

select is(
    (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    'Asha Rao',
    'The signup name is trimmed'
);

select is(
    (select email from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    'asha@example.test',
    'The email is copied to the profile'
);

select is(
    (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    'customer',
    'New users are customers'
);

select is(
    (select char_length(full_name) from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
    100,
    'An oversized signup name is truncated instead of breaking signup'
);

select is(
    (select full_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
    '',
    'Signup without a name still creates a profile'
);

select lives_ok(
    $$ insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111') on conflict (id) do nothing $$,
    'Profile creation is idempotent'
);

select is(
    (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    1,
    'No duplicate profile exists'
);

-- -----------------------------------------------------------------------------
-- Signed in as Asha
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
    $$ select id from public.profiles $$,
    $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
    'A customer can see only their own profile'
);

select lives_ok(
    $$ update public.profiles set full_name = 'Asha R' where id = '11111111-1111-1111-1111-111111111111' $$,
    'A customer can update their own name'
);

select is(
    (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    'Asha R',
    'The name change was saved'
);

select is_empty(
    $$ update public.profiles set full_name = 'Changed by Asha' where id = '22222222-2222-2222-2222-222222222222' returning id $$,
    'A customer cannot update another customer''s profile'
);

select throws_ok(
    $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
    '42501', null,
    'A customer cannot make themselves an administrator'
);

select throws_ok(
    $$ update public.profiles set email = 'other@example.test' where id = '11111111-1111-1111-1111-111111111111' $$,
    '42501', null,
    'A customer cannot change the profile email copy'
);

select throws_ok(
    $$ update public.profiles set full_name = repeat('x', 101) where id = '11111111-1111-1111-1111-111111111111' $$,
    '23514', null,
    'Names longer than 100 characters are rejected'
);

select throws_ok(
    $$ insert into public.profiles (id, full_name) values ('55555555-5555-5555-5555-555555555555', 'Fake') $$,
    '42501', null,
    'A customer cannot create profiles'
);

select throws_ok(
    $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
    '42501', null,
    'A customer cannot delete profiles'
);

select throws_ok(
    $$ select public.handle_new_user() $$,
    '42501', null,
    'A customer cannot call the privileged trigger function'
);

-- -----------------------------------------------------------------------------
-- Logged-out visitor
-- -----------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
    $$ select * from public.profiles $$,
    '42501', null,
    'Logged-out visitors cannot read profiles'
);

select throws_ok(
    $$ update public.profiles set full_name = 'Anonymous' $$,
    '42501', null,
    'Logged-out visitors cannot update profiles'
);

-- -----------------------------------------------------------------------------
-- Changes made by Supabase Auth
-- -----------------------------------------------------------------------------
reset role;

update auth.users set email = 'asha.new@example.test' where id = '11111111-1111-1111-1111-111111111111';
select is(
    (select email from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
    'asha.new@example.test',
    'The profile email follows an email change in Supabase Auth'
);

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is_empty(
    $$ select id from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
    'Deleting a user deletes their profile'
);

select * from finish();
rollback;
