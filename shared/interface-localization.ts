import {english,translate,type Locale} from './i18n';

const keys=new Map(Object.entries(english).map(([key,value])=>[value.replace(/\s+/g,' ').trim(),key]));
const templates=Object.entries(english).filter(([,value])=>/\{\w+\}/.test(value)&&/[A-Za-z]{2}/.test(value.replace(/\{\w+\}/g,''))).map(([key,value])=>{
 const names:string[]=[];
 const pattern=value.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{(\w+)\}/g,(_,name:string)=>{names.push(name);return '(.+?)';});
 return {key,names,pattern:new RegExp('^'+pattern+'$')};
});

// Only audited interface phrases are translated. Unknown/user-provided text is preserved.
export function translateInterface(locale:Locale,text:string):string{
 if(locale==='en'||!text.trim())return text;
 const value=text.replace(/\s+/g,' ').trim(),key=keys.get(value);
 const whitespace=(translated:string)=>(/^\s/.test(text)?' ':'')+translated+(/\s$/.test(text)?' ':'');
 if(key)return whitespace(translate(locale,key));
 for(const template of templates){
  const match=template.pattern.exec(value);
  if(match)return whitespace(translate(locale,template.key,Object.fromEntries(template.names.map((name,index)=>[name,match[index+1]]))));
 }
 return text;
}

export const interfaceProps=['label','title','subtitle','description','placeholder','accessibilityLabel','accessibilityHint','aria-label','badgeText','emptyTitle','emptyCopy','heading','guidance','action'] as const;
