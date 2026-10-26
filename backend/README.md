# SILVESTO LUXE API

Java 21 / Spring Boot backend for the catalogue. It is separate from the Vite storefront and does not replace it.

## Authentication and authorization

Supabase Auth remains the sole identity provider. The frontend sends the signed-in user's access token as `Authorization: Bearer <token>` to this API. Spring Security validates it using the Supabase JWKS endpoint; no password, Supabase service-role key, or database credential is ever sent to the browser.

Every `/api/admin/**` request additionally checks `public.profiles.role = 'admin'` on the server. There is no public endpoint to set that role.

To appoint the first administrator, first sign up the owner's customer account, then set its email in the server-only `APP_INITIAL_ADMIN_EMAIL` variable and start the backend. The bootstrap only promotes that matching existing profile when **no administrator exists**. It uses a database lock so two simultaneous API starts cannot create two initial administrators. Clear the value after the promotion. Do not place this setting in Vite variables or send it from the browser.

Supabase Auth remains the single authentication system: it validates signup/login, password hashing, email confirmation, password reset and browser sessions. Spring only validates the Supabase access token and enforces the server-side role from `profiles`.

## Local setup

```bash
cp .env.example .env
# Fill in the server-only values in .env, then export them in your shell.
set -a && source .env && set +a
./mvnw spring-boot:run
```

The API starts at `http://localhost:8080`. Its health check is `GET /actuator/health`.

## Flyway and the existing Supabase schema

The Supabase CLI already applied the profiles/catalogue baseline. On its first connection to this non-empty database, Flyway records baseline version `1` and then runs later backend migrations. These migrations are additive: they do not recreate or delete current tables.

For an isolated database, first run the repository's Supabase migrations to establish the baseline, then start this API so Flyway applies the backend migrations. Do not manually run those files through the Supabase dashboard; let Flyway own post-backend migrations.

## Current endpoints

Public:

- `GET /api/categories`
- `GET /api/categories/{id}`
- `GET /api/products?categoryId=&query=&page=0&size=20&sort=name,asc`
- `GET /api/products/{id}`

Authenticated:

- `GET /api/me` — returns the profile for the bearer token's own Supabase account
- `POST /api/orders` — creates a pending-payment order from product IDs and quantities; the server locks stock, snapshots each name/SKU/price, and records the shipping destination
- `GET /api/orders` and `GET /api/orders/{id}` — private order history, always scoped to the token's own profile

Admin (valid Supabase user token + `profiles.role = 'admin'`):

- `POST`, `PUT`, `PATCH /api/admin/categories...`
- `GET /api/admin/categories` — full tree, including inactive categories
- `GET /api/admin/categories/{id}` — includes an inactive category when needed for editing
- `DELETE /api/admin/categories/{id}` when it has no children or product assignments
- `POST`, `PUT`, `PATCH /api/admin/products...`
- `POST` / `DELETE /api/admin/products/{id}/categories/{categoryId}`

Category management is dynamic: a category can be placed below any valid parent, ordered, published or unpublished, and products can be assigned through the administrator product endpoints. The database prevents self-references and longer parent-child cycles; it permits equal slugs only in different branches, such as `men/rings` and `women/rings`.

React API integration is intentionally a separate next step.

## Product images

Flyway migration V3 creates a public `product-images` Supabase Storage bucket. Public reads are intentional: product photography must be visible to the storefront and can be CDN cached. It does **not** grant browser upload, update, or delete access.

Set these server-only values in `backend/.env` before using image endpoints:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_STORAGE_SECRET_KEY=<Supabase secret key>
SUPABASE_PRODUCT_IMAGE_BUCKET=product-images
```

The secret key never belongs in `.env.local`, `VITE_` variables, commits, browser code, or an HTTP request from the storefront. The API accepts JPEG, PNG, and WebP files up to 5 MB; it checks their binary signature as well as Storage's bucket-level restriction.

Additional admin endpoints (valid Supabase user token + admin profile):

- `GET /api/admin/products` — includes inactive products and supports the same query/category/page filters
- `GET /api/admin/products/{id}/images`
- `POST /api/admin/products/{id}/images` — multipart fields: `file`, optional `altText`, optional `displayOrder`
- `DELETE /api/admin/products/{productId}/images/{imageId}`

## Orders and payment boundaries

Flyway V4 adds `orders`, `order_items`, and `order_status_history` without changing existing catalogue data. A checkout request never includes a price or any card data. The server recalculates totals from the locked product rows, atomically reserves stock, and writes immutable item snapshots. Cancelling an order through the admin status endpoint returns that reserved stock once.

The order tables have RLS enabled and no browser-role policies: all access goes through authenticated API endpoints. The customer sees only their own orders; an administrator may use `GET /api/admin/orders` and `PATCH /api/admin/orders/{id}/status`. There is deliberately no payment gateway integration in this phase, and raw card numbers/CVV must never be sent to this API or stored in the database.
