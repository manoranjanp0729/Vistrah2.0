import {cookies} from 'next/headers';
import {ThemeProvider} from '@/components/theme-provider';
import type {Metadata} from 'next';
import {positioning} from '@/lib/positioning';
import './globals.css';
import './reference-theme.css';
import 'leaflet/dist/leaflet.css';
import {inter,interItalic,dmSerif,dmSerifItalic} from './fonts';
export const metadata:Metadata={title:{default:`VISTRAH — ${positioning.descriptor}`,template:'%s | VISTRAH'},description:positioning.description};
export default async function RootLayout({children}:{children:React.ReactNode}) {const mode=(await cookies()).get('vistrah_theme')?.value==='light'?'light':'dark';return <html lang="en" data-theme={mode} className={`${inter.variable} ${interItalic.variable} ${dmSerif.variable} ${dmSerifItalic.variable}`}><body><ThemeProvider initialMode={mode}>{children}</ThemeProvider></body></html>;}

