export type FontLocale = 'en' | 'kn' | 'hi';
export type FontWeight = 400 | 500 | 600 | 700;

/**
 * Five selectable Latin display/UI fonts normalized against Inter's advance width
 * so wider geometric faces (e.g., Montserrat ~0.94x) match Inter's horizontal
 * footprint without wrapping compact badges or pills.
 */
export const fontChoices = [
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', opticalScale: 0.94, sizeAdjust: '94%' },
  { id: 'inter', label: 'Inter', family: 'Inter', opticalScale: 1, sizeAdjust: '100%' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', opticalScale: 0.95, sizeAdjust: '95%' },
  { id: 'nunito', label: 'Nunito', family: 'Nunito', opticalScale: 0.98, sizeAdjust: '98%' },
  { id: 'dm-sans', label: 'DM Sans', family: 'DMSans', opticalScale: 0.99, sizeAdjust: '99%' },
] as const;

export type FontChoice = (typeof fontChoices)[number]['id'];

export const fontPreferenceKey = 'vistrah.font';

export function isFontChoice(value: unknown): value is FontChoice {
  return fontChoices.some(font => font.id === value);
}

export function fontOpticalScale(choice: FontChoice = 'montserrat', locale: FontLocale = 'en'): number {
  if (locale !== 'en') return 1;
  return fontChoices.find(font => font.id === choice)?.opticalScale ?? 1;
}

export function compensateFontSize(
  fontSize: number | undefined,
  choice: FontChoice = 'montserrat',
  locale: FontLocale = 'en',
): number | undefined {
  if (typeof fontSize !== 'number' || !Number.isFinite(fontSize)) return fontSize;
  const scale = fontOpticalScale(choice, locale);
  if (scale === 1) return fontSize;
  return Math.round(fontSize * scale * 100) / 100;
}

export const typographyMetrics = {
  trackingPageTitle: '-0.025em',
  trackingCardTitle: '-0.015em',
  trackingPageTitleRatio: -0.025,
  trackingCardTitleRatio: -0.015,
  lineHeightHeading: 1.2,
  lineHeightBody: 1.5,
  numericTabular: 'tabular-nums',
  fontFeatureTabular: '"tnum"',
} as const;

export const spatialRhythm = {
  pagePaddingMobile: 16,
  pagePaddingDesktop: 24,
  cardPaddingCompact: 16,
  cardPaddingStandard: 20,
  cardRadius: 12,
  inputRadius: 8,
  sectionGap: 24,
  feedGap: 12,
  buttonHeight: 44,
  pillHeight: 36,
} as const;
