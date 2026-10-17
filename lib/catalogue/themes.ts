import type {TemplateProduct} from '../products';

/**
 * Card colour themes. The full Tailwind class strings MUST stay literal here (Tailwind only generates
 * classes it can find in the source), so the database stores a short key, not CSS classes.
 */
export const CARD_THEMES:Record<string,string>={
  violet:'from-violet-600 via-purple-500 to-pink-400',
  sunset:'from-orange-400 via-pink-500 to-purple-600',
  amber:'from-amber-300 via-orange-400 to-rose-500',
  sky:'from-sky-400 via-blue-500 to-violet-600',
  indigo:'from-indigo-500 via-blue-500 to-cyan-400',
  fuchsia:'from-fuchsia-500 via-pink-500 to-orange-400',
};
const THEME_KEYS=Object.keys(CARD_THEMES);

/** Stable automatic theme for rows without card_theme (same slug -> same colours). */
export function themeFor(slug:string,key?:string|null):string{
  if(key&&CARD_THEMES[key])return CARD_THEMES[key];
  let h=0;for(let i=0;i<slug.length;i++)h=(h*31+slug.charCodeAt(i))>>>0;
  return CARD_THEMES[THEME_KEYS[h%THEME_KEYS.length]];
}

export const CARD_KINDS:readonly TemplateProduct['kind'][]=['saas','portfolio','shop','agency','ai','creator'];

/** Artwork layout for rows without card_kind, derived from the category. */
export function kindFor(category:string,key?:string|null):TemplateProduct['kind']{
  if(key&&(CARD_KINDS as readonly string[]).includes(key))return key as TemplateProduct['kind'];
  const c=category.toLowerCase();
  if(c.includes('portfolio'))return 'portfolio';
  if(c.includes('commerce')||c.includes('shop')||c.includes('store'))return 'shop';
  if(c.includes('agency'))return 'agency';
  if(c.includes('landing')||/\bai\b/.test(c))return 'ai';
  return 'saas';
}
