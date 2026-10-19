'use client';
import Link from 'next/link';
import {AlertTriangle,RefreshCw} from 'lucide-react';

/** Last-resort boundary for unexpected render errors in the catalogue (expected ones are handled in-page). */
export default function TemplatesError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle size={26} aria-hidden="true"/></span>
    <h1 className="mt-5 text-2xl font-black">Something went wrong</h1>
    <p className="mt-3 text-sm text-nexa-muted">We couldn’t show this page. Please try again.</p>
    <div className="mt-6 flex gap-3"><button type="button" onClick={reset} className="button-primary"><RefreshCw size={15} aria-hidden="true"/> Try again</button><Link href="/" className="button-secondary">Back home</Link></div>
  </div>;
}
