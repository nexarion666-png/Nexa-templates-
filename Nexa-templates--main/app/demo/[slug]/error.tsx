'use client';
import Link from 'next/link';
import {AlertTriangle,ArrowLeft,RefreshCw} from 'lucide-react';

/** Keeps a failing preview from taking the rest of the marketplace down with it. */
export default function DemoError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div className="flex min-h-dvh items-center justify-center bg-[#eeeaf8] px-4">
    <div className="w-full max-w-md rounded-[28px] border border-violet-100 bg-white px-6 py-10 text-center shadow-soft">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle size={26} aria-hidden="true"/></span>
      <h1 className="mt-5 text-2xl font-black">The preview couldn’t load</h1>
      <p className="mt-3 text-sm leading-6 text-nexa-muted">Something went wrong while opening this live preview. The rest of the marketplace is unaffected.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={reset} className="button-primary"><RefreshCw size={15} aria-hidden="true"/> Try again</button>
        <Link href="/templates" className="button-secondary"><ArrowLeft size={15} aria-hidden="true"/> Back to Marketplace</Link>
      </div>
    </div>
  </div>;
}
