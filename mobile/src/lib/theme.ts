import {createContext,createElement,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {Platform,StyleSheet} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_HOVER,
  BRAND_PRIMARY_INK,
  UNIFIED_RADII,
  accentPresets as sharedAccentPresets,
  defaultAccent,
  palettes,
  themeAppearance,
  type ThemePalette,
} from '../../../shared/brand-theme';

export type ThemeMode='light'|'dark';
export const accentPresets = sharedAccentPresets;
export type AccentPreset = (typeof accentPresets)[number];
export type AccentId = AccentPreset['id'];
type Palette = ThemePalette;

export {BRAND_PRIMARY, BRAND_PRIMARY_HOVER, BRAND_PRIMARY_INK, palettes};

export const tones=[
  {background:'#e6edfb',text:'#213c5b'},
  {background:'#fff1e6',text:'#9a3f00'},
  {background:'#e8e4f5',text:'#493a69'},
  {background:'#dfece3',text:'#294934'},
];

export const tabularNums = {fontVariant: ['tabular-nums'] as ('tabular-nums')[]};

// Normalized text hierarchy across phone-web and native screens so card geometry never shifts.
export const typography={
 title:{fontSize:24,lineHeight:30,fontWeight:'600',letterSpacing:-0.3},
 heading:{fontSize:18,lineHeight:24,fontWeight:'600',letterSpacing:-0.2},
 sectionHeading:{fontSize:18,lineHeight:24,fontWeight:'600',letterSpacing:-0.2},
 cardTitle:{fontSize:13,lineHeight:18,fontWeight:'600',letterSpacing:-0.1},
 body:{fontSize:14,lineHeight:21,fontWeight:'400',letterSpacing:0},
 supporting:{fontSize:12,lineHeight:18,fontWeight:'400',letterSpacing:0},
 label:{fontSize:10,lineHeight:14,letterSpacing:0.7},
 action:{fontSize:13,lineHeight:18,fontWeight:'600',letterSpacing:0},
 input:{fontSize:14,lineHeight:20},
 metric:{fontSize:16,lineHeight:22,fontWeight:'700',...tabularNums},
} as const;

// Unified radius scale: 8px controls/buttons/inputs, 12px cards/modals, 9999px pills/badges.
export const spacing={small:4,fieldGap:8,cardGap:6,elementGap:6,regular:12,controlPadding:14,pagePadding:16,pageGap:8,sectionGap:8,sectionPadding:12,pageBottom:16} as const;
export const radii={input:UNIFIED_RADII.control,action:UNIFIED_RADII.control,surface:UNIFIED_RADII.card,pill:UNIFIED_RADII.pill} as const;
export const controlHeights={compact:44,standard:50,multiline:120} as const;
export const layout={pageMaxWidth:900,borderWidth:1} as const;

const makeStyles=(colors:Palette)=>StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.pageGap,width:'100%',maxWidth:layout.pageMaxWidth,alignSelf:'center'},
  title:{...typography.title,color:colors.text},
  heading:{...typography.heading,color:colors.text},
  text:{...typography.body,color:colors.text},
  muted:{...typography.supporting,color:colors.muted},
  label:{...typography.label,color:colors.muted},
  card:{padding:spacing.pagePadding,borderRadius:radii.surface,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle,gap:spacing.cardGap},
  row:{flexDirection:'row',alignItems:'center',gap:spacing.regular,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.regular},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:layout.borderWidth,borderColor:colors.border,borderRadius:radii.input,padding:spacing.regular,...typography.input,minHeight:controlHeights.standard},
  divider:{height:layout.borderWidth,backgroundColor:colors.borderSubtle,marginVertical:spacing.small},
});

const key='vistrah.theme';
const accentKey='vistrah.theme.accent';
const webAccentFallbackKey='vistrah_accent';
let pending=Promise.resolve();

function setWebCookie(name:string,value:string){
  if(Platform.OS==='web'&&typeof document!=='undefined'){
    document.cookie=`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
}

function storeTheme(mode:ThemeMode){
  const write=pending.then(async()=>{
    if(Platform.OS==='web'){
      localStorage.setItem(key,mode);
      localStorage.setItem('vistrah_theme',mode);
      setWebCookie('vistrah_theme',mode);
    }else{
      await SecureStore.setItemAsync(key,mode);
    }
  });
  pending=write.catch(()=>{});
  return write;
}

function storeAccent(accent:string){
  const write=pending.then(async()=>{
    if(Platform.OS==='web'){
      localStorage.setItem(accentKey,accent);
      localStorage.setItem(webAccentFallbackKey,accent);
      setWebCookie('vistrah_accent',accent);
    }else{
      await SecureStore.setItemAsync(accentKey,accent);
    }
  });
  pending=write.catch(()=>{});
  return write;
}

type Theme={accentGradient:[string,string,string];headerGradient:[string,string,string];mode:ThemeMode;accent:string;setAccent:(accentId:string)=>void;colors:Palette;styles:ReturnType<typeof makeStyles>;ready:boolean;error:string;setMode:(mode:ThemeMode)=>void};
const Context=createContext<Theme|null>(null);

export function ThemeProvider({children}:{children:ReactNode}){
 const [mode,updateMode]=useState<ThemeMode>('light');
 const [accent,updateAccent]=useState<string>(defaultAccent);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  const restore=async()=>{
    try{
      const [savedMode,savedAccent]=await Promise.all([
        Platform.OS==='web'?(localStorage.getItem(key)??localStorage.getItem('vistrah_theme')):SecureStore.getItemAsync(key),
        Platform.OS==='web'?(localStorage.getItem(accentKey)??localStorage.getItem(webAccentFallbackKey)):SecureStore.getItemAsync(accentKey),
      ]);
      if(active&&(savedMode==='light'||savedMode==='dark'))updateMode(savedMode);
      if(active&&savedAccent&&accentPresets.some(p=>p.id===savedAccent))updateAccent(savedAccent);
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
   if(!accentPresets.some(p=>p.id===next))return;
   updateAccent(next);
   setError('');
   void storeAccent(next).catch(()=>setError('Theme changed, but could not be saved on this device.'));
 }

 return createElement(Context.Provider,{value:{mode,accent,setAccent,colors,styles,ready,error,setMode,accentGradient:appearance.gradient,headerGradient:appearance.headerGradient}},children);
}

export function useTheme(){const theme=useContext(Context);if(!theme)throw new Error('Missing ThemeProvider');return theme;}
