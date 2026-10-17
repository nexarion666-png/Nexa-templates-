'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,ExternalLink,Info,Loader2,Maximize2,Minimize2,Monitor,RefreshCw,ShoppingBag,Smartphone,Tablet} from 'lucide-react';
import {DEVICE_SPECS,buyHref,computeFrameLayout,productHref} from '@/lib/preview';
import type {DeviceId} from '@/lib/preview';

export type PreviewSource={
  kind:'integrated'|'external';
  /** URL loaded in the iframe */
  src:string;
  /** URL opened by the "open in new tab" fallback */
  openUrl:string;
};

type Props={slug:string;name:string;category:string;source:PreviewSource};
type Phase='loading'|'loaded'|'slow';
type FsMode='off'|'native'|'css';
type FsElement=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
type FsDocument=Document&{webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>Promise<void>|void};

const SLOW_AFTER_MS=15000;
const DEVICE_ICONS:Record<DeviceId,typeof Monitor>={desktop:Monitor,tablet:Tablet,mobile:Smartphone};
const DEVICE_ORDER:DeviceId[]=['desktop','tablet','mobile'];
const FRAME_STYLE:Record<DeviceId,{outer:string;inner:string}>={
  desktop:{outer:'rounded-xl bg-white ring-1 ring-violet-100 shadow-soft',inner:'rounded-xl'},
  tablet:{outer:'rounded-[28px] bg-[#1d1a2b] shadow-soft',inner:'rounded-[18px]'},
  mobile:{outer:'rounded-[36px] bg-[#1d1a2b] shadow-soft',inner:'rounded-[26px]'},
};
const focusRing='focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300';

function fullscreenElement():Element|null{
  const d=document as FsDocument;
  return document.fullscreenElement??d.webkitFullscreenElement??null;
}

function DeviceSwitcher({device,onChange,tone='light',fill=false,compact=false}:{device:DeviceId;onChange:(d:DeviceId)=>void;tone?:'light'|'dark';fill?:boolean;compact?:boolean}){
  const wrap=tone==='dark'?'bg-white/10':'border border-violet-100 bg-violet-50/70';
  return <div role="group" aria-label="Preview device size" className={`inline-flex rounded-xl p-1 ${wrap} ${fill?'w-full':''}`}>
    {DEVICE_ORDER.map(id=>{
      const Icon=DEVICE_ICONS[id];const active=device===id;
      const idle=tone==='dark'?'text-white/70 hover:bg-white/10 hover:text-white':'text-gray-600 hover:bg-white hover:text-nexa-purple';
      return <button key={id} type="button" aria-pressed={active} title={`${DEVICE_SPECS[id].label} · ${DEVICE_SPECS[id].width}px`} onClick={()=>onChange(id)} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${fill?'flex-1':''} ${active?'bg-nexa-purple text-white shadow':idle} ${focusRing}`}>
        <Icon size={16} aria-hidden="true"/>
        <span className={compact?'sr-only sm:not-sr-only':''}>{DEVICE_SPECS[id].label}</span>
      </button>;
    })}
  </div>;
}

export function PreviewShell({slug,name,category,source}:Props){
  const rootRef=useRef<HTMLDivElement>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  const [device,setDevice]=useState<DeviceId>('desktop');
  const [stage,setStage]=useState<{w:number;h:number}|null>(null);
  const [phase,setPhase]=useState<Phase>('loading');
  const [reloadKey,setReloadKey]=useState(0);
  const [fs,setFs]=useState<FsMode>('off');

  /* ---- measure the stage (the area the simulated device must fit into) ---- */
  useEffect(()=>{
    const el=stageRef.current;if(!el)return;
    const measure=()=>{
      const cs=getComputedStyle(el);
      const w=Math.max(0,el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight));
      const h=Math.max(0,el.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom));
      setStage(prev=>prev&&prev.w===w&&prev.h===h?prev:{w,h});
    };
    measure();
    if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(measure);ro.observe(el);return()=>ro.disconnect();}
    window.addEventListener('resize',measure);
    return()=>window.removeEventListener('resize',measure);
  },[]);

  /* ---- "taking too long" detection (blocked embeds can't be detected directly) ---- */
  useEffect(()=>{
    setPhase('loading');
    const t=window.setTimeout(()=>setPhase(p=>p==='loading'?'slow':p),SLOW_AFTER_MS);
    return()=>window.clearTimeout(t);
  },[reloadKey,source.src]);

  /* ---- fullscreen: native API with CSS fallback ---- */
  useEffect(()=>{
    const sync=()=>{if(!fullscreenElement())setFs(f=>f==='native'?'off':f);};
    document.addEventListener('fullscreenchange',sync);
    document.addEventListener('webkitfullscreenchange',sync);
    return()=>{
      document.removeEventListener('fullscreenchange',sync);
      document.removeEventListener('webkitfullscreenchange',sync);
      if(fullscreenElement()){const d=document as FsDocument;try{void(document.exitFullscreen?.()??d.webkitExitFullscreen?.());}catch{/* ignore */}}
    };
  },[]);
  useEffect(()=>{
    if(fs!=='css')return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setFs('off');};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[fs]);

  const enterFs=useCallback(async()=>{
    const el=rootRef.current as FsElement|null;if(!el)return;
    try{
      if(el.requestFullscreen&&document.fullscreenEnabled!==false){await el.requestFullscreen();setFs('native');return;}
      if(el.webkitRequestFullscreen){await el.webkitRequestFullscreen();setFs('native');return;}
    }catch{/* fall through to the CSS fallback */}
    setFs('css');
  },[]);
  const exitFs=useCallback(async()=>{
    if(fullscreenElement()){
      const d=document as FsDocument;
      try{await(document.exitFullscreen?.()??d.webkitExitFullscreen?.());}catch{/* ignore */}
    }
    setFs('off');
  },[]);

  const layout=stage?computeFrameLayout(device,stage.w,stage.h):null;
  const spec=DEVICE_SPECS[device];
  const styles=FRAME_STYLE[device];
  const isFs=fs!=='off';
  const details=productHref(slug);

  const detailsLink=(cls:string)=><Link href={details} className={`${cls} ${focusRing}`}>View Product Details</Link>;
  const buyLink=(cls:string)=><Link href={buyHref(slug)} className={`${cls} ${focusRing}`}><ShoppingBag size={15} aria-hidden="true"/> Buy Template</Link>;

  return <div ref={rootRef} className={`flex h-dvh flex-col bg-[#eeeaf8] ${fs==='css'?'fixed inset-0 z-[100]':''}`}>
    {isFs?
      /* ---------- compact full-screen toolbar ---------- */
      <div className="flex items-center gap-2 bg-[#171327] px-2 py-2 text-white sm:px-4">
        <DeviceSwitcher device={device} onChange={setDevice} tone="dark" compact/>
        <span className="hidden min-w-0 flex-1 truncate text-center text-sm font-bold sm:block">{name}</span>
        <span className="flex-1 sm:hidden"/>
        <Link href={details} aria-label="Back to product details" className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white ${focusRing}`}><ArrowLeft size={15} aria-hidden="true"/><span className="hidden sm:inline">Product details</span></Link>
        <button type="button" onClick={exitFs} aria-label="Exit full screen" className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-extrabold text-nexa-ink hover:bg-violet-100 ${focusRing}`}><Minimize2 size={15} aria-hidden="true"/> Exit<span className="hidden sm:inline"> full screen</span></button>
      </div>
    :
      /* ---------- normal toolbar ---------- */
      <header className="border-b border-violet-100 bg-white">
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5">
          <Link href="/templates" className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-gray-600 hover:bg-violet-50 hover:text-nexa-purple ${focusRing}`}><ArrowLeft size={16} aria-hidden="true"/><span className="sm:hidden">Back</span><span className="hidden sm:inline">Back to Marketplace</span></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-black text-nexa-ink">{name}</h1>
            <p className="truncate text-[11px] text-nexa-muted">{category} · Live preview{layout?` · ${layout.logicalW}px wide`:''}</p>
          </div>
          <div className="hidden lg:block"><DeviceSwitcher device={device} onChange={setDevice}/></div>
          <div className="hidden items-center gap-2 lg:flex">
            {detailsLink('button-secondary !px-4 !py-2.5 !text-xs')}
            {buyLink('button-primary !px-4 !py-2.5 !text-xs')}
          </div>
          <button type="button" onClick={enterFs} aria-label="Enter full screen" className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-nexa-ink transition hover:border-violet-200 hover:bg-violet-50 hover:text-nexa-purple ${focusRing}`}><Maximize2 size={16} aria-hidden="true"/><span className="hidden md:inline">Full screen</span></button>
        </div>
        <div className="border-t border-violet-50 px-3 py-2 lg:hidden"><DeviceSwitcher device={device} onChange={setDevice} fill/></div>
      </header>
    }

    {/* ---------- stage ---------- */}
    <div ref={stageRef} className="relative flex min-h-0 min-w-0 flex-1 overflow-auto p-2 sm:p-5">
      <div className="m-auto">
        {layout?
          <div className={`relative shrink-0 ${styles.outer}`} style={{width:layout.innerW+spec.bezel*2,height:layout.innerH+spec.bezel*2,padding:spec.bezel}}>
            <div className={`relative overflow-hidden bg-white ${styles.inner}`} style={{width:layout.innerW,height:layout.innerH}}>
              <iframe
                key={reloadKey}
                title={`${name} live preview (${spec.label.toLowerCase()} view)`}
                src={source.src}
                onLoad={()=>setPhase('loaded')}
                /* Minimum permissions. Scripts are needed for demos to work; no top-navigation, downloads, modals or
                   form submission. External demos stay on their own (opaque) origin. Integrated demos are our own
                   reviewed code on our own origin, so they additionally get same-origin for fonts/storage. */
                sandbox={source.kind==='integrated'?'allow-scripts allow-same-origin':'allow-scripts allow-popups allow-popups-to-escape-sandbox'}
                referrerPolicy={source.kind==='integrated'?'same-origin':'no-referrer'}
                allow=""
                style={{width:layout.logicalW,height:layout.logicalH,transform:`scale(${layout.scale})`,transformOrigin:'0 0',border:0,display:'block',background:'#fff'}}
              />
              {phase!=='loaded'&&<div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white p-4 text-center">
                <Loader2 className="animate-spin text-nexa-purple" size={28} aria-hidden="true"/>
                <p className="text-sm font-bold text-nexa-ink">Loading preview…</p>
                {phase==='slow'&&<div role="alert" className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">
                  <p className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true"/><span>This preview is taking longer than expected. The demo may be offline, or its host may not allow embedding.</span></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={source.openUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg bg-nexa-purple px-3 py-2 font-bold text-white ${focusRing}`}><ExternalLink size={13} aria-hidden="true"/> Open in new tab</a>
                    <button type="button" onClick={()=>setReloadKey(k=>k+1)} className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold ${focusRing}`}><RefreshCw size={13} aria-hidden="true"/> Reload</button>
                  </div>
                </div>}
              </div>}
            </div>
          </div>
        :
          <div role="status" className="flex items-center gap-2 p-10 text-sm font-semibold text-nexa-muted"><Loader2 className="animate-spin" size={18} aria-hidden="true"/> Preparing preview…</div>
        }
      </div>
    </div>

    {/* ---------- embed fallback notice (external demos only) ---------- */}
    {source.kind==='external'&&<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-violet-100 bg-white px-3 py-2 text-[11px] text-nexa-muted">
      <span className="inline-flex items-center gap-1.5"><Info size={13} aria-hidden="true"/> Blank or broken? Some websites block being embedded.</span>
      <a href={source.openUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded font-bold text-nexa-purple hover:underline ${focusRing}`}>Open live demo in a new tab <ExternalLink size={12} aria-hidden="true"/></a>
    </div>}

    {/* ---------- mobile action bar ---------- */}
    {!isFs&&<div className="grid grid-cols-2 gap-2 border-t border-violet-100 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      {detailsLink('button-secondary !px-3 !py-2.5 !text-xs')}
      {buyLink('button-primary !px-3 !py-2.5 !text-xs')}
    </div>}
  </div>;
}
