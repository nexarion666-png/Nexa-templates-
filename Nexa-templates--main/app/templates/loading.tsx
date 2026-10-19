export default function Loading(){
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14" role="status" aria-label="Loading templates">
    <div className="h-48 animate-pulse rounded-[28px] bg-violet-100/70"/>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-80 animate-pulse rounded-[22px] bg-white ring-1 ring-violet-100"/>)}</div>
  </div>;
}
