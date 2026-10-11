import type {Metadata} from 'next';
import {positioning} from '@/lib/positioning';
import './globals.css';
import './reference-theme.css';
import 'leaflet/dist/leaflet.css';
import {inter,interItalic,dmSerif,dmSerifItalic} from './fonts';
export const metadata:Metadata={title:{default:`VISTRAH — ${positioning.descriptor}`,template:'%s | VISTRAH'},description:positioning.description};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en" className={`${inter.variable} ${interItalic.variable} ${dmSerif.variable} ${dmSerifItalic.variable}`}><body>{children}</body></html>;}

