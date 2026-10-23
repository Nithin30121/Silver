# Customer Accounts with Supabase

Setup, testing and deployment guide for SILVESTO LUXE customer accounts: sign-up, sign-in,
sign-out, password reset and the account page.

> **Status:** implemented and tested end to end against a **local** Supabase stack.
> Nothing has been applied to a Supabase cloud project yet: that requires the steps in
> [Create the Supabase project](#2-create-the-supabase-project) onwards, which only you can do.

---

## 1. How it works

```
Browser (React + TypeScript + Vite)
   │  official Supabase JavaScript client  (src/lib/supabaseClient.ts)
   ├──► Supabase Auth ─────── accounts, passwords (bcrypt-hashed), sessions, emails
   └──► Supabase Postgres ─── public.profiles, protected by Row Level Security
```

There is **no server of our own**. The website is a set of static files that any static host can
serve, and Supabase (a managed service) does authentication and stores data. Your MacBook does not
need to be running.

### Where each piece of information lives

| Information | Stored in | Notes |
|---|---|---|
| Email, password hash, email-verified status | Supabase Auth (`auth.users`) | Passwords are never stored or seen by this website's code. |
| Full name, role, timestamps | Supabase Postgres (`public.profiles`) | One row per customer, created automatically by a database trigger. |
| Login session (access + refresh token) | Browser `localStorage` | Managed by the Supabase client; refreshed automatically. See [Security notes](#10-security-notes-and-known-limitations). |
| Shopping bag and wishlist | Browser `localStorage` | **Unchanged.** Not linked to accounts yet; signing in or out does not touch them. |
| Product catalogue | `src/data/products.ts` (in the code) | **Unchanged.** Not in the database yet. |
| Live silver rate cache | Browser `localStorage` | **Unchanged.** See [Silver rate in production](#8-silver-rate-in-production). |

### Why the database is safe even though the browser talks to it directly

The browser only holds the **publishable key**, which is designed to be public. What a request may
do is decided **inside Postgres** by Row Level Security (RLS) and column privileges, based on the
signed-in customer's identity (`auth.uid()`):

- a customer can read and update **only their own** profile row;
- the only column they can change is `full_name` (so nobody can make themselves `admin`);
- nobody can insert or delete profiles through the API; logged-out visitors cannot read anything.

These rules are tested by `supabase/tests/database/profiles_security.test.sql` (24 checks).

### Key files

| File | Purpose |
|---|---|
| `src/lib/supabaseClient.ts` | Creates the single Supabase client; validates configuration; refuses secret keys. |
| `src/services/authService.ts` | Sign-up, sign-in, sign-out, password reset; translates errors into customer-friendly messages. |
| `src/services/profileService.ts` | Reads/updates the customer's profile row. |
| `src/context/AuthContext.tsx` | One app-wide source of truth for "who is signed in". |
| `src/components/auth/*` | Sign-in, create-account, forgot/reset-password and account pages. |
| `supabase/migrations/*.sql` | Database schema, security policies and triggers. |
| `supabase/tests/database/*.sql` | Automated database security tests (pgTAP). |
| `supabase/config.toml` | Settings for the **local** Supabase stack only. |
| `netlify.toml`, `public/_headers` | Hosting settings and security headers. |

---

## 2. Create the Supabase project

All free; no billing account needed.

1. Sign up at [supabase.com](https://supabase.com) and create a **new project** on the **Free** plan.
   Choose a region close to your customers (for India, Mumbai `ap-south-1`).
2. Save the **database password** in a password manager. It is never needed by the website and
   must never go into `.env` files or code.
3. Open the project's **Connect** dialog (or **Project Settings → API Keys**) and note:
   - the **Project URL** (`https://<project-ref>.supabase.co`);
   - the **Publishable key** (`sb_publishable_…`). Older projects may show only the legacy
     **anon** key (`eyJ…`); either works.

> **Never use** the **secret** key (`sb_secret_…`) or the legacy **service_role** key in the
> website. They bypass every security rule. The site refuses to start accounts if one is
> supplied, but by then the key is already inside the public files: rotate it in the dashboard
> immediately if that ever happens.

---

## 3. Configure the website

```bash
cp .env.example .env.local
```

Edit `.env.local` (git-ignored) and set:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Everything prefixed `VITE_` ends up in the public JavaScript, which is why only public values
are allowed. If the variables are missing, the shop still works and the account pages show
"Client accounts are being prepared"; the browser console explains what is missing.

---

## 4. Apply the database migrations

**Option A: Supabase CLI** (recommended; no installation, uses `npx`):

```bash
npx supabase@2.122.0 login
```

```bash
npx supabase@2.122.0 link --project-ref <project-ref>
```

```bash
npx supabase@2.122.0 db push
```

Then run the security tests against your project (they run in a transaction that is rolled
back, so they leave no data behind):

```bash
npx supabase@2.122.0 test db --linked
```

**Option B: SQL Editor.** In the dashboard open **SQL Editor**, paste the contents of
`supabase/migrations/20261024000000_create_customer_profiles.sql`, and run it once.

Verify in **Table Editor → profiles** that the table exists and shows **RLS enabled**.

---

## 5. Configure authentication

In the dashboard under **Authentication** (menu names occasionally move; search the settings
if a label differs):

1. **Sign In / Providers → Email**: keep **Email** enabled and **Confirm email** turned **on**.
   Customers must click the emailed link before they can sign in; the website handles this.
2. **Password settings**: set the **minimum password length to 8** (matching the website).
   Optionally enable **leaked password protection** if your plan offers it.
3. **URL Configuration**:
   - **Site URL**: your production address, e.g. `https://silvestoluxe.com`.
   - **Redirect URLs**: add every address that should receive email links:
     - `https://silvestoluxe.com/` (production, with the trailing slash)
     - `http://localhost:5173/` (local development, optional)
     - preview deploys, if you use them, e.g. `https://*--your-site.netlify.app/`
   The website sends customers back to `<current site address>/`, so that exact URL must be listed.
4. **Emails → SMTP Settings**: Supabase's built-in email service is for testing only. It has a very
   low hourly sending limit and, on current plans, only delivers to your project's team members.
   **For real customers, configure custom SMTP** with a transactional email provider (several,
   such as Resend, Brevo or Amazon SES, have free tiers) using an address on your own domain.
   Without this, sign-up confirmation and password-reset emails will not reach customers.
5. **Rate Limits**: after configuring SMTP, review the email rate limit for expected traffic.
6. **Email templates** (optional): the default templates work. You may restyle them, but keep
   the `{{ .ConfirmationURL }}` link.

> **How email links work.** The client uses the `implicit` flow, so confirmation and
> password-reset links work even if the customer opens the email on a different device from
> the one they started on. After following a link, the website signs the customer in, removes
> the tokens from the address bar, and shows either a confirmation message or the
> "Choose a new password" page. Used or expired links show a clear message with a way to
> request a new one.

---

## 6. Build and deploy

The site is static: `npm run build` produces the `dist/` folder.

### Netlify (configuration already in `netlify.toml`)

1. Push the repository to GitHub.
2. In Netlify: **Add new site → Import an existing project**, choose the repository.
   Build settings are read from `netlify.toml` (`npm run build`, publish `dist`, Node 22).
3. **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`).
4. Deploy. After adding or changing variables, **trigger a new deploy**: Vite bakes them in
   at build time.
5. Add your custom domain in Netlify, then update **Site URL** and **Redirect URLs** in
   Supabase ([step 5](#5-configure-authentication)) to that domain.

### Cloudflare Pages (alternative)

Build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION=22`
plus the two `VITE_SUPABASE_*` variables. `public/_headers` is honoured automatically; Cloudflare
serves single-page apps without extra configuration.

> **Note:** Vercel's free *Hobby* plan is for non-commercial use only, so it is not suitable for a
> shop. Check the current terms of whichever host you choose.

### Security headers

`public/_headers` sets a strict **Content-Security-Policy** plus anti-framing and other headers.
The policy only allows the site's own files, Google Fonts, `*.supabase.co` and
`api.gold-api.com`. If you later add a service (analytics, a payment gateway, a custom Supabase
domain), add its origin to the policy or the browser will block it.

---

## 7. Test on the deployed site

| # | Action | Expected |
|---|---|---|
| 1 | Open the site | Homepage, collections, search, bag and wishlist work as before |
| 2 | Account icon → **Create an account** with a real inbox you control | "Confirm your email" page; header still shows *Sign In* |
| 3 | Try to sign in before confirming | "Please confirm your email…" with **Resend confirmation email** |
| 4 | Click the link in the email | Signed in on the account page with a confirmation message; address bar is clean |
| 5 | Reload the page | Still signed in |
| 6 | **Edit** your name on the account page | Saved; still correct after reload |
| 7 | **Sign Out** | Header shows *Sign In*; bag and wishlist are unchanged |
| 8 | Sign in with a wrong password | "The email or password you entered is incorrect." |
| 9 | **Forgotten your password?** → submit your email | Neutral "If an account exists…" message; email arrives |
| 10 | Open the reset link | "Choose a new password"; saving it signs you in |
| 11 | Open the same reset link again | "This email link has expired or has already been used…" |
| 12 | Sign up again with the same email | "An account with this email address already exists…" |

---

## 8. Silver rate in production

During development the header's live silver rate is served by a small endpoint built into the
Vite dev server (`/api/silver-rate` in `vite.config.ts`). **That endpoint does not exist on a
static host.** On a deployed site, `src/services/silverRateService.ts` automatically falls back
to calling `https://api.gold-api.com` directly from the browser (no API key is involved, and that
API allows browser requests). This was verified with a production build served like a static host.

What you lose compared with development: server-side caching (each visitor's browser fetches the
rate itself) and the secondary Yahoo Finance source (which cannot be called from browsers). If you
want those back, or ever switch to a market-data provider that requires a **private API key**,
deploy the endpoint as a server-side function (for example a Supabase Edge Function or a
Netlify Function) and keep the key in that function's secrets, never in `VITE_` variables. That
is a separate deployment task; it is not part of this change.

---

## 9. Free-tier limitations

- **Supabase Free** projects are **paused after about a week without activity** and must be
  resumed from the dashboard; there are limits on database size, bandwidth and monthly active
  users, and no automatic backups. Check Supabase's pricing page for current numbers. Upgrade
  before launching to real customers.
- **Built-in Supabase email** is for testing only (see [step 5](#5-configure-authentication)).
- **Netlify / Cloudflare Pages** free plans have monthly usage allowances.

---

## 10. Security notes and known limitations

- **Session tokens live in `localStorage`.** That is how the Supabase client works in a static site
  with no server. A malicious script running on the page could read them, so the main defences are:
  the strict Content-Security-Policy, no third-party scripts, React's automatic escaping, short-lived
  access tokens (1 hour) and refresh-token rotation. Moving tokens into HttpOnly cookies requires a
  server-side component (a future option, not needed now).
- **Profile email is a convenience copy.** Supabase Auth is the authority for the email address
  and its verification status (shown on the account page from Auth, not from the profile).
- **`user_metadata` is editable by customers** through the Supabase API, so it is only used to pass
  the name at sign-up. Permissions (the `role` column) live in `profiles`, which customers cannot change.
- **Sign-up reveals registered emails** ("an account already exists"). Supabase itself returns this
  signal; it is a usability trade-off common to shops. Sign-in and password-reset responses do not reveal it.
- **Not yet implemented:** CAPTCHA on sign-up/sign-in (Supabase supports hCaptcha and Turnstile),
  multi-factor authentication, changing email or password from the account page, account deletion,
  and syncing the bag and wishlist to the account.
- **Password reset ends other sessions.** After a reset, sessions on other devices are signed out.
- No independent security review has been carried out.

### Future: database-backed products, bag and wishlist

The catalogue currently ships inside the website code: changing a price means a new deployment, and
there is no stock control. Moving it to Postgres (a `products` table, publicly readable with RLS)
would allow an admin panel to edit it. Similarly, a `cart_items` / `wishlist_items` table owned by
`auth.uid()` would let a customer's selections follow them across devices; the local selections
would be merged into the account on first sign-in. Both are separate, planned changes; this phase
deliberately keeps one source of truth for each.

---

## 11. Local development with a local Supabase stack

Requires Docker Desktop. This runs the same Auth, Postgres and email software locally, with a
local inbox (Mailpit) that catches every email.

```bash
npx supabase@2.122.0 start
```

Create `.env.development.local` (git-ignored; used only by `npm run dev`) with the `API_URL` and
`PUBLISHABLE_KEY` printed by the command above (`npx supabase@2.122.0 status` shows them again):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from the status output>
```

> During `npm run dev`, `.env.development.local` takes priority over `.env.local`. Delete it
> when you want the dev server to use your cloud project instead of the local stack.

```bash
npm run dev
```

Open the local inbox at `http://127.0.0.1:54324` to read confirmation and reset emails.

Useful commands:

```bash
npm run test:db
```

```bash
npm run db:types
```

```bash
npx supabase@2.122.0 db reset
```

```bash
npx supabase@2.122.0 stop
```

`test:db` runs the database security tests, `db:types` regenerates `src/types/database.ts`
after a schema change, `db reset` rebuilds the local database from the migrations (deleting
local test data), and `stop` shuts the stack down.

---

## 12. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Account pages say accounts are "being prepared" | `VITE_SUPABASE_*` variables are missing. Set them and rebuild/restart. |
| "We could not reach our secure client service" | Wrong `VITE_SUPABASE_URL`, project paused (free tier), or offline. |
| Emails never arrive | Custom SMTP not configured, rate limit reached, or check spam. |
| Email link opens the wrong site or shows an error | Site URL / Redirect URLs not set to the address you are using (include the trailing `/`). |
| Signing up shows a database error | The migration was not applied, or was edited after being applied. |
| Browser console shows "Refused to connect … Content Security Policy" | A new service is not in `public/_headers`; add its origin. |
