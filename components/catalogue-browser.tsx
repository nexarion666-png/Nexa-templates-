'use client';
import {useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {Search,SlidersHorizontal,X} from 'lucide-react';
import type {TemplateProduct} from '@/lib/products';
import {ProductCard} from '@/components/product-card';

const ALL='All templates';

/**
 * The existing catalogue page UI (hero, search, sort, category chips, grid), unchanged in look and behaviour.
 * The only difference: templates arrive as props from the database instead of a hardcoded import.
 * When `notice` is given (setup / error / empty state) it replaces the controls and grid under the hero.
 */
export function CatalogueBrowser({templates,categories,initialCategory=ALL,notice}:{templates:TemplateProduct[];categories:string[];initialCategory?:string;notice?:ReactNode}){
  const[q,setQ]=useState('');
  const[cat,setCat]=useState(initialCategory);
  const[sort,setSort]=useState('featured');
  const allCats=useMemo(()=>[ALL,...categories],[categories]);
  const filtered=useMemo(()=>{
    let a=templates.filter(p=>(cat===ALL||p.category===cat)&&`${p.name} ${p.tagline} ${p.category} ${p.tech.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
    if(sort==='low')a=[...a].sort((x,y)=>x.price-y.price);
    if(sort==='high')a=[...a].sort((x,y)=>y.price-x.price);
    if(sort==='name')a=[...a].sort((x,y)=>x.name.localeCompare(y.name));
    return a;
  },[templates,q,cat,sort]);
  const reset=()=>{setQ('');setCat(ALL);};
  return <div className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <div className="rounded-[28px] bg-gradient-to-r from-violet-700 via-purple-600 to-pink-500 px-6 py-9 text-white sm:px-10 sm:py-12"><div className="text-xs font-black uppercase tracking-[.2em] text-white/70">The collection</div><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Find your next starting point.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Browse creative website template concepts for businesses, builders, and brands.</p></div>
    {notice?<div className="mt-8">{notice}</div>:<>
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search templates, styles, or tech..." className="w-full rounded-xl border border-violet-100 bg-white py-3.5 pl-11 pr-10 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/>{q&&<button aria-label="Clear search" onClick={()=>setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={17}/></button>}</div>
        <div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-gray-400"/><label htmlFor="sort" className="text-xs font-bold text-gray-500">Sort by</label><select id="sort" value={sort} onChange={e=>setSort(e.target.value)} className="rounded-xl border border-violet-100 bg-white px-3 py-3 text-sm font-semibold"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option></select></div>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{allCats.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold ${cat===c?'bg-nexa-purple text-white':'border border-violet-100 bg-white text-gray-600 hover:text-nexa-purple'}`}>{c}</button>)}</div>
      <div className="mt-6 flex items-center justify-between"><p className="text-sm text-nexa-muted"><b className="text-nexa-ink">{filtered.length}</b> templates found</p>{(q||cat!==ALL)&&<button onClick={reset} className="text-xs font-bold text-nexa-purple">Clear filters</button>}</div>
      {filtered.length?<div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div className="mt-8 rounded-3xl border border-dashed border-violet-200 bg-white px-6 py-16 text-center"><Search className="mx-auto text-violet-300" size={30}/><h2 className="mt-4 text-xl font-black">No templates found</h2><p className="mt-2 text-sm text-nexa-muted">Try a different search or category.</p><button onClick={reset} className="button-primary mt-5">Reset filters</button></div>}
    </>}
  </div>;
}
