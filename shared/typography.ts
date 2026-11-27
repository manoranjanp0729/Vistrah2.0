/**
 * Centralized Swiggy/Myntra consumer-app typography scale for VISTRAH.
 * Allowed weights: 400 (Regular), 500 (Medium), and max 600 (SemiBold for headers).
 * Heavy bold weights (700, 800, 900, 'bold') are prohibited across all surfaces.
 */

export type AllowedFontWeight = '400' | '500' | '600';

export type TypographyToken = {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: AllowedFontWeight;
};

export type CaptionTypographyToken = TypographyToken & {
  readonly minFontSize: 11;
  readonly maxFontSize: 12;
  readonly mediumWeight: '500';
};

export const screenTitle: TypographyToken = {
  fontSize: 20,
  lineHeight: 26,
  fontWeight: '600',
} as const;

export const sectionTitle: TypographyToken = {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '600',
} as const;

export const cardTitle: TypographyToken = {
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '500',
} as const;

export const body: TypographyToken = {
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '400',
} as const;

export const control: TypographyToken = {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '500',
} as const;

export const caption: CaptionTypographyToken = {
  fontSize: 12,
  minFontSize: 11,
  maxFontSize: 12,
  lineHeight: 16,
  fontWeight: '400',
  mediumWeight: '500',
} as const;

export const typographyTokens = {
  screenTitle,
  sectionTitle,
  cardTitle,
  body,
  control,
  caption,
} as const;
