import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getTemplateBySlug} from '@/lib/catalogue/repository';
import {resolvePreview} from '@/lib/preview';
import {integratedPreviews} from '@/components/previews/registry';

/**
 * Bare page that renders ONE integrated demo (first-party code registered under the template's slug).
 * Only meant to be loaded inside the preview iframe on /demo/[slug].
 */
export const revalidate=60;
export const metadata:Metadata={title:'Template demo',robots:{index:false,follow:false}};

export default async function DemoFramePage({params}:{params:{slug:string}}){
  const product=await getTemplateBySlug(params.slug).catch(()=>null);
  if(!product)notFound();
  const preview=resolvePreview(product,Object.keys(integratedPreviews));
  if(preview.status!=='integrated')notFound();
  const Demo=integratedPreviews[preview.integratedId];
  if(!Demo)notFound();
  return <Demo/>;
}
