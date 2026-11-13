import base from './interface-copy.json';
import additions from './locales/en.json';
import kn from './locales/kn.json';
import hi from './locales/hi.json';

export type Locale='en'|'kn'|'hi';
export type Parameters=Record<string,string|number>;
export const languageStorageKey='vistrah.language';
export const languages=[{code:'en',label:'English'},{code:'kn',label:'ಕನ್ನಡ — Kannada'},{code:'hi',label:'हिन्दी — Hindi'}] as const;
export const translationVersion=1;
export function isLocale(value:unknown):value is Locale{return value==='en'||value==='kn'||value==='hi';}
function flatten(value:object,prefix=''):Record<string,string>{return Object.fromEntries(Object.entries(value).flatMap(([key,item])=>{const path=prefix?`${prefix}.${key}`:key;return typeof item==='string'?[[path,item]]:item&&typeof item==='object'?Object.entries(flatten(item,path)):[];}));}
export const english:Record<string,string>={...flatten(base),...additions};
// Draft translations are deliberately excluded from runtime bundles.
const dictionaries:Record<Locale,Record<string,string>>={en:english,kn,hi};
export function translate(locale:Locale,key:string,parameters:Parameters={},fallback?:string){
 const value=dictionaries[locale][key]||english[key]||fallback||key;
 return value.replace(/\{(\w+)\}/g,(token,name:string)=>parameters[name]===undefined?token:String(parameters[name]));
}
export function displayLabel(locale:Locale,id:string,fallback:string){return translate(locale,`taxonomy.${id}`,{},fallback);}
export function localizedCopy(locale:Locale):typeof base{
 function visit(value:unknown,prefix:string):unknown{if(typeof value==='string')return translate(locale,prefix,{},value);if(Array.isArray(value))return value.map((item,index)=>visit(item,`${prefix}.${index}`));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visit(item,prefix?`${prefix}.${key}`:key)]));return value;}
 return visit(base,'') as typeof base;
}
