import {afterEach,describe,expect,it,vi} from 'vitest';
import {languageStorageKey} from '../../shared/i18n';
import {readLanguagePreference,subscribeLanguagePreference} from './language-preference';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider,useLanguage} from '../components/language-provider';

afterEach(()=>vi.unstubAllGlobals());

describe('language preference external storage',()=>{
 it('keeps server rendering on the supplied language without reading browser storage',()=>{
  const getItem=vi.fn(()=> 'hi');vi.stubGlobal('localStorage',{getItem});
  function Preference(){const {locale,ready}=useLanguage();return createElement('span',null,`${locale}:${ready}`);}
  const html=renderToStaticMarkup(createElement(LanguageProvider,{initialLocale:'kn',children:createElement(Preference)}));
  expect(html).toBe('<span>kn:false</span>');expect(getItem).not.toHaveBeenCalled();
 });
 it('restores the existing stored preference without writing it',()=>{
  const getItem=vi.fn(()=> 'kn');vi.stubGlobal('localStorage',{getItem});
  expect(readLanguagePreference()).toBe('kn');expect(readLanguagePreference()).toBe('kn');
  expect(getItem).toHaveBeenCalledWith(languageStorageKey);
 });
 it('distinguishes hydrated empty storage from the null server snapshot',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>null});expect(readLanguagePreference()).toBe('');
 });
 it('reports blocked browser storage without throwing or writing',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');}});
  expect(readLanguagePreference()).toBe('!restore-error');
 });
 it('notifies on preference changes and clear, ignores other keys and unsubscribes',()=>{
  const target=new EventTarget(),notify=vi.fn();vi.stubGlobal('window',target);
  const unsubscribe=subscribeLanguagePreference(notify);
  const emit=(key:string|null)=>target.dispatchEvent(Object.assign(new Event('storage'),{key}));
  emit('unrelated');expect(notify).not.toHaveBeenCalled();
  emit(languageStorageKey);emit(null);expect(notify).toHaveBeenCalledTimes(2);
  unsubscribe();emit(languageStorageKey);expect(notify).toHaveBeenCalledTimes(2);
 });
});
