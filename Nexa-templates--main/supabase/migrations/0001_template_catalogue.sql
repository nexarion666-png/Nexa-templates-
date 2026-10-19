-- =====================================================================
-- Nexa Templates — Stage 4: database-backed template catalogue
-- Migration 0001
--
-- Run once (Supabase dashboard -> SQL Editor, or `supabase db push`).
-- It is written to be safe to re-run: objects are created only if missing,
-- and policies/triggers are dropped and re-created.
-- =====================================================================

create table if not exists public.templates (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null,
  name                  text not null,
  tagline               text,
  description           text,
  price                 numeric(10,2) not null,
  currency              text not null default 'USD',
  category              text not null,
  tags                  text[] not null default '{}',
  features              text[] not null default '{}',
  technologies          text[] not null default '{}',
  thumbnail_url         text,
  gallery_urls          text[] not null default '{}',
  preview_mode          text not null default 'none',
  preview_url           text,
  preview_embeddable    boolean not null default true,
  -- PRIVATE. Path of the paid ZIP in a private Storage bucket (Stage 5/10).
  -- NULL means "no downloadable file has been uploaded". Never readable by public roles (see grants below).
  download_storage_path text,
  is_published          boolean not null default false,
  is_featured           boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Presentation fields that already exist in the current storefront (lib/products.ts).
  badge                 text,            -- e.g. 'Bestseller'
  compare_at_price      numeric(10,2),   -- the struck-through "old price"
  pages                 text[] not null default '{}',   -- "Pages in this concept"
  card_kind             text,            -- artwork layout for the card; NULL = derive from category
  card_theme            text,            -- colour theme key (see lib/catalogue/themes.ts); NULL = automatic

  constraint templates_slug_key              unique (slug),
  constraint templates_slug_format           check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint templates_name_not_blank        check (length(btrim(name)) > 0),
  constraint templates_category_not_blank    check (length(btrim(category)) > 0),
  constraint templates_price_non_negative    check (price >= 0),
  constraint templates_compare_price_valid   check (compare_at_price is null or compare_at_price >= 0),
  constraint templates_currency_format       check (currency ~ '^[A-Z]{3}$'),
  constraint templates_preview_mode_valid    check (preview_mode in ('none', 'integrated', 'external')),
  constraint templates_preview_url_scheme    check (preview_url is null or preview_url ~* '^https?://[^[:space:]]+$'),
  constraint templates_external_needs_url    check (preview_mode <> 'external' or preview_url is not null),
  constraint templates_thumbnail_scheme      check (thumbnail_url is null or thumbnail_url ~* '^https?://[^[:space:]]+$'),
  constraint templates_card_kind_valid       check (card_kind is null or card_kind in ('saas','portfolio','shop','agency','ai','creator')),
  constraint templates_download_path_safe    check (download_storage_path is null
                                                    or (download_storage_path !~ '^/' and download_storage_path !~ '\.\.'))
);

comment on table  public.templates is 'Public template catalogue. Only rows with is_published = true are visible to visitors.';
comment on column public.templates.download_storage_path is 'Private. Real path of the uploaded ZIP, or NULL when no file exists. Not readable by anon/authenticated.';
comment on column public.templates.preview_mode is 'none | integrated (component registered in code under the same slug) | external (preview_url)';

-- ---------------------------------------------------------------------
-- Indexes (the slug unique constraint already creates a unique index)
-- ---------------------------------------------------------------------
create index if not exists templates_category_idx
  on public.templates (category);
create index if not exists templates_published_order_idx
  on public.templates (sort_order, created_at) where is_published;
create index if not exists templates_featured_idx
  on public.templates (sort_order) where is_published and is_featured;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security + privileges
-- ---------------------------------------------------------------------
alter table public.templates enable row level security;

-- Supabase grants broad default privileges on new public tables. Remove them, then grant back
-- ONLY read access to the public-safe columns (download_storage_path is deliberately omitted).
revoke all on table public.templates from public, anon, authenticated;

grant select (
  id, slug, name, tagline, description, price, currency, category, tags, features, technologies,
  thumbnail_url, gallery_urls, preview_mode, preview_url, preview_embeddable,
  is_published, is_featured, sort_order, created_at, updated_at,
  badge, compare_at_price, pages, card_kind, card_theme
) on public.templates to anon, authenticated;

-- Visitors (signed in or not) may read PUBLISHED rows only.
drop policy if exists templates_public_read_published on public.templates;
create policy templates_public_read_published
  on public.templates
  for select
  to anon, authenticated
  using (is_published);

-- There are intentionally NO insert/update/delete policies and NO write grants for anon/authenticated:
-- the catalogue can only be changed from the Supabase dashboard / SQL editor or with the service_role
-- key on a server (service_role bypasses RLS). A future admin stage should add something like:
--   create policy templates_admin_all on public.templates for all to authenticated
--     using (public.is_admin()) with check (public.is_admin());
-- plus the matching table grants, where is_admin() checks a server-managed role/claim.
