import type {TemplateProduct} from '../products';
import {products as staticProducts,categories as staticCategories} from '../products';
import {getSupabaseConfig,staticFallbackEnabled} from './config';
import {CatalogueError} from './errors';
import {PUBLIC_COLUMNS,rowToProduct} from './mapper';
import {restSelect} from './postgrest';
import {normalizeCategory,normalizeSearchTerm,normalizeSlug} from './query';

/**
 * Catalogue data access. UI components never talk to the database; they call these functions.
 *
 * Guarantees:
 *  - only PUBLISHED templates are returned (filtered in the query AND re-checked per row, on top of RLS)
 *  - only the public columns are requested (download_storage_path is never selected)
 *  - all inputs are normalised before use; nothing client-supplied becomes raw SQL/filter syntax
 *  - failures throw CatalogueError (never silently swallowed). The ONLY fallback is the explicit,
 *    opt-in NEXA_CATALOGUE_FALLBACK=static when Supabase is not configured at all.
 */

const MAX_ROWS=200;
const ORDER='sort_order.asc,created_at.asc';

function useStaticFallback():boolean{
  if(getSupabaseConfig())return false;
  if(!staticFallbackEnabled())return false;
  console.warn('[catalogue] Supabase is not configured; serving the hardcoded fallback catalogue (NEXA_CATALOGUE_FALLBACK=static).');
  return true;
}

function toProducts(rows:unknown[]):TemplateProduct[]{
  const out:TemplateProduct[]=[];let dropped=0;
  for(const row of rows){const p=rowToProduct(row);if(p)out.push(p);else dropped++;}
  if(dropped)console.warn(`[catalogue] ${dropped} row(s) were skipped (unpublished or invalid).`);
  return out;
}

async function select(extra:Record<string,string>,limit=MAX_ROWS):Promise<TemplateProduct[]>{
  const rows=await restSelect('templates',{select:PUBLIC_COLUMNS,is_published:'eq.true',order:ORDER,limit:String(limit),...extra});
  return toProducts(rows);
}

export async function getPublishedTemplates():Promise<TemplateProduct[]>{
  if(useStaticFallback())return staticProducts;
  return select({});
}

export async function getFeaturedTemplates(limit=3):Promise<TemplateProduct[]>{
  const n=Math.min(Math.max(Math.trunc(limit)||3,1),24);
  if(useStaticFallback())return staticProducts.slice(0,n);
  return select({is_featured:'eq.true'},n);
}

/** Returns null for unknown, unpublished OR malformed slugs. Throws only on infrastructure failure. */
export async function getTemplateBySlug(slug:unknown):Promise<TemplateProduct|null>{
  const s=normalizeSlug(slug);
  if(!s)return null;
  if(useStaticFallback())return staticProducts.find(p=>p.slug===s)??null;
  const rows=await select({slug:`eq.${s}`},1);
  return rows[0]??null;
}

export async function getTemplatesByCategory(category:unknown,limit=MAX_ROWS):Promise<TemplateProduct[]>{
  const c=normalizeCategory(category);
  if(!c)return [];
  if(useStaticFallback())return staticProducts.filter(p=>p.category===c);
  return select({category:`eq.${c}`},Math.min(Math.max(Math.trunc(limit)||MAX_ROWS,1),MAX_ROWS));
}

/** Case-insensitive search over name, tagline, description and category. */
export async function searchTemplates(query:unknown,category?:unknown):Promise<TemplateProduct[]>{
  const term=normalizeSearchTerm(query);
  const cat=category===undefined||category===null?null:normalizeCategory(category);
  if(category!==undefined&&category!==null&&!cat)return [];
  if(useStaticFallback()){
    const t=term.toLowerCase();
    return staticProducts.filter(p=>(!cat||p.category===cat)&&`${p.name} ${p.tagline} ${p.description} ${p.category}`.toLowerCase().includes(t));
  }
  const extra:Record<string,string>={};
  if(term){
    const w=`*${term.replace(/ /g,'*')}*`;
    extra.or=`(name.ilike.${w},tagline.ilike.${w},description.ilike.${w},category.ilike.${w})`;
  }
  if(cat)extra.category=`eq.${cat}`;
  return select(extra);
}

const CATEGORY_PRIORITY=staticCategories.filter(c=>c!=='All templates');

/** Distinct categories of published templates; the storefront's familiar order first, new ones A–Z after. */
export async function getTemplateCategories():Promise<string[]>{
  if(useStaticFallback())return CATEGORY_PRIORITY;
  const rows=await restSelect('templates',{select:'category',is_published:'eq.true',order:ORDER,limit:String(MAX_ROWS)});
  const found=new Set<string>();
  for(const r of rows){
    const c=r&&typeof r==='object'?(r as {category?:unknown}).category:null;
    if(typeof c==='string'&&c.trim())found.add(c.trim());
  }
  const known=CATEGORY_PRIORITY.filter(c=>found.has(c));
  const extra=[...found].filter(c=>!CATEGORY_PRIORITY.includes(c)).sort((a,b)=>a.localeCompare(b));
  return [...known,...extra];
}

export {CatalogueError};
