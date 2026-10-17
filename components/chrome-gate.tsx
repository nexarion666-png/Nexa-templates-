'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';

/** Hides the marketplace header/footer on /demo/* so previews get the full screen. */
export function ChromeGate({children}:{children:ReactNode}){
  const pathname=usePathname();
  if(pathname&&(pathname==='/demo'||pathname.startsWith('/demo/')))return null;
  return <>{children}</>;
}
