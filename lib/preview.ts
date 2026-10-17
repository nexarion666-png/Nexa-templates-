/**
 * Live Preview system — configuration, validation and sizing helpers.
 *
 * This file is intentionally framework-free (no React, no Next imports) so it can be
 * used from server components, client components and plain Node tests.
 *
 * HOW TO CONFIGURE A TEMPLATE (in lib/products.ts, on the product's `preview` field):
 *
 *   preview: { mode: 'unavailable' }                       // default — no demo yet
 *   preview: { mode: 'external', url: 'https://demo.example.com' }
 *   preview: { mode: 'external', url: 'https://…', embeddable: false }   // opens in a new tab only
 *   preview: { mode: 'integrated', integratedId: 'orbit-saas' }          // see components/previews/registry.ts
 */

export type PreviewMode = 'integrated' | 'external' | 'unavailable';

export type PreviewConfig = {
  mode: PreviewMode;
  /** integrated: key of the demo component registered in components/previews/registry.ts */
  integratedId?: string;
  /** external: absolute https:// URL of the separately hosted live demo */
  url?: string;
  /**
   * external: set to false for demos that forbid iframe embedding (X-Frame-Options /
   * frame-ancestors). The demo is then offered as an "open in new tab" link only.
   */
  embeddable?: boolean;
};

export type ResolvedPreview =
  | { status: 'integrated'; integratedId: string }
  | { status: 'external'; url: string; embed: boolean }
  | { status: 'unavailable'; reason: string };

export const PREVIEW_UNAVAILABLE_REASON =
  'A live preview has not been set up for this template yet.';

/* ------------------------------------------------------------------ */
/* URL validation                                                      */
/* ------------------------------------------------------------------ */

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

const MAX_URL_LENGTH = 2048;

/**
 * Validates an external demo URL.
 * - only https: is accepted in production; http: is accepted outside production (local testing)
 * - javascript:, data:, blob:, file:, ftp: etc. are always rejected
 * - URLs with embedded credentials (user:pass@host) are rejected
 * - returns the normalised absolute URL (URL#href), never the raw input
 */
export function validateDemoUrl(
  raw: unknown,
  opts: { production?: boolean } = {}
): UrlCheck {
  const production = opts.production ?? process.env.NODE_ENV === 'production';

  if (typeof raw !== 'string') return { ok: false, reason: 'URL is missing.' };
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'URL is empty.' };
  if (value.length > MAX_URL_LENGTH) return { ok: false, reason: 'URL is too long.' };
  // Reject whitespace / control characters anywhere inside the URL.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f]/.test(value)) return { ok: false, reason: 'URL contains invalid characters.' };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'URL is not a valid absolute URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http(s) URLs are allowed.' };
  }
  if (parsed.protocol === 'http:' && production) {
    return { ok: false, reason: 'Demo URLs must use https:// in production.' };
  }
  if (!parsed.hostname) return { ok: false, reason: 'URL has no host name.' };
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed.' };
  }
  return { ok: true, url: parsed.href };
}

/* ------------------------------------------------------------------ */
/* Resolver                                                            */
/* ------------------------------------------------------------------ */

/**
 * Turns a product's raw `preview` config into something safe to render.
 * Misconfiguration never throws: it resolves to `unavailable` (and warns in development).
 *
 * @param registeredIntegratedIds ids that exist in components/previews/registry.ts
 */
export function resolvePreview(
  product: { slug: string; preview?: PreviewConfig },
  registeredIntegratedIds: readonly string[] = []
): ResolvedPreview {
  const cfg = product.preview;
  const warn = (msg: string) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[nexa preview] ${product.slug}: ${msg}`);
    }
  };

  if (!cfg || cfg.mode === 'unavailable') {
    return { status: 'unavailable', reason: PREVIEW_UNAVAILABLE_REASON };
  }

  if (cfg.mode === 'integrated') {
    const id = cfg.integratedId;
    if (!id || !registeredIntegratedIds.includes(id)) {
      warn(`integrated preview "${id ?? '(none)'}" is not registered in components/previews/registry.ts`);
      return { status: 'unavailable', reason: PREVIEW_UNAVAILABLE_REASON };
    }
    return { status: 'integrated', integratedId: id };
  }

  if (cfg.mode === 'external') {
    const check = validateDemoUrl(cfg.url);
    if (!check.ok) {
      warn(`external demo URL rejected — ${check.reason}`);
      return { status: 'unavailable', reason: PREVIEW_UNAVAILABLE_REASON };
    }
    return { status: 'external', url: check.url, embed: cfg.embeddable !== false };
  }

  warn(`unknown preview mode`);
  return { status: 'unavailable', reason: PREVIEW_UNAVAILABLE_REASON };
}

export const demoHref = (slug: string) => `/demo/${slug}`;
export const demoFrameHref = (slug: string) => `/demo/${slug}/frame`;
export const productHref = (slug: string) => `/templates/${slug}`;
export const buyHref = (slug: string) => `/templates/${slug}#purchase`;

/* ------------------------------------------------------------------ */
/* Device viewport sizing                                              */
/* ------------------------------------------------------------------ */

export type DeviceId = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_SPECS: Record<
  DeviceId,
  { label: string; width: number; maxHeight: number; bezel: number }
> = {
  desktop: { label: 'Desktop', width: 1280, maxHeight: Number.POSITIVE_INFINITY, bezel: 0 },
  tablet: { label: 'Tablet', width: 768, maxHeight: 1024, bezel: 10 },
  mobile: { label: 'Mobile', width: 390, maxHeight: 844, bezel: 10 },
};

/** Never shrink a simulated viewport below this; the stage scrolls instead. */
export const MIN_SCALE = 0.45;

export type FrameLayout = {
  /** CSS pixel size of the page inside the iframe (what media queries see) */
  logicalW: number;
  logicalH: number;
  /** visual scale applied to the iframe (<=1) */
  scale: number;
  /** on-screen size of the visible frame (without bezel) */
  innerW: number;
  innerH: number;
};

/**
 * Computes how big the iframe's viewport is and how much it is scaled down to fit.
 *
 * - desktop: fluid when the stage is at least 1280px wide, otherwise a 1280px viewport scaled down
 *   (never below MIN_SCALE — beyond that the stage scrolls horizontally).
 * - tablet / mobile: fixed viewport width (768 / 390), scaled down only if the stage is narrower.
 *   Height fills the stage up to a realistic device height.
 *
 * @param stageW usable stage width (content box, excluding padding)
 * @param stageH usable stage height
 */
export function computeFrameLayout(device: DeviceId, stageW: number, stageH: number): FrameLayout {
  const spec = DEVICE_SPECS[device];
  const availW = Math.max(0, stageW - spec.bezel * 2);
  const availH = Math.max(0, stageH - spec.bezel * 2);

  let logicalW = spec.width;
  let scale = 1;
  if (device === 'desktop' && availW >= spec.width) {
    logicalW = Math.floor(availW);
  } else {
    scale = Math.min(1, Math.max(MIN_SCALE, availW / spec.width));
  }

  const logicalH = Math.max(240, Math.min(spec.maxHeight, Math.floor(availH / scale)));
  return {
    logicalW,
    logicalH,
    scale,
    innerW: Math.round(logicalW * scale),
    innerH: Math.round(logicalH * scale),
  };
}
