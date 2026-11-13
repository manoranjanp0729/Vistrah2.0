'use client';
import {createElement,type ComponentPropsWithRef,type ElementType,type ReactNode,type JSX} from 'react';
import {useLanguage} from './language-provider';
import {interfaceProps,translateInterface} from '../../shared/interface-localization';

export function UiText({value}:{value:ReactNode}){const {locale='en'}=useLanguage(true);return <>{typeof value==='string'?translateInterface(locale,value):value}</>;}
export function UiElement<T extends ElementType>({as,...props}:{as:T}&ComponentPropsWithRef<T>){
 const {locale='en'}=useLanguage(true);const localized={...props} as Record<string,unknown>;
 for(const key of interfaceProps)if(typeof localized[key]==='string')localized[key]=translateInterface(locale,localized[key]);
 return createElement(as,localized);
}

function localized<K extends keyof JSX.IntrinsicElements>(as:K){return function Localized(props:ComponentPropsWithRef<K>){const {locale="en"}=useLanguage(true);const translated={...props} as Record<string,unknown>;for(const key of interfaceProps)if(typeof translated[key]==="string")translated[key]=translateInterface(locale,translated[key]);return createElement(as,translated);};}
export const UiOl=localized("ol");
export const UiSection=localized("section");
export const UiDiv=localized("div");
export const UiInput=localized("input");
export const UiButton=localized("button");
export const UiNav=localized("nav");
export const UiProgress=localized("progress");
export const UiVideo=localized("video");
export const UiTextarea=localized("textarea");
export const UiSelect=localized("select");
export const UiSpan=localized("span");
