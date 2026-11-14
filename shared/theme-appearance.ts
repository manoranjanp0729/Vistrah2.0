import theme from './brand-theme.json';

export function mixColor(base:string,tint:string,amount:number){
 const channels=(value:string)=>value.slice(1).match(/.{2}/g)!.map(part=>parseInt(part,16));
 const a=channels(base),b=channels(tint);
 return '#'+a.map((value,index)=>Math.round(value+(b[index]-value)*amount).toString(16).padStart(2,'0')).join('');
}

export function themeAppearance(mode:'light'|'dark',accentId:string=theme.defaultAccent){
 const preset=theme.accentPresets.find(item=>item.id===accentId)??theme.accentPresets[1];
 const base=theme.palettes[mode],accent=preset[mode];
 const colors={...base,accent,soft:mixColor(base.surface,accent,mode==='light'?.08:.12),highlight:mixColor(base.surface,accent,mode==='light'?.13:.2),hover:mixColor(base.surface,accent,mode==='light'?.17:.25)};
 // Saturated gradients retain white-text contrast, including when dark mode uses pale accents.
 const gradient:[string,string,string]=[theme.gradient[0],theme.gradient[1],theme.gradient[2]];
 const headerGradient:[string,string,string]=[mixColor(base.background,accent,.08),mixColor(base.background,accent,.04),base.background];
 return {colors,gradient,headerGradient};
}

export function themeProperties(mode:'light'|'dark',accentId?:string){
 const {colors:p,gradient,headerGradient}=themeAppearance(mode,accentId);
 return {
  '--page-background':p.background,'--surface':p.surface,'--border':p.border,
  '--text-primary':p.text,'--text-secondary':p.muted,'--text-error':p.error,
  '--accent-orange':p.accent,'--button-ink':p.ink,
  '--accent-on-white':(theme.accentPresets.find(item=>item.id===(accentId??theme.defaultAccent))??theme.accentPresets[1]).light,
  '--brand-green-950':p.accent,'--brand-green-800':p.accent,'--brand-green-700':p.accent,
  '--ivory':p.soft,'--surface-soft':p.soft,'--surface-hover':p.hover,
  '--header-background':p.background,'--footer-background':p.footer,'--tile-background':p.tile,'--tile-border':p.tileBorder,
  '--brand-highlight':p.highlight,
  '--brand-gradient':`linear-gradient(135deg,${gradient.join(',')})`,
  '--brand-header-gradient':`linear-gradient(120deg,${(accentId?headerGradient:mode==='light'?theme.headerLight:theme.headerDark).join(',')})`,
 };
}
