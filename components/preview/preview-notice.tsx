import Link from 'next/link';
import {ArrowLeft,ExternalLink,MonitorOff,ShoppingBag,Sparkles} from 'lucide-react';
import {buyHref,productHref} from '@/lib/preview';

/**
 * Full-page message used when a live preview cannot be shown inline:
 *  - "unavailable": no demo is configured (or the configuration was rejected)
 *  - "external-only": the demo exists but must be opened in its own tab
 * Server-component friendly (no hooks).
 */
export function PreviewNotice({kind,slug,name,openUrl}:{kind:'unavailable'|'external-only';slug:string;name:string;openUrl?:string}){
  const ring='focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300';
  return <div className="flex min-h-dvh flex-col items-center justify-center bg-[#eeeaf8] px-4 py-10">
    <Link href="/" className={`mb-6 flex items-center gap-2.5 rounded-lg ${ring}`}><span className="brand-mark"><Sparkles size={19} aria-hidden="true"/></span><span className="text-lg font-black tracking-tight text-nexa-ink">nexa<span className="text-nexa-purple">.</span><span className="ml-1 text-sm font-bold text-gray-500">templates</span></span></Link>
    <div className="w-full max-w-lg rounded-[28px] border border-violet-100 bg-white px-6 py-10 text-center shadow-soft sm:px-10">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-nexa-purple">{kind==='unavailable'?<MonitorOff size={28} aria-hidden="true"/>:<ExternalLink size={28} aria-hidden="true"/>}</span>
      <h1 className="mt-5 text-2xl font-black tracking-tight text-nexa-ink sm:text-3xl">{kind==='unavailable'?'Live preview coming soon':'This demo opens in its own tab'}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-nexa-muted">{kind==='unavailable'
        ?`A live demo hasn’t been set up for ${name} yet. You can still read the full product details.`
        :`The live demo for ${name} is hosted on its own website and can’t be shown inside Nexa Templates.`}</p>
      {kind==='external-only'&&openUrl&&<a href={openUrl} target="_blank" rel="noopener noreferrer" className={`button-primary mt-6 w-full ${ring}`}>Open live demo in a new tab <ExternalLink size={16} aria-hidden="true"/></a>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href={productHref(slug)} className={`button-secondary ${ring}`}>View Product Details</Link>
        <Link href={buyHref(slug)} className={`button-secondary ${ring}`}><ShoppingBag size={15} aria-hidden="true"/> Buy Template</Link>
      </div>
      <Link href="/templates" className={`mt-5 inline-flex items-center gap-2 rounded text-sm font-bold text-gray-500 hover:text-nexa-purple ${ring}`}><ArrowLeft size={15} aria-hidden="true"/> Back to Marketplace</Link>
    </div>
  </div>;
}
