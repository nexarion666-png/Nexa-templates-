-- =====================================================================
-- Nexa Templates — Stage 4 seed: the six illustrative templates from the original storefront.
--
-- IDEMPOTENT and NON-DESTRUCTIVE: "on conflict (slug) do nothing" means running this again never
-- creates duplicates and never overwrites a row you have edited in the dashboard.
--
-- Facts about these rows (copied from lib/products.ts, not invented):
--   * prices are ILLUSTRATIVE until you verify them
--   * is_published = true  (they were all publicly listed by the previous storefront)
--   * preview_mode = 'none' (no live demo deployments exist yet)
--   * download_storage_path = NULL (no downloadable ZIP exists yet)
-- Run AFTER supabase/migrations/0001_template_catalogue.sql.
-- =====================================================================
insert into public.templates
  (slug, name, tagline, description, price, currency, category, tags, features, technologies, pages,
   badge, compare_at_price, card_kind, card_theme, preview_mode, download_storage_path,
   is_featured, sort_order, is_published)
select v.slug, v.name, v.tagline, v.description, v.price, v.currency, v.category, v.tags, v.features, v.technologies, v.pages,
       v.badge, v.compare_at_price, v.card_kind, v.card_theme, v.preview_mode, v.download_storage_path,
       v.is_featured, v.sort_order, true
from (values
  ('orbit-saas', 'Orbit SaaS', 'A bold landing page for your next big idea.', 'A modern SaaS marketing site concept with a striking hero, feature highlights, social proof, pricing section, and a clear call to action.', 24, 'USD', 'SaaS', '{}'::text[], array['Responsive layout', 'Reusable components', 'Pricing section', 'CTA sections']::text[], array['Next.js', 'Tailwind CSS', 'TypeScript']::text[], array['Home', 'Features', 'Pricing', 'Contact']::text[], 'Bestseller', 32, 'saas', 'violet', 'none', null, true, 0),
  ('folio-studio', 'Folio Studio', 'Put your best work front and centre.', 'A visual portfolio concept for designers, developers, photographers, and independent creatives.', 19, 'USD', 'Portfolio', '{}'::text[], array['Project gallery', 'About section', 'Contact CTA', 'Mobile-friendly design']::text[], array['HTML', 'CSS', 'JavaScript']::text[], array['Home', 'Work', 'About', 'Contact']::text[], 'Fresh drop', null, 'portfolio', 'sunset', 'none', null, true, 10),
  ('market-muse', 'Market Muse', 'A polished storefront for products people love.', 'A clean ecommerce storefront concept with product tiles, category navigation, promotional banners, and product storytelling.', 29, 'USD', 'E-commerce', '{}'::text[], array['Product grid', 'Promo banner', 'Category chips', 'Responsive layout']::text[], array['Next.js', 'Tailwind CSS']::text[], array['Home', 'Shop', 'Product', 'FAQ']::text[], null, 39, 'shop', 'amber', 'none', null, true, 20),
  ('north-agency', 'North Agency', 'Make your agency look like the obvious choice.', 'A confident agency website concept with selected projects, services, testimonials, and a consultation CTA.', 22, 'USD', 'Agency', '{}'::text[], array['Services overview', 'Project cards', 'Testimonials', 'Lead CTA']::text[], array['React', 'CSS']::text[], array['Home', 'Services', 'Projects', 'Contact']::text[], null, null, 'agency', 'sky', 'none', null, false, 30),
  ('launchpad-ai', 'Launchpad AI', 'Give your AI product a launch-worthy home.', 'A vibrant startup landing page concept designed to introduce an AI product, explain benefits, and convert visitors into early users.', 18, 'USD', 'Landing Page', '{}'::text[], array['Gradient hero', 'Feature blocks', 'Waitlist CTA', 'FAQ section']::text[], array['HTML', 'CSS', 'JavaScript']::text[], array['Home', 'Features', 'Waitlist']::text[], 'Popular', null, 'ai', 'indigo', 'none', null, false, 40),
  ('creator-club', 'Creator Club', 'A bright home for your personal brand.', 'A creator-focused page concept with social links, featured content, an about panel, and a clear path to collaborations.', 16, 'USD', 'Portfolio', '{}'::text[], array['Social link area', 'Featured content', 'Bio section', 'Collaboration CTA']::text[], array['HTML', 'CSS']::text[], array['Home', 'Content', 'About', 'Contact']::text[], null, null, 'creator', 'fuchsia', 'none', null, false, 50)
) as v(slug, name, tagline, description, price, currency, category, tags, features, technologies, pages,
       badge, compare_at_price, card_kind, card_theme, preview_mode, download_storage_path, is_featured, sort_order)
on conflict (slug) do nothing;
