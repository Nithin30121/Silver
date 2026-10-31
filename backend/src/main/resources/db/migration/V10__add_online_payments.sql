-- Online payments through Razorpay. Razorpay gives every payment attempt its own order id, so one shop
-- order can have several rows in order_payments. Like orders, these tables are backend-only: no browser
-- role can read or write them.
--   orders.payment_method 'ONLINE'  the customer pays in Razorpay's window; it becomes UPI or CARD once paid
--   orders.payment_due_at           when an unpaid online order is cancelled and its pieces go back on sale
--   order_payments.status           NEEDS_REFUND is money that arrived for an order that could not take it
--   payment_webhook_events          Razorpay event ids already handled, because it may deliver one twice
alter table public.orders drop constraint orders_payment_method_valid;
alter table public.orders add constraint orders_payment_method_valid check (payment_method in ('UPI', 'CARD', 'COD', 'ONLINE'));
alter table public.orders add column payment_due_at timestamptz;

create index orders_payment_due_idx on public.orders (payment_due_at)
    where status = 'PENDING_PAYMENT' and payment_due_at is not null;

create table public.order_payments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    razorpay_order_id text not null unique,
    razorpay_payment_id text unique,
    amount numeric(12, 2) not null,
    status text not null default 'CREATED',
    method text,
    failure_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint order_payments_amount_valid check (amount > 0),
    constraint order_payments_status_valid check (status in ('CREATED', 'PAID', 'FAILED', 'NEEDS_REFUND', 'REFUNDED'))
);

create index order_payments_order_created_idx on public.order_payments (order_id, created_at desc);
create index order_payments_needs_refund_idx on public.order_payments (created_at desc) where status = 'NEEDS_REFUND';

create table public.payment_webhook_events (
    event_id text primary key,
    received_at timestamptz not null default now()
);

create trigger order_payments_set_updated_at
    before update on public.order_payments
    for each row execute function public.set_updated_at();

revoke all on table public.order_payments, public.payment_webhook_events from anon, authenticated;
alter table public.order_payments enable row level security;
alter table public.payment_webhook_events enable row level security;
