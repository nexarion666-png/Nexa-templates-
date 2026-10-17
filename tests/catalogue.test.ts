/**
 * Catalogue data-layer tests. Run:  npx tsx tests/catalogue.test.ts
 * Uses a local mock of Supabase's REST API (PostgREST) that emulates the migration's column grants
 * (no `select=*`, no download_storage_path) and the filters the repository sends. It does NOT test real
 * Postgres/RLS — see DATABASE-SETUP.md for the manual RLS verification queries.
 */
import http from 'node:http';
import fs from 'node:fs';
import {AddressInfo} from 'node:net';
import {getPublishedTemplates,getFeaturedTemplates,getTemplateBySlug,getTemplatesByCategory,searchTemplates,getTemplateCategories} from '../lib/catalogue/repository';
import {CatalogueError} from '../lib/catalogue/errors';
import {rowToProduct,PUBLIC_COLUMNS} from '../lib/catalogue/mapper';
import {normalizeSearchTerm,normalizeSlug} from '../lib/catalogue/query';
import {kindFor} from '../lib/catalogue/themes';
import {products} from '../lib/products';
import {resolvePreview} from '../lib/preview';

let fail=0;const t=(n:string,c:boolean,x='')=>{console.log((c?'PASS ':'FAIL ')+n+(x&&!c?'  -> '+x:''));if(!c)fail++;};
const base=(o:Record<string,unknown>)=>({id:'x',tagline:'t',description:'d',price:10,currency:'USD',tags:[],features:['f'],technologies:['Next.js'],thumbnail_url:null,gallery_urls:[],preview_mode:'none',preview_url:null,preview_embeddable:true,is_published:true,is_featured:false,sort_order:0,created_at:'2026-01-01',updated_at:'2026-01-01',badge:null,compare_at_price:null,pages:[],card_kind:null,card_theme:null,...o});
const ROWS:any[]=[
 base({slug:'orbit-saas',name:'Orbit SaaS',category:'SaaS',price:24,compare_at_price:32,is_featured:true,sort_order:0,badge:'Bestseller',card_theme:'violet',card_kind:'saas',description:'A modern SaaS site'}),
 base({slug:'folio-studio',name:'Folio Studio',category:'Portfolio',price:19,is_featured:true,sort_order:10}),
 base({slug:'north-agency',name:'North Agency',category:'Agency',price:22,sort_order:20,preview_mode:'external',preview_url:'https://north-demo.example.com/'}),
 base({slug:'ext-blocked',name:'Blocked Embed',category:'Agency',price:5,sort_order:25,preview_mode:'external',preview_url:'https://x.example.com',preview_embeddable:false}),
 base({slug:'evil-preview',name:'Evil Preview',category:'SaaS',price:5,sort_order:26,preview_mode:'external',preview_url:'javascript:alert(1)'}),
 base({slug:'no-url',name:'No Url',category:'SaaS',price:5,sort_order:27,preview_mode:'external',preview_url:null}),
 base({slug:'int-demo',name:'Int Demo',category:'Landing Page',price:5,sort_order:28,preview_mode:'integrated'}),
 base({slug:'secret-draft',name:'Secret Draft',category:'SaaS',price:99,sort_order:5,is_published:false,is_featured:true,description:'unreleased agency thing'}),
 base({slug:'bad-price',name:'Bad Price',category:'SaaS',price:-1,sort_order:30}),
 base({slug:'new-cat',name:'Newcat',category:'Zeta',price:1,sort_order:31,thumbnail_url:'javascript:alert(1)',gallery_urls:['https://img.example.com/a.png','data:text/html,x','http://insecure.example.com/b.png']}),
];
type Mode='ok'|'leaky'|'500'|'schema'|'html'|'object'|'hang';
let mode:Mode='ok';const log:string[]=[];let lastHeaders:http.IncomingHttpHeaders={};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url!,'http://x');lastHeaders=req.headers;log.push(u.search);
  const send=(c:number,b:unknown,raw=false)=>{res.writeHead(c,{'content-type':raw?'text/html':'application/json'});res.end(raw?String(b):JSON.stringify(b));};
  if(mode==='hang')return;
  if(mode==='500')return send(500,{code:'XX000',message:'boom secret-internal-detail'});
  if(mode==='schema')return send(404,{code:'PGRST205',message:"Could not find the table 'public.templates'"});
  if(mode==='html')return send(200,'<html>',true);
  if(mode==='object')return send(200,{a:1});
  const sel=(u.searchParams.get('select')||'');
  if(sel==='*'||sel.split(',').includes('download_storage_path'))return send(401,{code:'42501',message:'permission denied for table templates'});
  let rows=[...ROWS];
  if(mode==='ok'&&true)rows=rows.filter(r=>r.is_published); // what RLS does. 'leaky' skips it to test the app's own filter.
  const pub=u.searchParams.get('is_published');if(pub==='eq.true')rows=rows.filter(r=>r.is_published);
  const slug=u.searchParams.get('slug');if(slug)rows=rows.filter(r=>`eq.${r.slug}`===slug);
  const cat=u.searchParams.get('category');if(cat?.startsWith('eq.'))rows=rows.filter(r=>r.category===cat.slice(3));
  const feat=u.searchParams.get('is_featured');if(feat==='eq.true')rows=rows.filter(r=>r.is_featured);
  const or=u.searchParams.get('or');
  if(or){const parts=or.slice(1,-1).split(',').map(x=>{const [f,,...v]=x.split('.');return [f,v.join('.')] as [string,string];});
    rows=rows.filter(r=>parts.some(([f,pat])=>new RegExp('^'+pat.replace(/[.+#]/g,'\\$&').replace(/\*/g,'.*')+'$','i').test(String(r[f]??''))));}
  rows.sort((a,b)=>a.sort_order-b.sort_order);
  const lim=Number(u.searchParams.get('limit')||1000);rows=rows.slice(0,lim);
  const cols=sel.split(',');send(200,rows.map(r=>Object.fromEntries(cols.map(c=>[c,r[c]]))));
});
const setEnv=(url?:string,key='anon-test-key',extra:Record<string,string>={})=>{
  for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXA_CATALOGUE_FALLBACK'])delete process.env[k];
  if(url)process.env.NEXT_PUBLIC_SUPABASE_URL=url;if(url&&key)process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=key;Object.assign(process.env,extra);
};
const code=async(f:()=>Promise<unknown>)=>{try{await f();return 'no-error';}catch(e){return e instanceof CatalogueError?e.code:'other:'+e;}};
const quiet=<T,>(f:()=>Promise<T>)=>{const e=console.error,w=console.warn;console.error=()=>{};console.warn=()=>{};return f().finally(()=>{console.error=e;console.warn=w;});};

(async()=>{
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const URL_=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 (process.env as any).NODE_ENV='development';

 /* ---- configuration / missing env ---- */
 setEnv();
 t('missing env -> not_configured',await code(()=>getPublishedTemplates())==='not_configured');
 t('missing env: getTemplateBySlug(valid) -> not_configured (not "not found")',await code(()=>getTemplateBySlug('orbit-saas'))==='not_configured');
 setEnv('not a url');t('malformed URL -> not_configured',await code(()=>getPublishedTemplates())==='not_configured');
 setEnv('https://u:p@x.supabase.co');t('URL with credentials -> not_configured',await code(()=>getPublishedTemplates())==='not_configured');
 setEnv(URL_,'');t('missing anon key -> not_configured',await code(()=>getPublishedTemplates())==='not_configured');
 (process.env as any).NODE_ENV='production';setEnv('http://insecure.example.com');
 t('http (non-local) rejected in production',await code(()=>getPublishedTemplates())==='not_configured');
 (process.env as any).NODE_ENV='development';

 /* ---- explicit fallback ---- */
 setEnv(undefined,'',{NEXA_CATALOGUE_FALLBACK:'static'});
 const fb=await quiet(()=>getPublishedTemplates());
 t('fallback=static + no Supabase -> hardcoded catalogue',fb.length===products.length);
 t('fallback: slug lookup works, unknown -> null',(await quiet(()=>getTemplateBySlug('orbit-saas')))?.name==='Orbit SaaS'&&(await quiet(()=>getTemplateBySlug('nope')))===null);
 setEnv(URL_,'k',{NEXA_CATALOGUE_FALLBACK:'static'});mode='500';
 t('fallback NEVER masks a DB failure when Supabase is configured',await quiet(()=>code(()=>getPublishedTemplates()))==='query');
 setEnv(undefined,'',{});t('fallback is off by default',await code(()=>getPublishedTemplates())==='not_configured');

 /* ---- happy path ---- */
 setEnv(URL_,'anon-test-key');mode='ok';log.length=0;
 let all=await quiet(()=>getPublishedTemplates());
 t('published only (no secret-draft)',!all.some(p=>p.slug==='secret-draft'));
 t('invalid row (negative price) skipped',!all.some(p=>p.slug==='bad-price'));
 t('ordered by sort_order',all[0].slug==='orbit-saas'&&all[1].slug==='folio-studio');
 t('request uses explicit public columns, never * and never download_storage_path',log.every(q=>!q.includes('select=%2A')&&!q.includes('download_storage_path')));
 t('request carries is_published=eq.true filter',log[0].includes('is_published=eq.true'));
 t('publishable (non-JWT) key sent as apikey only',lastHeaders.apikey==='anon-test-key'&&lastHeaders.authorization===undefined);
 setEnv(URL_,'eyJhbGciOi.test.jwt');await quiet(()=>getPublishedTemplates());
 t('legacy JWT anon key sent as apikey + Bearer',lastHeaders.apikey==='eyJhbGciOi.test.jwt'&&lastHeaders.authorization==='Bearer eyJhbGciOi.test.jwt');
 setEnv(URL_,'anon-test-key');
 t('mapped shape matches storefront type',all[0].tech[0]==='Next.js'&&all[0].oldPrice===32&&all[0].badge==='Bestseller'&&all[0].gradient.startsWith('from-violet-600')&&all[0].currency==='USD');
 t('no downloadable-file field exists on public products',!('download_storage_path' in all[0])&&!('downloadStoragePath' in all[0]));

 /* ---- defence in depth: leaky backend that ignores RLS and the filter ---- */
 mode='leaky';
 const leaked=await quiet(()=>getPublishedTemplates());
 t('even if backend returned unpublished rows, app drops them',!leaked.some(p=>p.slug==='secret-draft'));
 t('leaky: slug lookup of unpublished -> null',(await quiet(()=>getTemplateBySlug('secret-draft')))===null);
 mode='ok';

 /* ---- featured / slug / category ---- */
 const feat=await quiet(()=>getFeaturedTemplates(3));
 t('featured: only published featured',feat.map(p=>p.slug).join()==='orbit-saas,folio-studio');
 t('slug found',(await quiet(()=>getTemplateBySlug('north-agency')))?.name==='North Agency');
 t('slug uppercase normalised',(await quiet(()=>getTemplateBySlug('  ORBIT-SAAS ')))?.slug==='orbit-saas');
 t('unpublished slug -> null',(await quiet(()=>getTemplateBySlug('secret-draft')))===null);
 log.length=0;
 for(const bad of ['',' ','../etc/passwd','a b','x;drop table templates','a'.repeat(200),'-bad','bad-','a--b',null,undefined,42,{},['a']])
   if((await quiet(()=>getTemplateBySlug(bad)))!==null)t('invalid slug rejected: '+JSON.stringify(bad),false);
 t('invalid slugs return null and never hit the database',log.length===0,String(log.length));
 t('normalizeSlug accepts valid',normalizeSlug('a-b-1')==='a-b-1');
 t('category filter',(await quiet(()=>getTemplatesByCategory('SaaS'))).map(p=>p.slug).join()==='orbit-saas,evil-preview,no-url');
 t('category: unpublished never included',!(await quiet(()=>getTemplatesByCategory('SaaS'))).some(p=>p.slug==='secret-draft'));
 t('category invalid -> []',(await quiet(()=>getTemplatesByCategory('')))  .length===0&&(await quiet(()=>getTemplatesByCategory('x'.repeat(100)))).length===0);
 t('categories: familiar order then new A-Z',(await quiet(()=>getTemplateCategories())).join()==='Landing Page,SaaS,Portfolio,Agency,Zeta',(await quiet(()=>getTemplateCategories())).join());

 /* ---- search ---- */
 t('search by name (case-insens.)',(await quiet(()=>searchTemplates('ORBIT'))).map(p=>p.slug).join()==='orbit-saas');
 t('search by category word',(await quiet(()=>searchTemplates('agency'))).map(p=>p.slug).join()==='north-agency,ext-blocked');
 t('search hits description',(await quiet(()=>searchTemplates('modern saas'))).map(p=>p.slug).join()==='orbit-saas');
 t('search never leaks unpublished content ("agency thing")',!(await quiet(()=>searchTemplates('agency thing'))).some(p=>p.slug==='secret-draft'));
 t('search + category',(await quiet(()=>searchTemplates('a','Agency'))).every(p=>p.category==='Agency'));
 t('empty search -> everything published',(await quiet(()=>searchTemplates('   '))).length===all.length);
 t('no match -> []',(await quiet(()=>searchTemplates('zzzznomatch'))).length===0);
 log.length=0;
 const inj=["a),is_published.eq.false,(name.ilike.*","x%' or 1=1 --","*","a,b","\\","(select 1)",'"; drop table templates; --'];
 for(const s of inj){const r=await quiet(()=>searchTemplates(s));if(r.some(p=>p.slug==='secret-draft'))t('injection leaked: '+s,false);}
 t('injection attempts leak nothing and contain no filter-syntax chars in the query',log.every(q=>{const o=new URL('http://x/'+q).searchParams.get('or')||'';return !/[%\\"]/.test(o.slice(1,-1).replace(/\*/g,''))&&(o.match(/,/g)||[]).length<=3;}));
 t('normalizeSearchTerm strips syntax',normalizeSearchTerm('a),(b,"c"*%_')==='a b c');
 t('normalizeSearchTerm keeps unicode + length cap',normalizeSearchTerm('Café Zürich')==='Café Zürich'&&normalizeSearchTerm('x'.repeat(500)).length===80);

 /* ---- previews through the mapper + stage-3 resolver ---- */
 const bySlug=async(s:string)=>(await quiet(()=>getTemplateBySlug(s)))!;
 t('preview none -> unavailable',resolvePreview(await bySlug('folio-studio')).status==='unavailable');
 const ext=resolvePreview(await bySlug('north-agency'));
 t('preview external https -> external, embeddable',ext.status==='external'&&ext.embed===true&&ext.url==='https://north-demo.example.com/');
 const blocked=resolvePreview(await bySlug('ext-blocked'));
 t('preview_embeddable=false -> external, embed=false (new-tab only)',blocked.status==='external'&&blocked.embed===false);
 t('javascript: preview URL -> unavailable (never reaches an iframe)',resolvePreview(await bySlug('evil-preview')).status==='unavailable');
 t('external with NULL url -> unavailable',resolvePreview(await bySlug('no-url')).status==='unavailable');
 t('integrated w/o registered component -> unavailable',resolvePreview(await bySlug('int-demo'),[]).status==='unavailable');
 t('integrated w/ registered component (id = slug)',resolvePreview(await bySlug('int-demo'),['int-demo']).status==='integrated');
 const nc=await bySlug('new-cat');
 t('thumbnail javascript: dropped; gallery keeps only valid image URLs',nc.thumbnailUrl===undefined&&nc.galleryUrls!.join()==='https://img.example.com/a.png,http://insecure.example.com/b.png'.split(',').filter(u=>u.startsWith('https')||true).join());
 (process.env as any).NODE_ENV='production';
 t('production: http gallery URL dropped',rowToProduct(ROWS[9])!.galleryUrls!.join()==='https://img.example.com/a.png');
 t('production: http preview URL -> unavailable',resolvePreview(rowToProduct({...ROWS[2],preview_url:'http://insecure.example.com'})!).status==='unavailable');
 (process.env as any).NODE_ENV='development';

 /* ---- mapper unit checks ---- */
 t('mapper: unpublished row -> null',rowToProduct({...ROWS[0],is_published:false})===null);
 t('mapper: garbage -> null',rowToProduct(null)===null&&rowToProduct('x')===null&&rowToProduct({})===null);
 t('mapper: numeric string price ok',rowToProduct({...ROWS[0],price:'24.50'})!.price===24.5);
 t('mapper: compare price lower than price ignored',rowToProduct({...ROWS[0],compare_at_price:5})!.oldPrice===undefined);
 t('mapper: missing optional fields tolerated',(()=>{const p=rowToProduct({...ROWS[1],tagline:null,description:null,technologies:null,pages:null,features:null,thumbnail_url:null,gallery_urls:null})!;return p.tagline===''&&p.tech.length===0&&p.thumbnailUrl===undefined;})());
 t('kindFor: Email is not "ai"; Landing Page is',kindFor('Email')==='saas'&&kindFor('Landing Page')==='ai'&&kindFor('E-commerce')==='shop');
 t('PUBLIC_COLUMNS excludes download_storage_path',!PUBLIC_COLUMNS.includes('download_storage_path'));

 /* ---- failure modes are distinct and generic ---- */
 mode='500';let msg='';try{await quiet(()=>getPublishedTemplates());}catch(e){msg=(e as Error).message;}
 t('HTTP 500 -> query; message has no internal detail',await quiet(()=>code(()=>getPublishedTemplates()))==='query'&&!msg.includes('secret-internal'));
 mode='schema';t('missing table -> schema',await quiet(()=>code(()=>getPublishedTemplates()))==='schema');
 mode='html';t('non-JSON body -> query',await quiet(()=>code(()=>getPublishedTemplates()))==='query');
 mode='object';t('non-array body -> query',await quiet(()=>code(()=>getPublishedTemplates()))==='query');
 setEnv('http://127.0.0.1:1');mode='ok';t('connection refused -> connection',await quiet(()=>code(()=>getPublishedTemplates()))==='connection');
 setEnv(URL_);mode='hang';const t0=Date.now();
 t('hung database times out -> connection (~8s)',await quiet(()=>code(()=>getPublishedTemplates()))==='connection'&&Date.now()-t0<12000&&Date.now()-t0>=7500,String(Date.now()-t0));
 mode='ok';
 setEnv(URL_);t('empty catalogue is [] (not an error)',(()=>{const keep=ROWS.splice(0,ROWS.length);return keep;})().length>0&&(await quiet(()=>getPublishedTemplates())).length===0);

 /* ---- seed + migration static checks ---- */
 const seed=fs.readFileSync('supabase/seed.sql','utf8'),mig=fs.readFileSync('supabase/migrations/0001_template_catalogue.sql','utf8');
 t('seed contains every current product (slug,name,price,category)',products.every(p=>seed.includes(`('${p.slug}', '${p.name}'`)&&seed.includes(`, ${p.price}, 'USD', '${p.category}'`)));
 t('seed idempotent + non-destructive',/on conflict \(slug\) do nothing/.test(seed)&&!/do update/i.test(seed)&&!/\bdelete\b|\btruncate\b/i.test(seed));
 t('seed: no downloads or previews invented',seed.includes("'none'")&&!seed.includes("'external'")&&!/https?:\/\//.test(seed.replace(/--.*$/gm,'')));
 t('migration: RLS enabled, public-read-published policy, price>=0, unique slug',/enable row level security/.test(mig)&&/using \(is_published\)/.test(mig)&&/price >= 0/.test(mig)&&/unique \(slug\)/.test(mig));
 t('migration: no write policies/grants for public roles',!/create policy[^;]*for (insert|update|delete|all)/i.test(mig.replace(/--.*$/gm,''))&&!/grant (insert|update|delete|all)/i.test(mig.replace(/--.*$/gm,'')));
 t('migration: column grants exclude download_storage_path',!/grant select \([^)]*download_storage_path/.test(mig));
 t('migration: updated_at trigger + indexes',/set_updated_at/.test(mig)&&/templates_category_idx/.test(mig)&&/templates_featured_idx/.test(mig));

 server.close();
 console.log(fail?`\n${fail} FAILED`:'\nALL PASSED');process.exit(fail?1:0);
})();
