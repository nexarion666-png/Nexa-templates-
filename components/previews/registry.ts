import type {ComponentType} from 'react';
import {resolvePreview} from '@/lib/preview';
import type {PreviewConfig,ResolvedPreview} from '@/lib/preview';

/**
 * Registry of INTEGRATED live demos (first-party code that ships inside this app).
 *
 * Only add components here that you have written/reviewed yourself. Never import
 * customer-supplied source code. A template that needs its own Next.js runtime, server-side
 * code or incompatible dependencies should use an `external` preview instead.
 *
 * To add one:
 *   1. Create the demo component, e.g. components/previews/orbit-saas.tsx
 *      (use Tailwind breakpoints normally — it is rendered inside an iframe whose width
 *       follows the Desktop / Tablet / Mobile switcher, so responsive classes work).
 *   2. Register it below. Use next/dynamic so the demo is NOT bundled into the catalogue pages:
 *        import dynamic from 'next/dynamic';
 *        'orbit-saas': dynamic(() => import('./orbit-saas')),
 *   3. Register it under the SAME KEY AS THE TEMPLATE'S SLUG, then set preview_mode = 'integrated' on that row in Supabase.
 */
export const integratedPreviews: Record<string, ComponentType> = {
  // (none registered yet — no template source code exists in this repository)
};

const registeredIds = Object.keys(integratedPreviews);

/** Resolve a product's preview config against this registry. Safe to call anywhere. */
export function getPreview(product:{slug:string;preview?:PreviewConfig}):ResolvedPreview{
  return resolvePreview(product,registeredIds);
}
