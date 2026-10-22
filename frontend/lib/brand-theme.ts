import type {CSSProperties} from 'react';
import theme from '../../shared/brand-theme.json';
import {themeProperties} from '../../shared/theme-appearance';
export const accentPresets=theme.accentPresets;
export type AccentPreset=(typeof accentPresets)[number];
export type AccentId=AccentPreset['id'];
export function themeVariables(mode:'light'|'dark',accentId?:string):CSSProperties{return themeProperties(mode,accentId) as CSSProperties;}
