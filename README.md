# Nexa Templates
A colorful, visual-first marketplace storefront starter built with Next.js 14, TypeScript, Tailwind CSS, and Lucide icons.

## Included
- Responsive homepage with large visual product preview cards
- Template catalogue with search, category filters, and sorting
- Individual product detail pages
- About, contact, and draft licensing pages
- Mobile navigation and responsive styling
- Database-backed catalogue (Supabase PostgreSQL) — see `DATABASE-SETUP.md`
- Live preview system (`/demo/[slug]`) with Desktop/Tablet/Mobile switcher, full screen and external demo support — see `PREVIEW-SYSTEM.md`

## Catalogue database (Stage 4)
Templates are read from the Supabase `templates` table (published rows only). Setup in short: run `supabase/migrations/0001_template_catalogue.sql`, then `supabase/seed.sql`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (locally in `.env.local`, in production in Vercel → Settings → Environment Variables), and redeploy. Full guide, security model, how to add templates and configure previews: **`DATABASE-SETUP.md`**. Not yet implemented: admin dashboard, accounts, cart, payments, downloads.

## Important: this is the storefront foundation, not a live shop yet
Payments, customer accounts, admin uploads, persistent cart, database integration, and secure paid downloads are not implemented. Product prices and preview art are demonstration content. Do not accept real payments until payment verification, order storage, license terms, and private download delivery are implemented and tested.

## Run locally
Requires Node.js 18.17 or newer.
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## GitHub and Vercel
1. Extract this ZIP.
2. Create a new GitHub repository and upload the *contents* of the extracted folder.
3. Import that repository into Vercel. Use the default Next.js settings.
4. Deploy. This first version does not need environment variables.

## Before selling
Replace demo products with your own original templates, screenshots, tested ZIP files, accurate descriptions, and prices. Add a protected admin dashboard, Supabase database/authentication and private storage, payment integration available to your business, server-side payment/webhook verification, order history, expiring download links, privacy/terms/refund policies, and a real support email. Test the entire purchase flow in sandbox mode before launch.
