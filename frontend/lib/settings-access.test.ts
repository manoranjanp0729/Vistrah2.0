import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {LanguageProvider} from '../components/language-provider';
import {StandaloneSettings} from '../components/standalone-settings';
import {translate} from '../../shared/i18n';

for(const locale of ['en','kn','hi'] as const){
 it(`provides a labelled settings entry for standalone pages in ${locale} without opening it automatically`,()=>{
  const html=renderToStaticMarkup(createElement(LanguageProvider,{initialLocale:locale,children:createElement(StandaloneSettings)}));
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain(`aria-label="${translate(locale,'settings.title')}"`);
  expect(html).not.toContain('<dialog');
  expect(html).not.toContain('<select');
 });
}
