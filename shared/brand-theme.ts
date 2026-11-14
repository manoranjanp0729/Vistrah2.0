import theme from './brand-theme.json';

export type ThemeMode = 'light' | 'dark';
export const BRAND_PRIMARY = '#FF6B00';
export const BRAND_PRIMARY_HOVER = '#E05A00';
export const BRAND_PRIMARY_INK = '#FFFFFF';
export const BRAND_PRIMARY_SOFT = 'rgba(255,107,0,0.14)';

export const SEMANTIC_DARK_SURFACES = {
  canvas: '#08080D',
  surface: '#071426',
  elevated: '#0D213F',
  borderSubtle: 'rgba(255,255,255,0.08)',
} as const;

export const UNIFIED_RADII = {
  control: 8,
  card: 12,
  pill: 9999,
} as const;

export const accentPresets = theme.accentPresets;
export type AccentPreset = (typeof accentPresets)[number];
export type AccentId = AccentPreset['id'];
export const defaultAccent = theme.defaultAccent;
export const brandTheme = theme;
export type ThemePalette = ReturnType<typeof themeAppearance>['colors'];

export function mixColor(base: string, tint: string, amount: number): string {
  const channels = (value: string) =>
    value
      .slice(1)
      .match(/.{2}/g)!
      .map((part) => parseInt(part, 16));
  const a = channels(base);
  const b = channels(tint);
  return (
    '#' +
    a
      .map((value, index) =>
        Math.round(value + (b[index] - value) * amount)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

export function themeAppearance(
  mode: ThemeMode,
  accentId: string = theme.defaultAccent
) {
  const preset =
    theme.accentPresets.find((item) => item.id === accentId) ??
    theme.accentPresets[1];
  const base = theme.palettes[mode];
  const accent = preset[mode];
  const colors = {
    ...base,
    accent,
    brandPrimary: BRAND_PRIMARY,
    brandPrimaryHover: BRAND_PRIMARY_HOVER,
    brandPrimaryInk: BRAND_PRIMARY_INK,
    brandPrimarySoft: BRAND_PRIMARY_SOFT,
    soft: mixColor(base.surface, accent, mode === 'light' ? 0.08 : 0.12),
    highlight: mixColor(base.surface, accent, mode === 'light' ? 0.13 : 0.2),
    hover: mixColor(base.surface, accent, mode === 'light' ? 0.17 : 0.25),
  };
  const gradient: [string, string, string] = [
    theme.gradient[0],
    theme.gradient[1],
    theme.gradient[2],
  ];
  const headerGradient: [string, string, string] =
    mode === 'dark'
      ? ['#071426', mixColor('#0D213F', accent, 0.08), '#08080D']
      : [
          mixColor(base.background, accent, 0.07),
          mixColor(base.background, accent, 0.03),
          base.background,
        ];
  return { colors, gradient, headerGradient };
}

export const palettes: Record<ThemeMode, ThemePalette> = {
  light: themeAppearance('light').colors,
  dark: themeAppearance('dark').colors,
};

export function themeProperties(mode: ThemeMode, accentId?: string) {
  const { colors: p, gradient, headerGradient } = themeAppearance(mode, accentId);
  const preset =
    theme.accentPresets.find(
      (item) => item.id === (accentId ?? theme.defaultAccent)
    ) ?? theme.accentPresets[1];
  return {
    '--bg-canvas': mode === 'dark' ? SEMANTIC_DARK_SURFACES.canvas : p.background,
    '--bg-surface': mode === 'dark' ? SEMANTIC_DARK_SURFACES.surface : p.surface,
    '--bg-elevated': mode === 'dark' ? SEMANTIC_DARK_SURFACES.elevated : p.elevated,
    '--border-subtle':
      mode === 'dark' ? SEMANTIC_DARK_SURFACES.borderSubtle : p.borderSubtle,
    '--brand-primary': BRAND_PRIMARY,
    '--brand-primary-hover': BRAND_PRIMARY_HOVER,
    '--brand-primary-ink': BRAND_PRIMARY_INK,
    '--brand-primary-soft': BRAND_PRIMARY_SOFT,
    '--interactive-accent': p.accent,
    '--interactive-ink': p.ink,
    '--radius-control': `${UNIFIED_RADII.control}px`,
    '--radius-card': `${UNIFIED_RADII.card}px`,
    '--radius-pill': `${UNIFIED_RADII.pill}px`,
    '--radius-sm': `${UNIFIED_RADII.control}px`,
    '--radius-md': `${UNIFIED_RADII.card}px`,
    '--radius-lg': `${UNIFIED_RADII.card}px`,
    '--page-background': p.background,
    '--surface': p.surface,
    '--border': p.border,
    '--text-primary': p.text,
    '--text-secondary': p.muted,
    '--text-muted': p.muted,
    '--text-error': p.error,
    '--accent-orange': p.accent,
    '--button-ink': p.ink,
    '--accent-on-white': preset.light,
    '--brand-green-950': p.accent,
    '--brand-green-800': p.accent,
    '--brand-green-700': p.accent,
    '--ivory': p.elevated,
    '--surface-soft': p.elevated,
    '--surface-hover': p.hover,
    '--header-background': mode === 'dark' ? SEMANTIC_DARK_SURFACES.surface : p.background,
    '--footer-background': p.footer,
    '--tile-background': p.tile,
    '--tile-border': p.tileBorder,
    '--brand-highlight': p.highlight,
    '--brand-gradient': `linear-gradient(135deg,${gradient.join(',')})`,
    '--brand-header-gradient': `linear-gradient(120deg,${(
      accentId
        ? headerGradient
        : mode === 'light'
        ? theme.headerLight
        : theme.headerDark
    ).join(',')})`,
  };
}
