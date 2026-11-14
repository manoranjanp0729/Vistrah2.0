import {BRAND_PRIMARY_INK,accentPresets,palettes,useTheme} from './theme';
import {mixColor} from '../../../shared/theme-appearance';

// Opt-in palette for the five requested banners; other brand gradients stay intact.
export function useBannerTheme(){
 const {mode,accent}=useTheme();
 const base=(accentPresets.find(preset=>preset.id===accent)??accentPresets[1]).light;
 const depth=mode==='dark'?.22:0;
 const primary=mixColor(base,palettes.dark.surface,depth);
 const gradient:[string,string,string]=[mixColor(primary,palettes.dark.surface,.24),primary,mixColor(primary,palettes.dark.surface,.12)];
 return {gradient,glow:mixColor(base,BRAND_PRIMARY_INK,.35),shadow:base,text:BRAND_PRIMARY_INK,muted:palettes.dark.muted};
}
