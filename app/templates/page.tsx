import {CatalogueBrowser} from '@/components/catalogue-browser';
import {CatalogueNotice,noticeKindFor} from '@/components/catalogue-notice';
import {getPublishedTemplates,getTemplateCategories} from '@/lib/catalogue/repository';
import {normalizeCategory} from '@/lib/catalogue/query';
import type {TemplateProduct} from '@/lib/products';

// Catalogue edits in Supabase show up within a minute.
export const revalidate=60;

export default async function TemplatesPage({searchParams}:{searchParams?:{category?:string|string[]}}){
  let templates:TemplateProduct[]=[];
  let categories:string[]=[];
  let problem:unknown=null;
  try{
    [templates,categories]=await Promise.all([getPublishedTemplates(),getTemplateCategories()]);
  }catch(e){problem=e;}

  // The footer/home links use /templates?category=SaaS — honour it only if it is a real category.
  const raw=Array.isArray(searchParams?.category)?searchParams?.category[0]:searchParams?.category;
  const wanted=normalizeCategory(raw);
  const initialCategory=wanted&&categories.includes(wanted)?wanted:'All templates';

  const notice=problem?<CatalogueNotice kind={noticeKindFor(problem)}/>:templates.length===0?<CatalogueNotice kind="empty"/>:undefined;
  return <CatalogueBrowser templates={templates} categories={categories} initialCategory={initialCategory} notice={notice}/>;
}
