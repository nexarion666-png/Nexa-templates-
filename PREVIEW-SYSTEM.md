# Nexa Templates — Live Preview System (Stage 3)

## What it does
- **Preview Live** button on every product card and on the product detail page.
- `/demo/[slug]` preview page: template name, Desktop / Tablet / Mobile switcher, Full screen, Back to Marketplace, View Product Details, Buy Template, loading + error states.
- Two preview sources, configured per product in `lib/products.ts`:
  - `integrated` — first-party demo component rendered by this app (shown in an iframe so its responsive CSS reacts to the device switcher).
  - `external` — separately hosted demo URL (https), embedded in a sandboxed iframe, with an "Open in new tab" fallback.
- `unavailable` (the default) — the card shows an inactive **Preview coming soon** button and `/demo/[slug]` shows a clear message. No fake URLs are ever linked.

## Current state of the six products
**All six are set to `unavailable`.** The uploaded repository contains no template source code and no demo URLs (only the illustrative `PreviewArt` cards), so there is nothing real to preview yet. As soon as you set one of them to `external` or `integrated`, its button becomes **Preview Live** automatically.

## Turning a preview on
**Since Stage 4 previews are configured in the Supabase `templates` table** (`preview_mode`, `preview_url`, `preview_embeddable` — see `DATABASE-SETUP.md`). The snippets below show the equivalent legacy `preview` shape in `lib/products.ts`, which is now only the opt-in fallback catalogue.

```ts
// 1. Separately deployed demo (recommended for full Next.js / Vite / HTML templates)
preview: { mode: 'external', url: 'https://orbit-saas-demo.vercel.app' }

// 1b. Demo whose host blocks iframes (X-Frame-Options / frame-ancestors) -> new-tab only
preview: { mode: 'external', url: 'https://…', embeddable: false }

// 2. Integrated demo (code you wrote and reviewed, living in this repo)
preview: { mode: 'integrated', integratedId: 'orbit-saas' }
//   + create components/previews/orbit-saas.tsx
//   + register it in components/previews/registry.ts with next/dynamic

// 3. Not ready
preview: { mode: 'unavailable' }
```
Invalid configuration never crashes the site: it resolves to "unavailable" (and prints a warning in development).

**Tip for external demos:** to allow embedding on a Vercel-hosted demo, make sure it does not send `X-Frame-Options: DENY` / `frame-ancestors 'none'`. Vercel does not add these by default.

## Files
**Created**
- `lib/preview.ts` — config types, URL validation, resolver, device sizing maths (framework-free)
- `components/previews/registry.ts` — registry of integrated demos (empty) + `getPreview()`
- `components/preview-button.tsx` — the Preview Live / Preview coming soon button
- `components/preview/preview-shell.tsx` — toolbar, device switcher, scaled iframe stage, fullscreen
- `components/preview/preview-notice.tsx` — "coming soon" and "opens in its own tab" pages
- `components/chrome-gate.tsx` — hides site header/footer on `/demo/*`
- `app/demo/[slug]/page.tsx`, `loading.tsx`, `error.tsx` — preview route
- `app/demo/[slug]/frame/page.tsx` — bare page that renders one integrated demo (iframe target)
- `PREVIEW-SYSTEM.md` — this file

**Modified**
- `lib/products.ts` — optional `preview` field on `TemplateProduct`; each product gets `preview:{mode:'unavailable'}`
- `components/product-card.tsx` — adds the button (existing links untouched)
- `app/templates/[slug]/page.tsx` — adds the button; gives the purchase button `id="purchase"` (target of "Buy Template")
- `app/layout.tsx` — wraps header/footer in `ChromeGate`
- `next.config.js` — `frame-ancestors 'self'` + `nosniff` headers for the integrated frame route only

No database, migration, new dependency or environment variable is required.

## Security notes
- External URLs: `https:` only in production (`http:` allowed only in development); `javascript:`, `data:`, `blob:`, `file:` etc. and URLs with embedded credentials are rejected.
- External iframe: `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`, `referrerpolicy="no-referrer"`, empty `allow`. No same-origin, top-navigation, downloads, modals or form submission. The marketplace cannot read the demo's DOM.
- Integrated iframe: first-party code only; it additionally gets `allow-same-origin` (fonts/storage) because it is our own reviewed code on our own origin. Never register customer-supplied code. The frame route can only be embedded by this site.
- No `dangerouslySetInnerHTML`; no secrets or env vars used.

## Behaviour notes / limitations
- Browsers don't tell a page when an iframe was refused by `X-Frame-Options`. So the preview shows a persistent "Blank or broken? Open live demo in a new tab" link for external demos, and a warning after 15 s if the frame never finishes loading. Set `embeddable:false` for hosts you know block embedding.
- Sandboxed external demos have no cookies/localStorage; a demo that depends on them may not work embedded.
- The device switcher resizes the viewport; it does not make a template responsive. Check each template yourself.
- On small screens the simulated viewport is scaled down to fit (never below 45%; beyond that the stage scrolls).
- iPhone Safari lacks element fullscreen, so the CSS full-window fallback is used there (Exit button / Esc always available).

## Testing performed (in the build sandbox)
The sandbox had **no npm registry access**, so `npm install`, `next build` and `next lint` could **not** be run. Instead:
- Strict TypeScript check of `lib/*.ts` and the registry: passed.
- Syntax parse of every created/modified file: passed.
- 33 unit tests (URL validation incl. `javascript:`/`data:`/credential/whitespace cases, resolver, device layout maths): passed.
- 31 headless-Chrome checks on the real `PreviewShell` bundle (esbuild, with `next/link` and icons stubbed): device switching sets 768px / 390px / fluid viewport inside the page without reloading the iframe, native fullscreen enter/exit + resync, CSS fullscreen fallback + Esc, 360×640 phone has no horizontal overflow, sandbox attributes, DOM isolation, slow/blocked-embed warning: passed.
- Server rendering of the button/card/notice in every mode: passed.

**Still to verify on your side:** run `npm install && npm run build` (see below) and click through `/templates` and `/demo/<slug>` once a preview URL is configured. Tailwind classes and real icon imports were not compiled here.

## Upload to GitHub and deploy to Vercel
1. Extract the ZIP. The project files are at the root (no outer folder).
2. Copy **all extracted files over** your local clone of `Nexa-templates-` (nothing needs deleting), or on github.com use *Add file → Upload files*, drag in the contents (not the folder), and commit to `main`.
   ```bash
   git add -A
   git commit -m "Stage 3: live preview system"
   git push origin main
   ```
3. Before pushing, test locally: `npm install && npm run build && npm start`, then open `http://localhost:3000/templates`.
4. Vercel redeploys automatically on push (default Next.js settings, no env vars).
5. To enable a preview: deploy the demo as its own Vercel project, put its https URL in `lib/products.ts`, commit and push.
