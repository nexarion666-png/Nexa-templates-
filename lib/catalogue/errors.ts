/**
 * The ways the catalogue can fail, kept distinct so the UI can tell visitors the truth
 * without leaking internals:
 *  - not_configured : Supabase environment variables are missing/invalid
 *  - connection     : the database could not be reached (network, DNS, timeout)
 *  - schema         : the `templates` table / columns are missing (migration not run)
 *  - query          : the database answered with an error (permissions, bad data, server error)
 * "Empty catalogue" and "template not found" are NOT errors: they are an empty array / null.
 */
export type CatalogueErrorCode='not_configured'|'connection'|'schema'|'query';

export class CatalogueError extends Error{
  readonly code:CatalogueErrorCode;
  constructor(code:CatalogueErrorCode,message:string){
    super(message);
    this.name='CatalogueError';
    this.code=code;
  }
}
