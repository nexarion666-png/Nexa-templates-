import Link from 'next/link';
import {AlertTriangle,Database,Inbox} from 'lucide-react';
import {CatalogueError} from '@/lib/catalogue/errors';

export type NoticeKind='not_configured'|'schema'|'unavailable'|'empty';

/** Maps any thrown value to what a visitor should be told. Never includes internal details. */
export function noticeKindFor(err:unknown):NoticeKind{
  if(err instanceof CatalogueError){
    if(err.code==='not_configured')return 'not_configured';
    if(err.code==='schema')return 'schema';
  }
  return 'unavailable';
}

const COPY:Record<NoticeKind,{title:string;body:string}>={
  not_configured:{title:'The catalogue isn’t connected yet',body:'Template data comes from a Supabase database that hasn’t been configured for this site. The site owner can follow DATABASE-SETUP.md to connect it.'},
  schema:{title:'The catalogue database needs setting up',body:'The database is reachable, but the templates table doesn’t exist yet. The site owner needs to run the migration described in DATABASE-SETUP.md.'},
  unavailable:{title:'Templates are temporarily unavailable',body:'We couldn’t load the catalogue right now. Please try again in a moment.'},
  empty:{title:'No templates published yet',body:'There’s nothing in the collection at the moment. Check back soon.'},
};

/** Honest state panel for catalogue problems. Server-component friendly (no hooks). */
export function CatalogueNotice({kind,fullPage=false}:{kind:NoticeKind;fullPage?:boolean}){
  const {title,body}=COPY[kind];
  const Icon=kind==='empty'?Inbox:kind==='unavailable'?AlertTriangle:Database;
  return <div className={`flex items-center justify-center px-4 ${fullPage?'min-h-dvh bg-[#eeeaf8]':'py-10'}`}>
    <div role={kind==='empty'?'status':'alert'} className="w-full max-w-lg rounded-[28px] border border-violet-100 bg-white px-6 py-10 text-center shadow-soft sm:px-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-nexa-purple"><Icon size={26} aria-hidden="true"/></span>
      <h2 className="mt-5 text-xl font-black tracking-tight text-nexa-ink sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-nexa-muted">{body}</p>
      <Link href="/" className="button-secondary mt-6">Back home</Link>
    </div>
  </div>;
}
