import {Loader2} from 'lucide-react';
export default function Loading(){
  return <div role="status" className="flex min-h-dvh items-center justify-center bg-[#eeeaf8]"><span className="flex items-center gap-2 text-sm font-bold text-nexa-muted"><Loader2 className="animate-spin text-nexa-purple" size={20} aria-hidden="true"/> Loading preview…</span></div>;
}
