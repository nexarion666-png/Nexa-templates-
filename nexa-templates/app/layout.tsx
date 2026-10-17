import type {Metadata} from 'next'; import './globals.css'; import {SiteHeader} from '@/components/site-header'; import {SiteFooter} from '@/components/site-footer';
export const metadata:Metadata={title:{default:'Nexa Templates — Websites that make an impression',template:'%s | Nexa Templates'},description:'Discover colorful website template concepts for startups, businesses, and creators.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>}
