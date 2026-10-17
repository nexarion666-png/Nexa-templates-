import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {products} from '@/lib/products';
import {demoFrameHref} from '@/lib/preview';
import {getPreview} from '@/components/previews/registry';
import {PreviewShell} from '@/components/preview/preview-shell';
import {PreviewNotice} from '@/components/preview/preview-notice';

export const dynamicParams=false;
export function generateStaticParams(){return products.map(p=>({slug:p.slug}))}
export function generateMetadata({params}:{params:{slug:string}}):Metadata{
  const p=products.find(x=>x.slug===params.slug);
  return {title:p?`${p.name} live preview`:'Live preview',robots:{index:false,follow:true}};
}

export default function DemoPage({params}:{params:{slug:string}}){
  const product=products.find(x=>x.slug===params.slug);
  if(!product)notFound();
  const preview=getPreview(product);

  if(preview.status==='unavailable')return <PreviewNotice kind="unavailable" slug={product.slug} name={product.name}/>;
  if(preview.status==='external'&&!preview.embed)return <PreviewNotice kind="external-only" slug={product.slug} name={product.name} openUrl={preview.url}/>;

  const source=preview.status==='integrated'
    ?{kind:'integrated' as const,src:demoFrameHref(product.slug),openUrl:demoFrameHref(product.slug)}
    :{kind:'external' as const,src:preview.url,openUrl:preview.url};
  return <PreviewShell slug={product.slug} name={product.name} category={product.category} source={source}/>;
}
