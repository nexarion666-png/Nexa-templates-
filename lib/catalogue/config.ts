import {CatalogueError} from './errors';

export type SupabaseConfig={url:string;anonKey:string};

/**
 * Reads the PUBLIC Supabase settings. Only the project URL and the anon/publishable key are used —
 * never the service-role key. Returns null when they are absent or malformed.
 */
export function getSupabaseConfig(env:Record<string,string|undefined>=process.env):SupabaseConfig|null{
  const rawUrl=env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey=env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if(!rawUrl||!anonKey)return null;
  let u:URL;
  try{u=new URL(rawUrl);}catch{return null;}
  const local=u.hostname==='localhost'||u.hostname==='127.0.0.1';
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&(local||env.NODE_ENV!=='production')))return null;
  if(u.username||u.password)return null;
  return {url:u.origin,anonKey};
}

export function requireSupabaseConfig(env:Record<string,string|undefined>=process.env):SupabaseConfig{
  const cfg=getSupabaseConfig(env);
  if(!cfg)throw new CatalogueError('not_configured','Supabase environment variables are missing or invalid.');
  return cfg;
}

/**
 * Explicit, opt-in fallback to the hardcoded products in lib/products.ts.
 * Only honoured when Supabase is NOT configured. It is never used to hide a connection or query failure.
 */
export function staticFallbackEnabled(env:Record<string,string|undefined>=process.env):boolean{
  return env.NEXA_CATALOGUE_FALLBACK?.trim().toLowerCase()==='static';
}
