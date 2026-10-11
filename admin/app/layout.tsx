import type {Metadata} from 'next';

import './globals.css';
import './reference-theme.css';
import 'leaflet/dist/leaflet.css';
import {inter,interItalic,dmSerif,dmSerifItalic} from './fonts';
export const metadata:Metadata={title:{default:`VISTRAH Admin`,template:'%s | VISTRAH'},description:'VISTRAH administration'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en" className={`${inter.variable} ${interItalic.variable} ${dmSerif.variable} ${dmSerifItalic.variable}`}><body>{children}</body></html>;}

