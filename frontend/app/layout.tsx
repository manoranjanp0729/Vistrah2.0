import {cookies} from 'next/headers';
import {LanguageProvider} from '@/components/language-provider';
import {isLocale} from '../../shared/i18n';
import {ThemeProvider} from '@/components/theme-provider';
import {StandaloneSettings} from '@/components/standalone-settings';
import {themeVariables} from '@/lib/brand-theme';
import type {Metadata} from 'next';
import {positioning} from '@/lib/positioning';
import './globals.css';
import './reference-theme.css';
import 'leaflet/dist/leaflet.css';
import {inter,interItalic,dmSerif,dmSerifItalic} from './fonts';
export const metadata:Metadata={title:{default:`VISTRAH — ${positioning.descriptor}`,template:'%s | VISTRAH'},description:positioning.description};
export default async function RootLayout({children}:{children:React.ReactNode}) {const saved=await cookies();const mode=saved.get('vistrah_theme')?.value==='dark'?'dark':'light';const preference=saved.get('vistrah_language')?.value;const locale=isLocale(preference)?preference:'en';return <html lang={locale} data-theme={mode} style={themeVariables(mode,saved.get('vistrah_accent')?.value??'indigo')} className={`${inter.variable} ${interItalic.variable} ${dmSerif.variable} ${dmSerifItalic.variable}`}><body><LanguageProvider initialLocale={locale}><ThemeProvider initialMode={mode}><StandaloneSettings/>{children}</ThemeProvider></LanguageProvider></body></html>;}


