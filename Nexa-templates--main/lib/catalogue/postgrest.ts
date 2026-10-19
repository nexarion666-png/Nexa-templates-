import {CatalogueError} from './errors';
import {requireSupabaseConfig} from './config';

const TIMEOUT_MS=8000;
export const REVALIDATE_SECONDS=60;

/** Minimal read-only PostgREST (Supabase REST) client. Uses only the public anon key. */
export async function restSelect(table:string,params:Record<string,string>):Promise<unknown[]>{
  const {url,anonKey}=requireSupabaseConfig();
  const qs=new URLSearchParams(params).toString();
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
  let res:Response;
  try{
    res=await fetch(`${url}/rest/v1/${table}?${qs}`,{
      method:'GET',
      // Legacy anon keys are JWTs (sent as apikey + Bearer). Newer sb_publishable_ keys are NOT JWTs: apikey only.
      headers:{apikey:anonKey,...(anonKey.startsWith('eyJ')?{Authorization:`Bearer ${anonKey}`}:{}),Accept:'application/json'},
      signal:ctrl.signal,
      // Cached + de-duplicated by Next.js; catalogue edits appear within REVALIDATE_SECONDS.
      next:{revalidate:REVALIDATE_SECONDS},
    } as RequestInit);
  }catch(e){
    clearTimeout(timer);
    console.error('[catalogue] database unreachable:',e instanceof Error?e.name:'error');
    throw new CatalogueError('connection','The catalogue database could not be reached.');
  }
  clearTimeout(timer);

  if(!res.ok){
    let code='';let message='';
    try{const j=await res.json() as {code?:string;message?:string};code=j.code??'';message=j.message??'';}catch{/* body not JSON */}
    console.error(`[catalogue] database error: HTTP ${res.status} ${code} ${message}`.trim());
    // 42P01 / PGRST205 = table missing; 42703 / PGRST204 = column missing  -> migration not applied
    if(['42P01','PGRST205','42703','PGRST204'].includes(code))throw new CatalogueError('schema','The catalogue tables are not set up.');
    throw new CatalogueError('query','The catalogue database returned an error.');
  }
  let body:unknown;
  try{body=await res.json();}catch{
    console.error('[catalogue] database returned a non-JSON response');
    throw new CatalogueError('query','The catalogue database returned an unreadable response.');
  }
  if(!Array.isArray(body)){
    console.error('[catalogue] unexpected response shape');
    throw new CatalogueError('query','The catalogue database returned an unexpected response.');
  }
  return body;
}
