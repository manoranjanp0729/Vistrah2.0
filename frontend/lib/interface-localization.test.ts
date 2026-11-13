import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {english,translate,type Locale} from '../../shared/i18n';
import kn from '../../shared/locales/kn.json';
import hi from '../../shared/locales/hi.json';
import {translateInterface} from '../../shared/interface-localization';
import {LanguageProvider} from '../components/language-provider';
import {UiButton,UiInput,UiText} from '../components/localized-ui';
import auditedPhrases from '../../scripts/interface-phrases.json';

describe('shared mobile and website interface translations',()=>{
 it('keeps every audited phrase in the local dictionaries',()=>{
  const values=new Set(Object.values(english));
  for(const phrase of auditedPhrases)expect(values.has(phrase),phrase).toBe(true);
 });
 for(const locale of ['kn','hi'] as const){
  it(`${locale} covers every English interface key and preserves substitutions`,()=>{
   const dictionary:Record<string,string>=locale==='kn'?kn:hi;
   for(const [key,value] of Object.entries(english)){
    expect(dictionary[key],key).toBeTruthy();
    if(!key.startsWith('interface.'))continue;
    expect(dictionary[key],key).not.toMatch(/ZXQ\d+QXZ/);
    expect([...dictionary[key].matchAll(/\{\w+\}/g)].map(match=>match[0]).sort(),key).toEqual([...value.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort());
   }
  });
  it(`${locale} preserves unknown user content and translates known controls`,()=>{
   for(const text of ['Manoranjan Kumar','My bespoke service','Sample customer text 123','123 456','A: B'])expect(translateInterface(locale,text)).toBe(text);
   expect(translateInterface(locale,'Login/Signup as seller')).not.toBe('Login/Signup as seller');
   expect(translateInterface(locale,'  Login/Signup as seller ')).toBe(' '+translateInterface(locale,'Login/Signup as seller')+' ');
  });
  it(`${locale} renders translated text and accessible form labels`,()=>{
   const markup=renderToStaticMarkup(createElement(LanguageProvider,{initialLocale:locale,children:createElement('div',null,
    createElement(UiButton,{type:'submit',disabled:true,children:createElement(UiText,{value:'Login/Signup as seller'})}),
    createElement(UiInput,{name:'name',placeholder:'Search records', 'aria-label':'Search records',defaultValue:'Manoranjan Kumar'}))}));
   expect(markup).toContain('disabled');
   expect(markup).toContain('value="Manoranjan Kumar"');
   expect(markup).not.toContain('Search records');
   expect(markup).not.toContain('Login/Signup as seller');
  });
 }
 it('keeps English and substitutes parameters without translating their values',()=>{
  expect(translateInterface('en','Login/Signup as seller')).toBe('Login/Signup as seller');
  const item=Object.entries(english).find(([,text])=>text==='Approved provider for request {value0}')!;
  for(const locale of ['kn','hi'] as Locale[]){
   expect(translateInterface(locale,'Approved provider for request customer-123')).toBe(translate(locale,item[0],{value0:'customer-123'}));
  }
 });
});
