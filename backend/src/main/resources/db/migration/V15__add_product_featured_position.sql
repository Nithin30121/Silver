-- Where a picked piece sits in the home page's Considered Pieces: 1 shows first. New picks get the next number, so
-- they go to the end. Pieces already picked are numbered A to Z, the order they show in today.
alter table public.products
    add column if not exists featured_position integer;

alter table public.products
    drop constraint if exists products_featured_position_positive;

alter table public.products
    add constraint products_featured_position_positive check (featured_position is null or featured_position > 0);

update public.products as product
set featured_position = numbered.position
from (select id, row_number() over (order by name, id) as position
      from public.products
      where is_featured and featured_position is null) as numbered
where product.id = numbered.id;
