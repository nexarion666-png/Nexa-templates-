import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {products} from '@/lib/products';
import {resolvePreview} from '@/lib/preview';
import {integratedPreviews} from '@/components/previews/registry';

/**
 * Bare page that renders ONE integrated demo. It is only meant to be loaded inside the
 * preview iframe on /demo/[slug]. Rendering it in an iframe is what lets the demo's own
 * responsive CSS react to the Desktop / Tablet / Mobile switcher.
 */
export const metadata:Metadata={title:'Template demo',robots:{index:false,follow:false}};
export function generateStaticParams(){
  return products
    .filter(p=>resolvePreview(p,Object.keys(integratedPreviews)).status==='integrated')
    .map(p=>({slug:p.slug}));
}

export default function DemoFramePage({params}:{params:{slug:string}}){
  const product=products.find(x=>x.slug===params.slug);
  if(!product)notFound();
  const preview=resolvePreview(product,Object.keys(integratedPreviews));
  if(preview.status!=='integrated')notFound();
  const Demo=integratedPreviews[preview.integratedId];
  if(!Demo)notFound();
  return <Demo/>;
}
