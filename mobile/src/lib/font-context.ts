import {createContext} from 'react';
import type {FontLocale,FontWeight} from './font-policy';
export const FontLocaleContext=createContext<FontLocale>('en');
export const TextWeightContext=createContext<FontWeight>(400);
