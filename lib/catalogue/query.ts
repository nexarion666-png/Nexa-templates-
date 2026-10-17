/** Normalisation of anything that comes from a URL or user input before it reaches a query. */

export type SortKey='featured'|'low'|'high'|'name';
export const SORT_KEYS:readonly SortKey[]=['featured','low','high','name'];

/** Slugs are lowercase kebab-case, max 80 chars (same rule as the database constraint). */
export function normalizeSlug(input:unknown):string|null{
  if(typeof input!=='string')return null;
  const s=input.trim().toLowerCase();
  return s.length>0&&s.length<=80&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)?s:null;
}

/** Category names are free text; keep printable text only, bounded in length. */
export function normalizeCategory(input:unknown):string|null{
  if(typeof input!=='string')return null;
  // eslint-disable-next-line no-control-regex
  const s=input.replace(/[\u0000-\u001f\u007f]/g,'').trim();
  return s.length>0&&s.length<=60?s:null;
}

/**
 * Search terms are reduced to letters, digits, spaces and a few harmless symbols so they can never
 * alter the structure of the PostgREST filter (no commas, parentheses, wildcards or quotes).
 */
export function normalizeSearchTerm(input:unknown):string{
  if(typeof input!=='string')return '';
  return input.normalize('NFKC').replace(/[^\p{L}\p{N} \-.+#]/gu,' ').replace(/\s+/g,' ').trim().slice(0,80);
}

export function normalizeSort(input:unknown):SortKey{
  return typeof input==='string'&&(SORT_KEYS as readonly string[]).includes(input)?input as SortKey:'featured';
}
