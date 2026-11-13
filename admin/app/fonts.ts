import localFont from 'next/font/local';

// Separate italic faces allow the browser to fetch them only when used.
// next/font emits local, hashed assets and metric-adjusted fallback faces.
export const inter = localFont({
  src: './fonts/InterVariable.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

export const interItalic = localFont({
  src: './fonts/InterVariable-Italic.woff2',
  weight: '100 900',
  style: 'italic',
  variable: '--font-inter-italic',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
});

export const dmSerif = localFont({
  src: './fonts/DMSerifDisplay-Regular.ttf',
  weight: '400',
  style: 'normal',
  variable: '--font-dm-serif',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

export const dmSerifItalic = localFont({
  src: './fonts/DMSerifDisplay-Italic.ttf',
  weight: '400',
  style: 'italic',
  variable: '--font-dm-serif-italic',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});
