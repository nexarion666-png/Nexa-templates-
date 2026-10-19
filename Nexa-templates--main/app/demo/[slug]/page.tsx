import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import type {TemplateProduct} from '@/lib/products';
import {getTemplateBySlug} from '@/lib/catalogue/repository';
import {demoFrameHref} from '@/lib/preview';
import {getPreview} from '@/components/previews/registry';
import {PreviewShell} from '@/components/preview/preview-shell';
import {PreviewNotice} from '@/components/preview/preview-notice';
import {CatalogueNotice,noticeKindFor} from '@/components/catalogue-notice';

// Preview settings are read from the database; edits show up within a minute.
export const revalidate=60;

export async function generateMetadata({params}:{params:{slug:string}}):Promise<Metadata>{
  try{
    const p=await getTemplateBySlug(params.slug);
    return {title:p?`${p.name} live preview`:'Live preview',robots:{index:false,follow:true}};
  }catch{
    return {title:'Live preview',robots:{index:false,follow:true}};
  }
}

export default async function DemoPage({params}:{params:{slug:string}}){
  let product:TemplateProduct|null;
  try{product=await getTemplateBySlug(params.slug);}
  catch(e){return <CatalogueNotice kind={noticeKindFor(e)} fullPage/>;}
  if(!product)notFound();   // unknown, malformed or unpublished slug

  // getPreview re-validates the stored configuration (https-only, no javascript:/data:/credentials).
  const preview=getPreview(product);
  if(preview.status==='unavailable')return <PreviewNotice kind="unavailable" slug={product.slug} name={product.name}/>;
  if(preview.status==='external'&&!preview.embed)return <PreviewNotice kind="external-only" slug={product.slug} name={product.name} openUrl={preview.url}/>;

  const source=preview.status==='integrated'
    ?{kind:'integrated' as const,src:demoFrameHref(product.slug),openUrl:demoFrameHref(product.slug)}
    :{kind:'external' as const,src:preview.url,openUrl:preview.url};
  return <PreviewShell slug={product.slug} name={product.name} category={product.category} source={source}/>;
}
