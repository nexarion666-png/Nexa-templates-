# Nexa Templates — Stage 4: Database setup (Supabase)

Template data now comes from a Supabase PostgreSQL table, `public.templates`. Nothing in this repo has been
run against *your* Supabase project — you perform the steps below once.

## What you need
- A free Supabase project (https://supabase.com → New project).
- Files in this repo: `supabase/migrations/0001_template_catalogue.sql` (schema + security) and `supabase/seed.sql` (your six current templates).

## 1. Create the table and security rules
Supabase dashboard → **SQL Editor → New query** → paste the whole of `supabase/migrations/0001_template_catalogue.sql` → **Run**.
(Safe to run twice. With the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.)

## 2. Seed the existing catalogue
SQL Editor → new query → paste `supabase/seed.sql` → **Run**.
- Inserts Orbit SaaS, Folio Studio, Market Muse, North Agency, Launchpad AI and Creator Club with their existing slugs, categories, features and prices.
- **Idempotent and non-destructive:** `on conflict (slug) do nothing` — running it again adds no duplicates and never overwrites edits you made in the dashboard. It is never run automatically by the app.
- Prices stay **illustrative** until you verify them. All six are published (as in the old storefront), `preview_mode = 'none'` (no demo sites exist) and `download_storage_path = NULL` (no downloadable ZIP exists).

Verify: Table editor → `templates` should show 6 rows.

## 3. Environment variables
Supabase → **Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon / publishable** key (never the service-role/secret key) |

These two are public by design; Row Level Security (below) is what protects the data. Do **not** put the service-role key anywhere in this stage.

- **Local:** copy `.env.example` to `.env.local` and fill them in (`.env.local` is git-ignored). `npm run dev`.
- **Vercel:** Project → **Settings → Environment Variables** → add both for *Production* (and *Preview* if you use it).

## 4. Redeploy
Vercel only reads new variables on a new deployment: **Deployments → ⋯ on the latest → Redeploy** (or push a commit). Catalogue edits made later in Supabase appear on the site within ~60 seconds without redeploying.

> **Deploying before Supabase is ready?** Without the two variables the catalogue pages show a "catalogue isn't connected yet" notice (the site does not crash). To keep showing the old hardcoded products meanwhile, set `NEXA_CATALOGUE_FALLBACK=static` in Vercel. That fallback is used **only** when the two Supabase variables are missing; a real database outage is never hidden by it. Remove it once connected.

## Security model (what the migration enforces)
- Row Level Security is **on**. One policy: `anon` and `authenticated` may `SELECT` rows where `is_published = true`. Unpublished rows are invisible to visitors.
- There are **no** insert/update/delete policies and the migration revokes all default table privileges, then grants back only `SELECT` on public columns. Visitors cannot write.
- `download_storage_path` is deliberately **not** granted to public roles, so it can never be read through the public API. The app also never requests it.
- Data is changed only via the Supabase dashboard/SQL editor (or, in a later stage, a server using the service-role key, which bypasses RLS and must never reach the browser).
- Constraints: unique kebab-case `slug`, `price >= 0`, 3-letter uppercase `currency`, `preview_mode` ∈ `none|integrated|external`, preview/thumbnail URLs must be `http(s)://`, `external` requires a URL.
- The app additionally re-checks `is_published`, validates every preview URL (HTTPS-only in production, no `javascript:`/`data:`/credentials) and image URL, and never builds queries from raw user input.

**Check RLS yourself (SQL Editor, one run):**
```sql
begin;
set local role anon;
select count(*) from public.templates;                    -- = number of PUBLISHED rows only
select download_storage_path from public.templates;       -- must fail: permission denied
insert into public.templates (slug,name,price,category) values ('x','x',1,'x');  -- must fail
rollback;
```

## Adding or editing a template manually
Supabase → **Table editor → templates → Insert row**. Required: `slug` (lowercase-kebab-case, becomes the URL `/templates/<slug>`), `name`, `price`, `category`. Useful: `tagline`, `description`, `features`, `technologies`, `pages` (arrays — use the array editor), `badge`, `compare_at_price` (the struck-through price), `thumbnail_url` / `gallery_urls` (https image links), `sort_order` (lower = earlier), `is_featured` (homepage "Handpicked" section, first 3), `card_theme` (`violet|sunset|amber|sky|indigo|fuchsia`, blank = automatic), `card_kind` (`saas|portfolio|shop|agency|ai|creator`, blank = from category).

**Published vs unpublished:** a template is visible on the site only when `is_published` is **true**. New rows default to **false** (a draft). Unpublished templates return a 404 on `/templates/<slug>` and `/demo/<slug>`.

## Configuring a live preview
| `preview_mode` | Fill in | Result |
|---|---|---|
| `none` (default) | nothing | "Preview coming soon" button; `/demo/<slug>` explains it |
| `external` | `preview_url` = full `https://…` address of your deployed demo; `preview_embeddable` | embedded in a sandboxed iframe with an "open in new tab" fallback |
| `external` + `preview_embeddable = false` | as above | opens in a new tab only (for demo sites that forbid iframes) |
| `integrated` | nothing, but a component registered in `components/previews/registry.ts` **under the same key as the slug** | rendered inside the site (see `PREVIEW-SYSTEM.md`) |

Never enter a URL you haven't deployed. An invalid URL (wrong scheme, `http://` in production, credentials, missing) is rejected by the app: the template simply shows "Preview coming soon" and the reason is written to the Vercel function logs as `[catalogue] <slug>: external preview URL rejected — …`.

## What visitors see when something is wrong
| Situation | Behaviour |
|---|---|
| Env variables missing | "The catalogue isn't connected yet" (or the opt-in static fallback) |
| Table missing (migration not run) | "The catalogue database needs setting up" |
| Supabase unreachable / error / timeout (8 s) | "Templates are temporarily unavailable" (details only in server logs) |
| No published rows | "No templates published yet" |
| Unknown / unpublished / malformed slug | normal 404 page |
| Invalid preview configuration | "Preview coming soon" |

## Tests included
`npx tsx tests/catalogue.test.ts` — data layer against a local mock of Supabase's REST API (published/unpublished, search, categories, slug validation, injection attempts, missing env, failure modes, seed/migration static checks). It does **not** exercise real Postgres.

## Intentionally NOT implemented in Stage 4
Admin dashboard, customer accounts, cart/checkout, payments, file upload, downloadable templates and paid downloads (stages 5–10). `download_storage_path` exists only so Stage 5/10 have a place to record a real file; nothing reads or advertises it yet. The product page still says purchases are coming soon.
