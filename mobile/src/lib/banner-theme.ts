import {accentPresets,useTheme} from './theme';
import {mixColor} from '../../../shared/theme-appearance';

// Opt-in palette for the five requested banners; other brand gradients stay intact.
export function useBannerTheme(){
 const {mode,accent}=useTheme();
 const base=(accentPresets.find(preset=>preset.id===accent)??accentPresets[1]).light;
 const depth=mode==='dark'?.22:0;
 const primary=mixColor(base,'#071a3d',depth);
 const gradient:[string,string,string]=[mixColor(primary,'#071a3d',.24),primary,mixColor(primary,'#071a3d',.12)];
 return {gradient,glow:mixColor(base,'#ffffff',.35),shadow:base,text:'#ffffff',muted:'#ffffffe6'};
}
