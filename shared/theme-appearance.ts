import theme from './brand-theme.json';
import ui from './ui-tokens.json';

export function mixColor(base:string,tint:string,amount:number){
 const channels=(value:string)=>value.slice(1).match(/.{2}/g)!.map(part=>parseInt(part,16));
 const a=channels(base),b=channels(tint);
 return '#'+a.map((value,index)=>Math.round(value+(b[index]-value)*amount).toString(16).padStart(2,'0')).join('');
}

export function themeAppearance(mode:'light'|'dark',accentId:string=theme.defaultAccent){
 const preset=theme.accentPresets.find(item=>item.id===accentId)??theme.accentPresets[0];
 const base=theme.palettes[mode],accent=preset[mode];
 const isDefaultTeal=preset.id==='teal';
 const accentHover=mode==='light'?(preset.hover??mixColor(accent,'#000000',.16)):mixColor(accent,'#000000',.14);
 const colors=isDefaultTeal
  ? {...base,accent,accentHover}
  : {
      ...base,
      accent,
      accentHover,
      soft:mixColor(base.surface,accent,mode==='light'?.08:.12),
      highlight:mixColor(base.surface,accent,mode==='light'?.13:.2),
      hover:mixColor(base.surface,accent,mode==='light'?.15:.24),
      tintBorder:mixColor(base.surface,accent,mode==='light'?.28:.35),
      tintText:mode==='light'?(preset.onWhite??accent):accent,
    };
 // Deep coastal anchor gradient retains crisp white-text contrast across modes.
 const gradient:[string,string,string]=[theme.gradient[0],theme.gradient[1],theme.gradient[2]];
 const headerGradient:[string,string,string]=isDefaultTeal
  ? (mode==='light'?[theme.headerLight[0],theme.headerLight[1],theme.headerLight[2]]:[theme.headerDark[0],theme.headerDark[1],theme.headerDark[2]])
  : [mixColor(base.background,accent,.08),mixColor(base.background,accent,.04),base.background];
 return {colors,gradient,headerGradient};
}

export function themeProperties(mode:'light'|'dark',accentId?:string){
 const resolvedId=accentId??theme.defaultAccent;
 const preset=theme.accentPresets.find(item=>item.id===resolvedId)??theme.accentPresets[0];
 const {colors:p,gradient,headerGradient}=themeAppearance(mode,resolvedId);
 return {
  '--page-background':p.background,'--surface':p.surface,'--border':p.border,'--secondary-border':p.tileBorder,
  '--control-height':`${ui.controlHeights.standard}px`,
  '--radius-input':`${ui.radii.input}px`,'--radius-card':`${ui.radii.surface}px`,
  '--page-max-width':`${ui.layout.pageMaxWidth}px`,
  '--page-gutter':`${ui.spacing.pagePadding}px`,'--section-gap':`${ui.spacing.sectionGap}px`,
  '--card-padding':`${ui.spacing.cardPadding}px`,
  '--ui-title':`${ui.typography.title/16}rem`,'--ui-heading':`${ui.typography.heading/16}rem`,
  '--ui-card-title':`${ui.typography.cardTitle/16}rem`,'--ui-body':`${ui.typography.body/16}rem`,
  '--ui-supporting':`${ui.typography.supporting/16}rem`,'--ui-action':`${ui.typography.action/16}rem`,
  '--ui-title-leading':'26px','--ui-heading-leading':'24px','--ui-card-leading':'20px',
  '--ui-body-leading':'19px','--ui-action-leading':'18px','--ui-supporting-leading':'16px',
  '--weight-regular':'400','--weight-medium':'500','--weight-semibold':'600',
  '--text-primary':p.text,'--text-secondary':p.muted,'--text-error':p.error,
  '--brand-teal':mode==='light'?'#0d9488':p.accent,
  '--brand-teal-hover':mode==='light'?'#0f766e':p.accentHover,
  '--brand-teal-deep':'#134e4a',
  '--brand-teal-anchor':'#115e59',
  '--brand-teal-tint':mode==='light'?'#f0fdfa':'rgba(13, 148, 136, 0.16)',
  '--brand-teal-border':mode==='light'?'#99f6e4':'rgba(45, 212, 191, 0.38)',
  '--brand-teal-border-soft':mode==='light'?'#ccfbf1':'rgba(45, 212, 191, 0.24)',
  '--brand-teal-ink':mode==='light'?'#115e59':'#99f6e4',
  '--accent-orange':p.accent,'--accent-hover':p.accentHover,'--button-ink':p.ink,
  '--accent-on-white':preset.onWhite??preset.light,
  '--brand-green-950':p.accent,'--brand-green-800':p.accentHover,'--brand-green-700':p.tintText,
  '--ivory':p.soft,'--surface-soft':p.soft,'--surface-hover':p.hover,
  '--header-background':p.background,'--footer-background':p.footer,'--tile-background':p.tile,'--tile-border':p.tileBorder,
  '--brand-highlight':p.highlight,
  '--brand-gradient':`linear-gradient(135deg,${gradient.join(',')})`,
  '--brand-header-gradient':`linear-gradient(120deg,${headerGradient.join(',')})`,
 };
}
