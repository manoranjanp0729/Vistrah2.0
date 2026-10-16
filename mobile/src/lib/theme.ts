import {createContext,createElement,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {Platform,StyleSheet} from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type ThemeMode='light'|'dark';
const palettes={
 dark:{background:'#000000',surface:'#222222',border:'#343434',text:'#fafafa',muted:'#b8b8b8',accent:'#f9aa45',ink:'#20170c',error:'#ff9f96',tile:'rgba(32,33,36,0.70)',tileBorder:'rgba(237,237,238,0.10)'},
 light:{background:'#f7f7f8',surface:'#ffffff',border:'#d9dce1',text:'#202124',muted:'#5b626c',accent:'#f9aa45',ink:'#20170c',error:'#a42e25',tile:'rgba(218,221,226,0.70)',tileBorder:'rgba(32,33,36,0.10)'},
};
type Palette=typeof palettes.dark;
export const tones=[{background:'#e6edfb',text:'#213c5b'},{background:'#f9e8d6',text:'#6d4524'},{background:'#e8e4f5',text:'#493a69'},{background:'#dfece3',text:'#294934'}];
// Existing visual values only; component headings retain their Android-specific sizing.
export const typography={
 title:{fontSize:24,lineHeight:29,fontWeight:'600'},
 heading:{fontSize:18,lineHeight:23,fontWeight:'600'},
 sectionHeading:{fontSize:Platform.OS==='android'?22:18,lineHeight:Platform.OS==='android'?28:23,fontWeight:'600'},
 body:{fontSize:14,lineHeight:20},
 supporting:{fontSize:12,lineHeight:18},
 label:{fontSize:10,lineHeight:14,letterSpacing:.7},
 action:{fontSize:Platform.OS==='android'?14:13,fontWeight:'600'},
 input:{fontSize:14},
} as const;
export const spacing={small:4,fieldGap:8,cardGap:10,regular:12,controlPadding:14,pagePadding:16,pageBottom:28} as const;
export const radii={input:14,action:17,surface:20} as const;
export const controlHeights={compact:44,standard:50,multiline:120} as const;
export const layout={pageMaxWidth:900,borderWidth:1} as const;
const makeStyles=(colors:Palette)=>StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.regular,width:'100%',maxWidth:layout.pageMaxWidth,alignSelf:'center'},
  title:{...typography.title,color:colors.text},
  heading:{...typography.heading,color:colors.text},
  text:{...typography.body,color:colors.text},
  muted:{...typography.supporting,color:colors.muted},
  label:{...typography.label,color:colors.muted},
  card:{padding:spacing.pagePadding,borderRadius:radii.surface,backgroundColor:colors.surface,gap:spacing.cardGap},
  row:{flexDirection:'row',alignItems:'center',gap:spacing.regular,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.regular},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:layout.borderWidth,borderColor:colors.border,borderRadius:radii.input,padding:spacing.regular,...typography.input,minHeight:controlHeights.standard},
  divider:{height:layout.borderWidth,backgroundColor:colors.border,marginVertical:spacing.small},
});

const key='vistrah.theme';
let pending=Promise.resolve();
function storeTheme(mode:ThemeMode){const write=pending.then(async()=>{if(Platform.OS==='web')localStorage.setItem(key,mode);else await SecureStore.setItemAsync(key,mode);});pending=write.catch(()=>{});return write;}
type Theme={mode:ThemeMode;colors:Palette;styles:ReturnType<typeof makeStyles>;ready:boolean;error:string;setMode:(mode:ThemeMode)=>void};
const Context=createContext<Theme|null>(null);
export function ThemeProvider({children}:{children:ReactNode}){
 const [mode,updateMode]=useState<ThemeMode>('light'),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;const restore=async()=>{try{const saved=Platform.OS==='web'?localStorage.getItem(key):await SecureStore.getItemAsync(key);if(active&&(saved==='light'||saved==='dark'))updateMode(saved);}catch{if(active)setError('Could not restore your theme preference.');}finally{if(active)setReady(true);}};void restore();return()=>{active=false;};},[]);
 const colors=palettes[mode];const styles=useMemo(()=>makeStyles(colors),[colors]);
 function setMode(next:ThemeMode){updateMode(next);setError('');void storeTheme(next).catch(()=>setError('Theme changed, but could not be saved on this device.'));}
 return createElement(Context.Provider,{value:{mode,colors,styles,ready,error,setMode}},children);
}
export function useTheme(){const theme=useContext(Context);if(!theme)throw new Error('Missing ThemeProvider');return theme;}

