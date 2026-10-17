import Link from 'next/link';
import {Clock,MonitorPlay} from 'lucide-react';
import type {TemplateProduct} from '@/lib/products';
import {demoHref} from '@/lib/preview';
import {getPreview} from '@/components/previews/registry';

/**
 * "Preview Live" button used on product cards and the product page.
 * - preview configured  -> link to /demo/[slug]
 * - not configured      -> clearly inactive "Preview coming soon" (never links to a made-up URL)
 */
export function PreviewButton({product,size='md',className=''}:{product:TemplateProduct;size?:'md'|'lg';className?:string}){
  const preview=getPreview(product);
  const pad=size==='lg'?'px-5 py-4 text-sm':'px-4 py-2.5 text-xs';
  const base=`inline-flex w-full items-center justify-center gap-2 rounded-xl font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${pad} ${className}`;
  if(preview.status==='unavailable'){
    return <button type="button" aria-disabled="true" title={preview.reason} aria-label={`Live preview for ${product.name} is not available yet`} className={`${base} cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-500`}><Clock size={size==='lg'?17:15}/> Preview coming soon</button>;
  }
  return <Link href={demoHref(product.slug)} aria-label={`Preview ${product.name} live`} className={`${base} border border-violet-200 bg-violet-50 text-nexa-purple hover:border-nexa-purple hover:bg-nexa-purple hover:text-white`}><MonitorPlay size={size==='lg'?17:15}/> Preview Live</Link>;
}
