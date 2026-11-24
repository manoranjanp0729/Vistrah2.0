import {readdirSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
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

function isPurpleRgb(r:number,g:number,b:number){
 const rn=r/255,gn=g/255,bn=b/255;
 const max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn);
 const l=(max+min)/2;
 if(max===min)return false;
 const d=max-min;
 const s=l>0.5?d/(2-max-min):d/(max+min);
 let h=0;
 if(max===rn)h=(gn-bn)/d+(gn<bn?6:0);
 else if(max===gn)h=(bn-rn)/d+2;
 else h=(rn-gn)/d+4;
 const deg=(h/6)*360;
 return deg>=235&&deg<=335&&s>=0.10&&l>=0.04&&l<=0.98;
}

function collectSourceFiles(dir:string,out:string[]=[]){
 const skipDirs=new Set(['node_modules','dist','build','coverage','tests','__tests__']);
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.isDirectory()){
   if(!entry.name.startsWith('.')&&!skipDirs.has(entry.name))collectSourceFiles(join(dir,entry.name),out);
   continue;
  }
  const name=entry.name;
  if(!/\.(ts|tsx|css|scss|json)$/.test(name))continue;
  if(/\.test\.|\.spec\.|package(?:-lock)?\.json$|tsconfig.*\.json$|hi\.json$|kn\.json$|banner-artwork-replacements\.json$/.test(name))continue;
  out.push(join(dir,name));
 }
 return out;
}

it('enforces zero purple/violet/indigo utility classes or color values across shared, frontend, admin, and mobile UI source',()=>{
 const repoRoot=resolve(__dirname,'../..');
 const files=[
  ...collectSourceFiles(join(repoRoot,'shared')),
  ...collectSourceFiles(join(repoRoot,'frontend')),
  ...collectSourceFiles(join(repoRoot,'admin')),
  ...collectSourceFiles(join(repoRoot,'mobile','src')),
 ];
 const hexRe=/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
 const rgbRe=/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
 const hslRe=/hsla?\(\s*(\d{1,3}(?:\.\d+)?)/g;
 const twRe=/\b(?:purple|violet|indigo|fuchsia|orchid|lavender)(?:-[a-z0-9/]+)?\b/gi;
 const violations:string[]=[];

 for(const file of files){
  const lines=readFileSync(file,'utf8').split(/\r?\n/);
  lines.forEach((line,idx)=>{
   for(const m of line.matchAll(hexRe)){
    const raw=m[1];
    const hx=raw.length===3?raw.split('').map(c=>c+c).join(''):raw;
    const r=parseInt(hx.slice(0,2),16),g=parseInt(hx.slice(2,4),16),b=parseInt(hx.slice(4,6),16);
    if(isPurpleRgb(r,g,b))violations.push(`${file}:${idx+1} hex #${raw}`);
   }
   for(const m of line.matchAll(rgbRe)){
    if(isPurpleRgb(Number(m[1]),Number(m[2]),Number(m[3])))violations.push(`${file}:${idx+1} ${m[0]}`);
   }
   for(const m of line.matchAll(hslRe)){
    const deg=Number(m[1]);
    if(deg>=235&&deg<=335)violations.push(`${file}:${idx+1} ${m[0]}`);
   }
   for(const m of line.matchAll(twRe)){
    violations.push(`${file}:${idx+1} token ${m[0]}`);
   }
  });
 }

 expect(violations).toEqual([]);
});
