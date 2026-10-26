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

The Supabase CLI already applied the profiles/catalogue baseline. On its first connection to this non-empty database, Flyway records baseline version `1` and then runs `V2__evolve_catalogue_for_backend.sql`. It does not recreate or delete current tables.

For an isolated database, first run the repository's Supabase migrations to establish the baseline, then start this API so Flyway applies V2. Do not manually run the V2 file through the Supabase dashboard; let Flyway own post-backend migrations.

## Current endpoints

Public:

- `GET /api/categories`
- `GET /api/categories/{id}`
- `GET /api/products?categoryId=&query=&page=0&size=20&sort=name,asc`
- `GET /api/products/{id}`

Authenticated:

- `GET /api/me` — returns the profile for the bearer token's own Supabase account

Admin (valid Supabase user token + `profiles.role = 'admin'`):

- `POST`, `PUT`, `PATCH /api/admin/categories...`
- `DELETE /api/admin/categories/{id}` when it has no children or product assignments
- `POST`, `PUT`, `PATCH /api/admin/products...`
- `POST` / `DELETE /api/admin/products/{id}/categories/{categoryId}`

Product image upload and React API integration are intentionally separate next steps; the database support for `product_images` is included, but no service-role credential or storage upload endpoint has been added yet.
