-- Customer reviews of products. A signed-in customer may write one review per product and edit it later; an
-- admin approves it before it shows on the product page. Only the backend reads or writes this table.

create table public.product_reviews (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products (id) on delete cascade,
    -- A customer's reviews are removed with their account.
    customer_id uuid not null references public.profiles (id) on delete cascade,
    rating integer not null,
    comment text not null,
    -- The name shown with the review (first name and last initial), taken from the profile when it is written.
    reviewer_name text not null,
    status text not null default 'PENDING',
    created_at timestamptz not null default now(),
    -- When the customer last changed it; an edited review waits for approval again.
    edited_at timestamptz,
    moderated_at timestamptz,

    constraint product_reviews_one_per_customer unique (product_id, customer_id),
    constraint product_reviews_rating_valid check (rating between 1 and 5),
    constraint product_reviews_comment_valid check (length(btrim(comment)) between 1 and 2000),
    constraint product_reviews_name_valid check (length(btrim(reviewer_name)) between 1 and 80),
    constraint product_reviews_status_valid check (status in ('PENDING', 'APPROVED', 'HIDDEN'))
);

comment on table public.product_reviews is 'Product reviews, written and read only by the backend. No browser access.';

create index product_reviews_product_status_idx on public.product_reviews (product_id, status, created_at desc);
create index product_reviews_status_created_idx on public.product_reviews (status, created_at desc);
create index product_reviews_customer_idx on public.product_reviews (customer_id);

revoke all on table public.product_reviews from anon, authenticated;
alter table public.product_reviews enable row level security;
