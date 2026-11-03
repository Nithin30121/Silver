-- The price a product sold for before a discount, shown crossed out above its price. Empty means no
-- discount. Checkout never reads it: customers always pay products.price.
alter table public.products
    add column if not exists original_price numeric(12, 2);

alter table public.products
    drop constraint if exists products_original_price_above_price;

alter table public.products
    add constraint products_original_price_above_price check (original_price is null or original_price > price);
