# SILVESTO LUXE API

Java 21 / Spring Boot backend for the catalogue. It is separate from the Vite storefront and does not replace it.

## Authentication and authorization

Supabase Auth remains the sole identity provider. The frontend sends the signed-in user's access token as `Authorization: Bearer <token>` to this API. Spring Security validates it using the Supabase JWKS endpoint; no password, Supabase service-role key, or database credential is ever sent to the browser.

Every `/api/admin/**` request additionally checks `public.profiles.role = 'admin'` on the server. There is no public endpoint to set that role. To appoint the first administrator, use the Supabase SQL Editor as the project owner:

```sql
update public.profiles
set role = 'admin'
where email = 'administrator@example.com';
```

Use an existing, verified account and replace the example email. Do not run this from the browser.

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

Admin (valid Supabase user token + `profiles.role = 'admin'`):

- `POST`, `PUT`, `PATCH /api/admin/categories...`
- `DELETE /api/admin/categories/{id}` when it has no children or product assignments
- `POST`, `PUT`, `PATCH /api/admin/products...`
- `POST` / `DELETE /api/admin/products/{id}/categories/{categoryId}`

Product image upload and React API integration are intentionally separate next steps; the database support for `product_images` is included, but no service-role credential or storage upload endpoint has been added yet.
