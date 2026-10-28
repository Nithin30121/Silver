-- Messages sent through the shop's contact form, read and answered from the admin dashboard.
-- Anyone may send one through the backend; nobody can read them except an admin, through the backend.

create table public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    phone text,
    subject text not null default '',
    order_number text,
    message text not null,
    -- The sender's account when they were signed in; kept as null if they later delete it.
    customer_id uuid references public.profiles (id) on delete set null,
    status text not null default 'NEW',
    created_at timestamptz not null default now(),
    handled_at timestamptz,

    constraint contact_messages_name_valid check (length(btrim(name)) between 1 and 120),
    constraint contact_messages_email_valid check (length(btrim(email)) between 3 and 254),
    constraint contact_messages_phone_length check (phone is null or length(phone) <= 30),
    constraint contact_messages_subject_length check (length(subject) <= 150),
    constraint contact_messages_order_number_length check (order_number is null or length(order_number) <= 40),
    constraint contact_messages_message_valid check (length(btrim(message)) between 1 and 5000),
    constraint contact_messages_status_valid check (status in ('NEW', 'DONE'))
);

comment on table public.contact_messages is 'Contact form messages, written and read only by the backend. No browser access.';

create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);
create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index contact_messages_customer_idx on public.contact_messages (customer_id);

revoke all on table public.contact_messages from anon, authenticated;
alter table public.contact_messages enable row level security;
