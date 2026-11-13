import {LanguageSettings,T} from '@/components/language-provider';
import {ThemeSettings} from '@/components/theme-provider';
export default function Settings(){return <div className="container page replica-page"><h1><T id="settings.title"/></h1><LanguageSettings/><ThemeSettings/></div>;}
