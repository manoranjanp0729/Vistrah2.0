import type {CSSProperties} from 'react';
import theme from '../../shared/brand-theme.json';
import {themeProperties} from '../../shared/theme-appearance';
export const defaultAccent=theme.defaultAccent;
export const accentPresets=theme.accentPresets;
export type AccentPreset=(typeof accentPresets)[number];
export type AccentId=AccentPreset['id'];
export function themeVariables(mode:'light'|'dark',accentId?:string):CSSProperties{
  return {
    ...themeProperties(mode,accentId),
    '--hairline':mode==='dark'?'rgba(255, 255, 255, 0.08)':'rgba(15, 23, 42, 0.08)',
    '--font-feature-tnum':'"tnum"',
  } as CSSProperties;
}
