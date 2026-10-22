import {createElement,type ComponentPropsWithRef,type ElementType,type ReactNode} from 'react';
import {useLanguage} from '../lib/language';
import {interfaceProps,translateInterface} from '../../../shared/interface-localization';

export function UiText({value}:{value:ReactNode}){const {locale='en'}=useLanguage();return <>{typeof value==='string'?translateInterface(locale,value):value}</>;}
export function UiElement<T extends ElementType>({as,...props}:{as:T}&ComponentPropsWithRef<T>){
 const {locale='en'}=useLanguage();const localized={...props} as Record<string,unknown>;
 for(const key of interfaceProps)if(typeof localized[key]==='string')localized[key]=translateInterface(locale,localized[key]);
 return createElement(as,localized);
}
