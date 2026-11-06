# SILVORA / SILVESTO LUXE — Engineering Handoff

This document is the source-of-truth handoff for an engineer or coding agent taking over this repository. Read it before changing the application.

> **Naming note:** the repository, Java package, and earlier requirements use *Silver* / *Silvesto Luxe*. The current customer-facing visual identity renders **SILVORA**. Treat this as a branding decision to clarify with the owner; do not rename either system-wide as an incidental refactor.

## 1. What this repository is

This is a jewelry storefront with three cooperating parts:

```text
React + Vite browser app
  ├─ Supabase Auth and the browser's public Supabase key
  └─ Spring Boot API (catalogue, admin, stock, orders, Storage uploads)
          └─ Supabase PostgreSQL + Supabase Storage
```

The browser is deliberately **not** allowed to write catalogue, inventory, orders, or Storage images directly. It authenticates through Supabase, then sends its short-lived access token to the Spring API. The API validates the JWT and applies business/role checks on the server.

### Security invariants — do not weaken these

1. Never put a Supabase secret/service-role key, database password, or JDBC URL in `VITE_*`, browser code, committed files, screenshots, or issue text.
2. Browser code may use only the Supabase project URL plus its publishable/anon key.
3. All `/api/admin/**` endpoints require both a valid Supabase JWT and a `profiles.role = 'admin'` record checked by the backend.
4. Prices, totals, stock reservations, and product image writes are server-calculated/server-performed. Never trust values from checkout forms for these.
5. Do not grant public Supabase Storage write policies just to make uploads easier.

## 2. Repository map

```text
.
├── src/                         React/TypeScript storefront and dashboard
├── public/                      static visual assets and Netlify headers
├── backend/                     independent Java 21 / Spring Boot API
├── supabase/                    Supabase CLI baseline schema and database tests
├── docs/                        setup documentation
├── .env.example                 safe browser environment-variable template
├── netlify.toml                 static frontend build and SPA redirect configuration
├── package.json                 frontend scripts/dependencies
└── CLAUDE.md                    this handoff
```

Ignored local credential files are intentionally absent from Git:

- `.env.local` — frontend project URL, publishable key, and API URL only.
- `backend/.env` — database/JWKS/Storage secret and backend configuration only.

Create them from their respective `.env.example` files. Do **not** commit them.

## 3. Frontend: files and responsibilities

### App shell and configuration

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | Browser entry point. Loads global CSS and mounts React in `React.StrictMode`. Code must be safe when effects mount more than once in development. |
| `src/App.tsx` | Provider composition and page switch. `ShopProvider` and `AuthProvider` wrap the app. A direct browser path of `/admin` renders `AdminDashboard`; all other paths render the public storefront. This is a small pathname switch, not React Router. |
| `src/index.css` | Public-site global design system, responsive layout, page/component styles, and account styles. |
| `src/styles/admin.css` | Isolated visual system for the protected admin dashboard. |
| `src/App.css` | Legacy Vite styling file; it is not the main source of the current public design. Avoid assuming it controls a page before checking imports. |
| `src/vite-env.d.ts` | Vite TypeScript environment declarations. |
| `vite.config.ts` | Vite build/dev-server configuration. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript project settings. |
| `index.html` | Vite HTML entry document. |

### Context, session, and client libraries

| File | Responsibility |
| --- | --- |
| `src/context/ShopContext.tsx` | The public app's in-memory navigation state, catalogue loading, modals/toasts, cart, wishlist, filters, and product mapping. Cart and wishlist are persisted in browser `localStorage` as `silvesto_cart` and `silvesto_wishlist`. It is intentionally not an SSR-oriented module. |
| `src/context/AuthContext.tsx` | Supabase session lifecycle, profile loading/editing, auth status, and password/email-link state. It manages an auth-state subscription defensively so React Strict Mode does not create duplicate behavior. |
| `src/lib/supabaseClient.ts` | Builds the browser Supabase client from public environment variables. It rejects inappropriate secret/service keys in browser configuration. |
| `src/lib/authValidation.ts` | Shared validation rules/helpers for auth form inputs. |
| `src/types/index.ts` | Frontend domain types: products, categories, cart records, view/page state, and related UI contracts. |
| `src/types/database.ts` | Generated Supabase TypeScript database types used by the profile layer. It may lag after schema changes; regenerate deliberately after validating the generation command against the intended Supabase environment. |

### Frontend services

| File | Responsibility |
| --- | --- |
| `src/services/authService.ts` | Supabase signup/signin/signout, password reset/update, and session-facing auth operations. |
| `src/services/profileService.ts` | Direct browser access permitted by RLS for a signed-in user's own `profiles` row and editable full name. It must never alter roles. |
| `src/services/catalogService.ts` | Public catalogue calls to the Spring API: active category tree and active product search/listing. Uses `VITE_CATALOG_API_URL`, defaulting locally to `http://localhost:8080/api`. |
| `src/services/orderService.ts` | Authenticated customer order creation and order-history reads through the Spring API. The checkout payload contains product IDs, quantities, and shipping information—not prices or card data. |
| `src/services/adminService.ts` | Authenticated admin calls to the Spring API for overview data, catalogue, category/product writes, image uploads, inventory/product updates, and order status updates. It obtains the current Supabase access token for every protected request. |
| `src/services/silverRateService.ts` | Fetches/formats the live silver-rate display data used by the public header/banner experience. |

### Public components

| File | Responsibility |
| --- | --- |
| `src/components/BrandIntro.tsx` | The first-visit branded intro. It uses the persistent `silvesto_intro_seen` `localStorage` flag: first visit shows it; Skip, Enter, or animation completion stores the flag before dismissing. It checks the saved value before rendering to prevent an intro flash on reload. Clear that key manually only when testing the intro again. |
| `src/components/Header.tsx` | Desktop/mobile public navigation, search, account, cart, wishlist, and category navigation triggers. It intentionally does not expose a public admin link. |
| `src/components/Footer.tsx` | Public footer/navigation and brand information. |
| `src/components/Hero.tsx` | Landing-page hero content and the supplied hero visual asset placement. |
| `src/components/LiveSilverRate.tsx` | Reusable live-rate header display. |
| `src/components/GenderCategories.tsx` | Men's/Women's discovery section. |
| `src/components/CollectionGrid.tsx` | Category collection tiles. |
| `src/components/FeaturedProducts.tsx` | Homepage product selection rendered from the loaded catalogue, with an empty state if no active product exists. |
| `src/components/CatalogPage.tsx` | Searchable/filterable catalogue listing, using category/product records supplied by `ShopContext`. |
| `src/components/ProductDetailPage.tsx` | Product gallery/details, quantity/add-to-bag flow, material/care content, and related public product UI. |
| `src/components/QuickViewModal.tsx` | Product quick-look modal. |
| `src/components/SearchModal.tsx` | Public product search modal. |
| `src/components/CartDrawer.tsx` | Local cart UI and checkout form. For a signed-in customer it submits an order to the backend; it does not process cards or manufacture an order total itself. |
| `src/components/WishlistDrawer.tsx` | Local wishlist management and move-to-bag behavior. |
| `src/components/StoryPage.tsx` | Brand story page. |
| `src/components/CarePage.tsx` | Jewelry-care page. |
| `src/components/SupportingPages.tsx` | Supporting public informational/contact/FAQ-like screens. |

### Auth components

| File | Responsibility |
| --- | --- |
| `src/components/auth/AuthFlowCoordinator.tsx` | Chooses which auth/account screen should be visible from app/auth state. |
| `src/components/auth/AuthUI.tsx` | Shared presentational auth UI primitives. |
| `src/components/auth/LoginPage.tsx` | Sign-in screen. |
| `src/components/auth/SignupPage.tsx` | Registration screen. |
| `src/components/auth/ForgotPasswordPage.tsx` | Password-reset request screen. |
| `src/components/auth/ResetPasswordPage.tsx` | New-password completion screen. |
| `src/components/auth/AccountPage.tsx` | Signed-in customer profile and customer order history. |
| `src/components/auth/authHelpers.ts` | Shared auth-component utility functions. |

### Admin component

| File | Responsibility |
| --- | --- |
| `src/components/admin/AdminDashboard.tsx` | The dedicated `/admin` application. It checks the authenticated profile via `GET /api/me`, requires role `admin`, then renders real backend-driven overview, product, category, inventory, and order sections. It shows an honest empty/unavailable state where an API does not exist. It does not use fabricated KPI values or product records. |

### Static assets

| Location | Responsibility |
| --- | --- |
| `public/images/*` | Current storefront imagery: intro, hero/logo, campaign, category, and product-style photos. Referenced by public UI using root-relative URLs. |
| `public/favicon.svg`, `public/icons.svg` | Static icon assets. |
| `public/_headers` | Static-host response headers. |
| `src/assets/*` | Vite/template-era assets. Confirm an asset is imported before editing or removing it; `public/images` is the principal public image directory. |

## 4. Backend: files and responsibilities

The backend is a separate Maven project. It needs Java 21 and runs on port `8080` unless configured otherwise.

### Configuration and application entry

| File | Responsibility |
| --- | --- |
| `backend/pom.xml` | Spring Boot, JPA, Security, PostgreSQL, Flyway, validation, test, and related Java dependencies. |
| `backend/mvnw`, `backend/mvnw.cmd` | Maven Wrapper for macOS/Linux and Windows. Prefer this over assuming a globally installed Maven. |
| `backend/src/main/java/com/silvestoluxe/api/SilvestoApiApplication.java` | Spring Boot entry point. |
| `backend/src/main/resources/application.yml` | Environment-variable driven datasource, JPA, Flyway, JWT/JWKS, CORS, Storage, and server configuration. It defaults CORS to both local Vite hostnames: `localhost:5173` and `127.0.0.1:5173`. |

### Security and account files

| File | Responsibility |
| --- | --- |
| `config/SecurityConfig.java` | Stateless Spring Security configuration. Public read access is restricted to active catalogue endpoints; `/api/me`, orders, and admin endpoints require bearer auth; admin endpoints add role verification. Configures CORS and JWKS JWT validation. |
| `security/CatalogAuthorization.java` | Server-side `profiles.role` lookup for the current JWT subject. This is the real admin authorization gate, independent from UI checks. |
| `security/InitialAdministratorBootstrap.java` | Optional one-time, database-locked first-admin promotion using `APP_INITIAL_ADMIN_EMAIL`, only when no admin exists. Remove/clear the environment variable after bootstrap. |
| `account/AccountController.java` | `GET /api/me` profile endpoint for the current bearer token. |
| `account/AccountProfileService.java` | Loads the current profile based on authenticated token subject. |

### Categories

| File | Responsibility |
| --- | --- |
| `category/Category.java` | JPA mapping for the self-referencing category table. |
| `category/CategoryRepository.java` | Category persistence/query operations. |
| `category/CategoryDtos.java` | API request/response DTOs for public and admin category shapes. |
| `category/CategoryService.java` | Tree construction and category business rules. Validates parent assignments, blocks self/descendant cycles, and handles active/order state. |
| `category/CategoryController.java` | Public active-category endpoints plus protected admin CRUD endpoints. |

### Products and images

| File | Responsibility |
| --- | --- |
| `product/Product.java` | JPA entity for catalogue products, categories, product attributes, active state, and image relations. |
| `product/ProductImage.java` | Product-image entity/mapping. |
| `product/ProductRepository.java` | Product queries, including a locking query used during checkout to make stock updates safe. |
| `product/ProductImageRepository.java` | Product-image persistence/query operations. |
| `product/ProductDtos.java` | Public/admin product, search, category assignment, and image DTOs. |
| `product/ProductService.java` | Public active-product reads and protected admin product/category/status updates. |
| `product/ProductImageService.java` | Admin image upload/delete orchestration and product image metadata. |
| `product/ProductController.java` | Public product read endpoints and protected product/image/category management endpoints. |

### Orders

| File | Responsibility |
| --- | --- |
| `order/CustomerOrder.java` | JPA mapping for an order header, customer/shipping snapshot, totals, payment/order state, items, and history. |
| `order/OrderItem.java` | Immutable purchased-item snapshot entity; product names/SKUs/prices are captured at checkout. |
| `order/OrderStatusHistory.java` | Audit record for order state changes. |
| `order/OrderStatus.java`, `PaymentStatus.java`, `PaymentMethod.java` | Enumerated state/value definitions used by validation and persistence. |
| `order/CustomerOrderRepository.java` | Customer-scoped, admin, and persistence order queries. |
| `order/OrderDtos.java` | Checkout/admin/customer API DTOs. |
| `order/OrderService.java` | Transactional checkout. It combines duplicate lines, locks product rows in deterministic order, verifies active stock, recalculates totals, decreases stock, writes snapshots/history, and restores stock once when an admin cancels an order. |
| `order/OrderController.java` | Customer create/list/detail endpoints and admin order/status endpoints. |

### Storage and error handling

| File | Responsibility |
| --- | --- |
| `storage/SupabaseStorageClient.java` | Server-only Supabase Storage client. Handles image object operations using the backend secret. |
| `storage/SupabaseStorageException.java` | Domain exception for Storage failures. |
| `common/ApiExceptionHandler.java` | Maps validation, conflict, and relevant API exceptions into useful HTTP responses. |

### Backend migrations and tests

| File | Responsibility |
| --- | --- |
| `db/migration/V2__evolve_catalogue_for_backend.sql` | Additive catalogue evolution: product details/SKU/weight/image support and category adjustments. It preserves baseline data. |
| `db/migration/V3__create_product_image_storage_bucket.sql` | Creates/configures the `product-images` Storage bucket. Reads are public; browser writes are not granted. |
| `db/migration/V4__create_orders_and_order_items.sql` | Adds orders, immutable order-item snapshots, status-history, constraints, indexes, RLS, and sequence support without removing prior catalogue data. |
| `src/test/...` | Unit tests for account profile access, category rules, image validation, admin authorization, initial-admin bootstrap, and Storage behavior. See test-gap section for what is not covered. |

## 5. Supabase schema, migrations, and RLS

### Baseline migrations owned by Supabase CLI

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20261024000000_create_customer_profiles.sql` | `profiles` table, Auth-user synchronization trigger, roles, timestamps, and RLS allowing a person to read/update their own limited profile data without escalating role. |
| `supabase/migrations/20261026000000_create_catalog_categories.sql` | Baseline `categories`, `products`, `category_products`, indexes/constraints/RLS, role helper, and idempotent category hierarchy seed. The baseline supports parent/child categories and unique product-category assignment. |
| `supabase/tests/database/profiles_security.test.sql` | Database-level profile/RLS security assertions. |
| `supabase/tests/database/catalog_security.test.sql` | Database-level active-catalogue/admin-write security assertions. |
| `supabase/config.toml` | Local Supabase CLI configuration, not a location for production secrets. |

### Data model (current)

```text
auth.users (Supabase-managed)
  └── public.profiles (id = auth user id, role = customer/admin)

categories
  └── categories.parent_id      self-referencing navigation tree
  └── category_products         many-to-many product placement/order
products
  └── product_images            ordered image metadata

profiles
  └── orders
        ├── order_items         immutable product/price snapshots
        └── order_status_history
```

The initial navigation hierarchy has Landing Page, Men, and Women branches. The current backend migration makes the Landing Page category inactive and supports Men/Women roots with child slugs that can repeat under a different parent (for example `men/rings` and `women/rings`). This is intentional; do not add a global unique-slug constraint.

### Migration ownership rule

The Supabase CLI baseline is considered schema version `1`. The Spring backend uses Flyway with `baseline-on-migrate` and owns later versions V2 onward. On a non-empty existing Supabase database:

1. Apply the `supabase/migrations` baseline with the Supabase CLI.
2. Start the backend. Flyway records baseline V1 and applies V2, V3, and V4.
3. Do **not** paste the Flyway files into the Supabase dashboard manually; that can desynchronize Flyway history.

### RLS model

- Visitors can read active categories and active products.
- A signed-in person can read/update only their own permitted profile fields.
- Role changes have no public/browser mutation path.
- Catalogue writes are restricted to administrators.
- Orders tables have RLS enabled with no browser-role policies: the backend is the only access path.
- Storage image reads are public by design; uploads/deletions happen only via the backend.

## 6. HTTP API contract

All Spring routes are beneath the frontend API base URL. Locally, the base is normally `http://localhost:8080/api`.

| Access | Main endpoints |
| --- | --- |
| Public | `GET /categories`, `GET /categories/{id}`, `GET /products`, `GET /products/{id}` |
| Signed-in customer | `GET /me`, `POST /orders`, `GET /orders`, `GET /orders/{id}` |
| Administrator | `GET/POST/PUT/PATCH/DELETE /admin/categories...`; `GET/POST/PUT/PATCH /admin/products...`; product-category and product-image endpoints; `GET /admin/orders`; `PATCH /admin/orders/{id}/status` |

### Important API semantics

- Product browsing returns active products only; admin listing can include inactive products.
- Admin deactivation is preferred over destructive product deletion.
- Category deletion is blocked while it has children or product assignments.
- Image upload is multipart and accepts JPEG/PNG/WebP, up to 5 MB, after binary-signature validation.
- Checkout never accepts a frontend price, total, or card number.
- Checkout currently creates a pending-payment order. There is **no payment gateway** in this repository.

## 7. Local development

### Prerequisites

- Node version compatible with the lockfile/Vite (Node 20.19+ or 22.12+ is documented).
- Java 21.
- A configured Supabase project containing the baseline schema and a backend credential file that is never committed.

### Frontend

```bash
npm install
cp .env.example .env.local
# Set only VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_CATALOG_API_URL
npm run dev
```

The browser app is typically available at `http://localhost:5173`. Do not use a secret key in `.env.local`.

### Backend

```bash
cd backend
cp .env.example .env
# Fill server-only values. Do not print or commit this file.
set -a && source .env && set +a
./mvnw spring-boot:run
```

The API health endpoint is `GET http://localhost:8080/actuator/health`.

For IPv4-only networks, use Supabase's **Session pooler** connection information, appropriate pooler username, and SSL-required JDBC settings in the private backend environment. Keep that connection string private. The direct Supabase connection can be IPv6-only.

### Tests and builds

```bash
# Frontend compile/build
npm run build

# Frontend lint
npm run lint

# Supabase database tests (requires a correctly configured local Supabase CLI environment)
npm run test:db

# Backend tests
cd backend
./mvnw test
```

In the Codex sandbox, backend tests initially failed because Mockito/Byte Buddy was not allowed to self-attach its test agent. When run with the necessary local permission, the 11 current backend tests passed. That was an execution-environment restriction, not a known application test failure.

## 8. Admin dashboard: expected access path

1. Start the Spring backend and Vite frontend.
2. Sign in with an account whose `public.profiles.role` is exactly `admin`.
3. Use the **same origin** for sign-in and admin access: `localhost:5173` and `127.0.0.1:5173` hold separate browser storage/session state.
4. Open `/admin` directly, for example `http://localhost:5173/admin`.

There is intentionally no public header link to `/admin`; the address is protected rather than advertised.

The frontend is only a convenience guard. The backend remains authoritative: an account without the database admin role receives a forbidden response from protected API calls.

## 9. Known current errors, gaps, and limitations

This list is intentional and should guide the next implementation phase. Do not mask any item with mock data.

### Active local dashboard issue observed

The last observed `/admin` browser state showed **“Please sign in again”** after the CORS issue was corrected. This corresponds to the backend returning `401` for `GET /api/me`, most likely a stale/missing browser access token on that origin.

Resolution sequence:

1. Sign out from the exact local host where the app is open.
2. Sign in again on that same host.
3. Reload `/admin`.
4. If it persists, inspect the browser network request to `/api/me` and verify the configured JWKS URL, API base URL, and bearer token expiration—not secrets themselves.

Before this fix, `http://127.0.0.1:5173` had a CORS failure because it was not included in the backend allowed origins. The default `application.yml` now allows both `localhost:5173` and `127.0.0.1:5173`; private `backend/.env` values must not override that with a localhost-only list. In production, `APP_CORS_ALLOWED_ORIGINS` must list the exact deployed frontend origin(s).

### Expected empty states

- The database currently has category records but no seeded products and no category-product assignments. A blank product listing/empty dashboard product table is expected until real products are created through the admin API/dashboard.
- There are no customer orders until a signed-in customer checks out.
- The dashboard’s registered-customer card intentionally displays an unavailable state because a protected admin customer-directory API has not been implemented. It must not display an invented count.

### Functional gaps

1. **No payment provider:** orders remain pending-payment; there is no payment intent, webhook verification, refund flow, or card-data handling.
2. **No admin customer API:** no safe endpoint exists yet for customer list/detail/order-history management; the dashboard shows an empty state.
3. **Inventory uses product updates:** there is no separate inventory-adjustment/audit API or stock-movement ledger yet.
4. **Test coverage is incomplete:** no dedicated `OrderService` tests, controller/integration tests, end-to-end browser tests, or admin-dashboard component tests currently exist.
5. **Generated DB types may be stale:** `src/types/database.ts` should be regenerated after confirming a safe generation target. Do not manually pretend it represents every V2–V4 field/table.
6. **Routing is minimal:** public navigation is context-driven and `/admin` is selected via `window.location.pathname`, not React Router. Direct `/admin` works because Netlify has an SPA rewrite, but more routes/deep links may justify an intentional router migration.
7. **Static hosting is not a complete deployment:** `netlify.toml` deploys only the Vite frontend. Production needs a separately deployed, reachable Spring API with correct environment variables and `VITE_CATALOG_API_URL` set at frontend build time. A Netlify-only deployment will not provide catalogue/admin/orders APIs.
8. **Current README wording is partly historical:** it still mentions a simulated checkout in parts, while the current cart can submit pending orders to the backend. Update user documentation after production payment and deployment choices are made.
9. **Brand name discrepancy:** visual SILVORA versus backend/repository SILVESTO LUXE needs an explicit owner decision.

## 10. Deployment checklist

### Frontend host (Netlify or equivalent)

- Build with a public `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and deployed `VITE_CATALOG_API_URL`.
- Keep SPA fallback from `netlify.toml` so `/admin` serves `index.html`.
- Never set backend/database/Storage secrets as Vite variables.

### Backend host

- Run Java 21/Spring Boot with private datasource, JWKS, and Storage credentials.
- Make the backend public over HTTPS at a stable URL.
- Set `APP_CORS_ALLOWED_ORIGINS` to the precise frontend origin(s).
- Let Flyway run its own outstanding migrations once per deployed database.
- Configure `APP_INITIAL_ADMIN_EMAIL` only for a one-time bootstrap if needed, then remove it.

### Supabase

- Apply CLI baseline migrations once to the target database before first Flyway backend startup.
- Verify RLS/policies and existing user profile role before testing `/admin`.
- Use the Storage bucket created by V3, not browser upload policies.

## 11. Recommended next work for a successor

Prioritize in this order unless product requirements change:

1. Resolve the fresh admin session issue in-browser and verify real create/edit/deactivate product, category, image upload, and order-status paths.
2. Seed/import approved real product data through admin APIs (not static React arrays), assign categories, and verify public catalogue rendering.
3. Add backend order-service tests and API integration tests for stock races, cancellation/restock, authorization, and invalid state transitions.
4. Add a carefully scoped admin customer API with pagination and authorization; then connect the dashboard customer area.
5. Design payment integration separately (provider, webhook verification, idempotency, payment state machine) before accepting any payment details.
6. Deploy backend independently, set production CORS/API URLs, and complete production smoke tests.
7. Decide whether to adopt a router and whether to reconcile the SILVORA/SILVESTO naming.

## 12. Recent implementation history

Recent commits establish the architecture in this order:

```text
7cf3926 feat: complete backend auth foundation
e2d0e51 feat: add catalogue images and dynamic categories
9f58e1f feat: load storefront catalogue from API
88121b8 feat: add customer order records
cae98a1 feat: add protected admin dashboard
2397727 fix: allow loopback dashboard origin
```

Before making a change, run `git status`, preserve unrelated work, and avoid reset/checkout operations that overwrite another person's files. Run a proportionate build/test after changes, then commit only task-related files.

