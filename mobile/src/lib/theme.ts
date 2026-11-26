import {createContext,createElement,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {Platform,StyleSheet} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import brandTheme from '../../../shared/brand-theme.json';
import ui from '../../../shared/ui-tokens.json';
import {themeAppearance} from '../../../shared/theme-appearance';

export type ThemeMode='light'|'dark';
export const accentPresets = brandTheme.accentPresets;
export type AccentPreset = (typeof accentPresets)[number];
export type AccentId = AccentPreset['id'];
type Palette = typeof brandTheme.palettes.dark;
export type ThemeColors=ReturnType<typeof themeAppearance>['colors'];

export const tones=[{background:'#e6edfb',text:'#213c5b'},{background:'#f9e8d6',text:'#6d4524'},{background:'#eff6ff',text:'#0f294a'},{background:'#dfece3',text:'#294934'}];

// Shared text hierarchy across the phone website and native screens.
export const typography={
 title:{fontSize:ui.typography.title,lineHeight:29,letterSpacing:-0.6,fontWeight:'600'},
 heading:{fontSize:ui.typography.heading,lineHeight:22,letterSpacing:-0.45,fontWeight:'600'},
 sectionHeading:{fontSize:ui.typography.heading,lineHeight:22,letterSpacing:-0.45,fontWeight:'600'},
 cardTitle:{fontSize:ui.typography.cardTitle,lineHeight:22,letterSpacing:-0.21,fontWeight:'600'},
 body:{fontSize:ui.typography.body,lineHeight:21,fontWeight:'400'},
 supporting:{fontSize:ui.typography.supporting,lineHeight:18,fontWeight:'400'},
 label:{fontSize:10,lineHeight:14,letterSpacing:.6},
 action:{fontSize:ui.typography.action,lineHeight:18,fontWeight:'600'},
 input:{fontSize:14},
 tabular:{fontVariant:['tabular-nums']},
} as const;
// Strict 4pt/8pt spatial rhythm across mobile and phone-web surfaces.
// Keep control sizing and measured grid geometry independent.
export const {spacing,radii,controlHeights,layout}=ui;

const makeStyles=(colors:Palette)=>StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.pageGap,width:'100%',maxWidth:layout.pageMaxWidth,alignSelf:'center'},
  title:{...typography.title,color:colors.text},
  heading:{...typography.heading,color:colors.text},
  cardTitle:{...typography.cardTitle,color:colors.text},
  text:{...typography.body,color:colors.text},
  muted:{...typography.supporting,color:colors.muted},
  label:{...typography.label,color:colors.muted},
  tabular:{fontVariant:['tabular-nums']},
  card:{padding:spacing.cardPadding,borderRadius:radii.surface,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:spacing.cardGap},
  cardCompact:{padding:spacing.cardPaddingCompact,borderRadius:radii.surface,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:spacing.cardGap},
  row:{flexDirection:'row',alignItems:'center',gap:spacing.regular,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.regular},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:layout.borderWidth,borderColor:colors.border,borderRadius:radii.input,paddingVertical:10,paddingHorizontal:spacing.regular,...typography.input,minHeight:controlHeights.standard},
  divider:{height:layout.borderWidth,backgroundColor:colors.border,marginVertical:spacing.small},
});

const key='vistrah.theme';
const accentKey='vistrah.theme.accent';
let pending=Promise.resolve();
function storeTheme(mode:ThemeMode){const write=pending.then(async()=>{if(Platform.OS==='web')localStorage.setItem(key,mode);else await SecureStore.setItemAsync(key,mode);});pending=write.catch(()=>{});return write;}
function storeAccent(accent:string){const write=pending.then(async()=>{if(Platform.OS==='web')localStorage.setItem(accentKey,accent);else await SecureStore.setItemAsync(accentKey,accent);});pending=write.catch(()=>{});return write;}

type Theme={accentGradient:[string,string,string];headerGradient:[string,string,string];mode:ThemeMode;accent:string;setAccent:(accentId:string)=>void;colors:Palette;styles:ReturnType<typeof makeStyles>;ready:boolean;error:string;setMode:(mode:ThemeMode)=>void};
const Context=createContext<Theme|null>(null);

export function ThemeProvider({children}:{children:ReactNode}){
 const [mode,updateMode]=useState<ThemeMode>('light');
 const [accent,updateAccent]=useState<string>(brandTheme.defaultAccent);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  const restore=async()=>{
    try{
      const [savedMode,savedAccent]=await Promise.all([
        Platform.OS==='web'?localStorage.getItem(key):SecureStore.getItemAsync(key),
        Platform.OS==='web'?localStorage.getItem(accentKey):SecureStore.getItemAsync(accentKey),
      ]);
      if(active&&(savedMode==='light'||savedMode==='dark'))updateMode(savedMode);
      if(active&&savedAccent&&brandTheme.accentPresets.some(p=>p.id===savedAccent))updateAccent(savedAccent);
    }catch{
      if(active)setError('Could not restore your theme preference.');
    }finally{
      if(active)setReady(true);
    }
  };
  void restore();
  return ()=>{active=false;};
 },[]);

 const appearance=useMemo(()=>themeAppearance(mode,accent),[mode,accent]);
 const colors=appearance.colors;

 const styles=useMemo(()=>makeStyles(colors),[colors]);

 function setMode(next:ThemeMode){
   updateMode(next);
   setError('');
   void storeTheme(next).catch(()=>setError('Theme changed, but could not be saved on this device.'));
 }

 function setAccent(next:string){
   if(!brandTheme.accentPresets.some(p=>p.id===next))return;
   updateAccent(next);
   setError('');
   void storeAccent(next).catch(()=>setError('Theme changed, but could not be saved on this device.'));
 }

 return createElement(Context.Provider,{value:{mode,accent,setAccent,colors,styles,ready,error,setMode,accentGradient:appearance.gradient,headerGradient:appearance.headerGradient}},children);
}

export function useTheme(){const theme=useContext(Context);if(!theme)throw new Error('Missing ThemeProvider');return theme;}
