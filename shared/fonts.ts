export type FontLocale = 'en' | 'kn' | 'hi';
export type FontWeight = 400 | 500 | 600 | 700;

export const fontChoices = [
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', webFamily: "'Vistrah Montserrat'" },
  { id: 'inter', label: 'Inter', family: 'Inter', webFamily: "'Vistrah Inter'" },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', webFamily: "'Vistrah Poppins'" },
  { id: 'nunito', label: 'Nunito', family: 'Nunito', webFamily: "'Vistrah Nunito'" },
  { id: 'dm-sans', label: 'DM Sans', family: 'DMSans', webFamily: "'Vistrah DM Sans'" },
] as const;

export type FontChoice = (typeof fontChoices)[number]['id'];
export const defaultFontChoice: FontChoice = 'montserrat';
export const fontPreferenceKey = 'vistrah.font';
export const fontPreferenceCookie = 'vistrah_font';

export function isFontChoice(value: unknown): value is FontChoice {
  return fontChoices.some((font) => font.id === value);
}

export const fontFamilies = {
  en: 'Montserrat',
  kn: 'NotoSansKannada',
  hi: 'NotoSansDevanagari',
} as const;

export const weightNames = {
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
} as const;

export const fontLoadingCopy = {
  en: { error: 'VISTRAH could not load its fonts.', retry: 'Retry', loading: 'Loading fonts' },
  kn: { error: 'ಫಾಂಟ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ.', retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', loading: 'ಫಾಂಟ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ' },
  hi: { error: 'फ़ॉन्ट लोड नहीं हो सके।', retry: 'फिर से कोशिश करें', loading: 'फ़ॉन्ट लोड हो रहे हैं' },
} as const;

export const NORMALIZED_TYPOGRAPHY = {
  leadingDisplay: 1.15,
  leadingHeading: 1.25,
  leadingCard: 1.35,
  leadingBody: 1.55,
  leadingUi: 1.4,
  trackingHeading: '-0.015em',
  trackingBody: '0em',
  trackingLabel: '0.06em',
  numericVariant: 'tabular-nums',
} as const;

export function standardWeight(
  value: string | number | undefined,
  inherited: FontWeight = 400
): FontWeight {
  if (value === undefined) return inherited;
  if (value === 'bold') return 700;
  if (value === 'normal') return 400;
  const numeric = Number(value);
  return numeric >= 650 ? 700 : numeric >= 550 ? 600 : numeric >= 450 ? 500 : 400;
}

export function fontFace(
  locale: FontLocale,
  weight: FontWeight,
  choice: FontChoice = 'montserrat'
): string {
  const family =
    locale === 'en'
      ? fontChoices.find((font) => font.id === choice)?.family ?? fontFamilies.en
      : fontFamilies[locale];
  return `${family}_${weight}${weightNames[weight]}`;
}

export function isStandardFamily(family: string | undefined): boolean {
  return !family || ['System', 'sans-serif', 'serif'].includes(family);
}

export function webFontStack(
  choice: FontChoice = 'montserrat',
  locale: FontLocale = 'en'
): string {
  if (locale === 'kn') {
    return "'Vistrah Kannada', 'Vistrah Montserrat', system-ui, sans-serif";
  }
  if (locale === 'hi') {
    return "'Vistrah Devanagari', 'Vistrah Montserrat', system-ui, sans-serif";
  }
  const selected =
    fontChoices.find((font) => font.id === choice) ?? fontChoices[0];
  return `${selected.webFamily}, 'Vistrah Kannada', 'Vistrah Devanagari', system-ui, -apple-system, sans-serif`;
}
