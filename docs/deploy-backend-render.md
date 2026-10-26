# Deploying the backend API on Render

The storefront on Vercel loads products, places orders, and opens the admin dashboard through the
Spring Boot API in `backend/`. Until the API runs somewhere public, the live site has no catalogue
and the dashboard cannot confirm who is an administrator. This guide puts the API on
[Render](https://render.com) and connects the live site to it.

```text
Customer's browser ──► Vercel (storefront, /admin)
        │
        └──► Render (Spring Boot API) ──► Supabase (database, storage)
```

## Why Render

- It builds straight from this GitHub repository using `backend/Dockerfile`, and redeploys on every
  push to `main`.
- It has a Singapore region, close to the Supabase project in Mumbai, so database calls stay fast.
- Secrets are entered in its dashboard and never stored in Git.

**Free or paid instance.** The Free instance is fine for trying things out, but it goes to sleep
after about 15 minutes without visitors. The next visitor then waits a minute or more while the API
starts. Before real customers arrive, switch to a paid instance (Starter) so the shop is always
awake. Render shows the current price when you choose the instance type.

## 1. Collect the values (do not commit them)

You need these values. Copy them straight into Render in step 2; never paste them into Vercel,
GitHub, chat messages, or screenshots.

| Render variable | Where to get it |
| --- | --- |
| `SUPABASE_DB_URL` | `SUPABASE_DB_URL` in your local `backend/.env`. Add `?sslmode=require` to the end if it is not already there. It must be the **Session pooler** address (`…pooler.supabase.com`), because Render cannot reach Supabase's direct IPv6-only address. |
| `SUPABASE_DB_USERNAME` | `SUPABASE_DB_USERNAME` in `backend/.env` (looks like `postgres.<project-ref>`). |
| `SUPABASE_DB_PASSWORD` | `SUPABASE_DB_PASSWORD` in `backend/.env`. |
| `SUPABASE_JWKS_URL` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` (public). |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (public). |
| `SUPABASE_STORAGE_SECRET_KEY` | Supabase dashboard → **Project Settings → API Keys → Secret keys → Create new secret key**. Name it `render-backend`. It is shown once; copy it into Render only. Needed for product image uploads. |
| `APP_CORS_ALLOWED_ORIGINS` | Your live site's address, for example `https://your-site.vercel.app`: `https://`, no path, no trailing slash. Separate several addresses with commas. |

Do **not** set `APP_INITIAL_ADMIN_EMAIL` (an administrator already exists) or `SERVER_PORT`
(Render chooses the port).

## 2. Create the Render service

1. Sign up at [render.com](https://render.com) with **GitHub**, and allow Render to see the
   `Nithin30121/Silver` repository.
2. Choose **New → Web Service**, then pick the `Silver` repository.
3. Fill in the form:
   - **Name:** `silvora-api` (this becomes `https://silvora-api.onrender.com`, or similar if taken)
   - **Language:** Docker
   - **Branch:** `main`
   - **Region:** Singapore
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `./Dockerfile` (Render reads it inside `backend`)
   - **Instance Type:** Free to try, Starter for real customers
4. Under **Environment Variables**, add every variable from the table in step 1.
5. Under **Advanced**, set **Health Check Path** to `/actuator/health`.
6. Choose **Deploy Web Service**.

The first build takes several minutes: it downloads Java libraries, runs the backend tests, and
packages the API. In the **Logs** tab, wait for `Started SilvestoApiApplication`.

## 3. Check the API on its own

Open these in a browser, replacing the address with your service's:

- `https://silvora-api.onrender.com/actuator/health` shows `{"status":"UP"}`.
- `https://silvora-api.onrender.com/api/categories` shows the Men and Women categories as JSON.

## 4. Point the live site at the API

Vercel builds the API address into the site, so it needs a new build after you set it.

1. Vercel → your project → **Settings → Environment Variables**.
2. Add `VITE_CATALOG_API_URL` with the value `https://silvora-api.onrender.com/api` for
   **Production**. This address is public; it is not a secret.
3. **Deployments** → the latest Production deployment → **⋯ → Redeploy**.

## 5. Try the whole flow

1. Open your live site's `/admin`, sign in with the administrator account, and check the dashboard
   opens.
2. Add a product with a photo (JPEG, PNG, or WebP, 5 MB or smaller) and publish it.
3. Open the storefront and check the product appears.

## Troubleshooting

| What you see | Likely cause |
| --- | --- |
| Render build fails | Read the first error in the build log. A test failure means the code on `main` is broken; fix it and push again. |
| Logs show a database connection error | `SUPABASE_DB_URL`, username, or password is wrong, or the URL is the direct address instead of the Session pooler. |
| The browser console shows a CORS error | `APP_CORS_ALLOWED_ORIGINS` does not exactly match the site's address (check `https://` and remove any trailing `/`). Save and let Render redeploy. |
| The dashboard says "Please sign in again" | `SUPABASE_JWKS_URL` is wrong, or the session expired: sign out and in again. |
| Image upload fails | `SUPABASE_URL` or `SUPABASE_STORAGE_SECRET_KEY` is missing or wrong. |
| The first page load takes a minute | The Free instance was asleep. Upgrade to Starter to keep it awake. |

If a secret is ever exposed, replace it: reset the database password or delete the secret key in
Supabase, then update the value in Render.
