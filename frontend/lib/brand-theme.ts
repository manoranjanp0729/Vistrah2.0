import type {CSSProperties} from 'react';
import {accentPresets,themeProperties,type AccentPreset,type ThemeMode} from '../../shared/brand-theme';
import {defaultFontChoice,fontChoices,isFontChoice,webFontStack,type FontChoice,type FontLocale} from '../../shared/fonts';
export {accentPresets,defaultFontChoice,fontChoices,isFontChoice,webFontStack,type AccentPreset,type FontChoice};
export type AccentId=AccentPreset['id'];
export function themeVariables(mode:ThemeMode,accentId?:string,fontChoice:FontChoice=defaultFontChoice,locale:FontLocale='en'):CSSProperties{
  const stack=webFontStack(fontChoice,locale);
  return {
    ...themeProperties(mode,accentId),
    '--vistrah-font':stack,
    '--font-body':stack,
    '--font-display':stack,
  } as CSSProperties;
}
