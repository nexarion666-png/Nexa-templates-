import type {TemplateProduct} from '../products';
import type {PreviewConfig} from '../preview';
import {validateDemoUrl} from '../preview';
import {kindFor,themeFor} from './themes';

/** Columns the public (anon) role may read. download_storage_path is deliberately NOT included. */
export const PUBLIC_COLUMNS=[
  'id','slug','name','tagline','description','price','currency','category','tags','features','technologies',
  'thumbnail_url','gallery_urls','preview_mode','preview_url','preview_embeddable',
  'is_published','is_featured','sort_order','created_at','updated_at',
  'badge','compare_at_price','pages','card_kind','card_theme',
].join(',');

const str=(v:unknown):string|null=>typeof v==='string'&&v.trim()?v.trim():null;
const strArr=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&x.trim().length>0).map(x=>x.trim()):[];
const num=(v:unknown):number|null=>{const n=typeof v==='string'?Number(v):v;return typeof n==='number'&&Number.isFinite(n)?n:null;};

/** Image URLs must be https (or http outside production); anything else is dropped. */
function imageUrl(v:unknown):string|undefined{
  const s=str(v);if(!s)return undefined;
  const r=validateDemoUrl(s);
  return r.ok?r.url:undefined;
}

function previewConfig(row:Record<string,unknown>,slug:string):PreviewConfig{
  const mode=row.preview_mode;
  if(mode==='integrated')return {mode:'integrated',integratedId:slug};
  if(mode==='external'){
    const check=validateDemoUrl(row.preview_url);
    if(!check.ok){
      // Visible in the Vercel function logs so the owner can fix the record; visitors just see "coming soon".
      console.warn(`[catalogue] ${slug}: external preview URL rejected — ${check.reason}`);
      return {mode:'unavailable'};
    }
    return {mode:'external',url:check.url,embeddable:row.preview_embeddable!==false};
  }
  if(mode!=='none'&&mode!==undefined&&mode!==null)console.warn(`[catalogue] ${slug}: unknown preview_mode`);
  return {mode:'unavailable'};
}

/**
 * Converts a database row into the storefront's existing TemplateProduct shape.
 * Returns null for rows that are unusable or NOT published (second line of defence behind RLS).
 */
export function rowToProduct(row:unknown):TemplateProduct|null{
  if(!row||typeof row!=='object')return null;
  const r=row as Record<string,unknown>;
  if(r.is_published!==true)return null;
  const slug=str(r.slug),name=str(r.name),category=str(r.category),price=num(r.price);
  if(!slug||!name||!category||price===null||price<0)return null;
  const compare=num(r.compare_at_price);
  const gallery=strArr(r.gallery_urls).map(imageUrl).filter((x):x is string=>!!x);
  return {
    slug,name,category,price,
    tagline:str(r.tagline)??'',
    description:str(r.description)??'',
    currency:/^[A-Z]{3}$/.test(String(r.currency))?String(r.currency):'USD',
    oldPrice:compare!==null&&compare>price?compare:undefined,
    badge:str(r.badge)??undefined,
    kind:kindFor(category,str(r.card_kind)),
    gradient:themeFor(slug,str(r.card_theme)),
    tech:strArr(r.technologies),
    pages:strArr(r.pages),
    features:strArr(r.features),
    tags:strArr(r.tags),
    isFeatured:r.is_featured===true,
    thumbnailUrl:imageUrl(r.thumbnail_url),
    galleryUrls:gallery,
    preview:previewConfig(r,slug),
  };
}
