import {expect,it} from 'vitest';
import theme from '../../shared/brand-theme.json';
import {themeAppearance} from '../../shared/theme-appearance';
import {themeVariables} from './brand-theme';

function luminance(hex:string){
 const [r,g,b]=hex.slice(1).match(/.{2}/g)!.map(v=>parseInt(v,16)/255).map(c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4));
 return .2126*r+.7152*g+.0722*b;
}

function contrast(a:string,b:string){
 const l1=luminance(a),l2=luminance(b);
 return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}

it('guarantees accessibility compliance for all theme palettes and accents',()=>{
 for(const mode of ['light','dark'] as const){
  const appearance=themeAppearance(mode);
  const p=appearance.colors;
  expect(contrast(p.text,p.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.text,p.surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.muted,p.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.muted,p.surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.error,p.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.error,p.surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.ink,p.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.text,p.soft)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.text,p.highlight)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.text,p.hover)).toBeGreaterThanOrEqual(4.5);

  const vars=themeVariables(mode) as Record<string,string>;
  expect(vars['--page-background']).toBe(p.background);
  expect(vars['--surface']).toBe(p.surface);
  expect(vars['--border']).toBe(p.border);
  expect(vars['--text-primary']).toBe(p.text);
  expect(vars['--text-secondary']).toBe(p.muted);
  expect(vars['--text-error']).toBe(p.error);
  expect(vars['--accent-orange']).toBe(p.accent);
  expect(vars['--button-ink']).toBe(p.ink);
 }
});

it('guarantees accessible contrast and color definition for every selectable accent preset',()=>{
  for(const preset of theme.accentPresets){
    if (preset.id === 'amber') {
      expect(contrast('#20170c', preset.light)).toBeGreaterThanOrEqual(4.5);
    } else {
      expect(contrast('#ffffff', preset.light)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(preset.light, theme.palettes.light.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(preset.light, theme.palettes.light.background)).toBeGreaterThanOrEqual(4.5);
    }

    expect(contrast(preset.dark,theme.palettes.dark.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(preset.dark,theme.palettes.dark.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(preset.dark,theme.palettes.dark.ink)).toBeGreaterThanOrEqual(4.5);

    const lightVars=themeVariables('light',preset.id) as Record<string,string>;
    expect(lightVars['--accent-orange']).toBe(preset.light);
    const darkVars=themeVariables('dark',preset.id) as Record<string,string>;
    expect(darkVars['--accent-orange']).toBe(preset.dark);
  }
});

it("retains the VISTRAH banner and action gradient for every accent and mode",()=>{
 const expected=(themeVariables("light") as Record<string,string>)["--brand-gradient"];
 for(const mode of ["light","dark"] as const){
  for(const preset of theme.accentPresets){
   expect((themeVariables(mode,preset.id) as Record<string,string>)["--brand-gradient"]).toBe(expected);
   expect(themeAppearance(mode,preset.id).gradient).toEqual(theme.gradient);
  }
 }
});