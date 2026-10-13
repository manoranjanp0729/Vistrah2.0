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
const makeStyles=(colors:Palette)=>StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:16,paddingBottom:28,gap:12,width:'100%',maxWidth:900,alignSelf:'center'},
  title:{fontSize:24,lineHeight:29,fontWeight:'600',color:colors.text},
  heading:{fontSize:18,lineHeight:23,fontWeight:'600',color:colors.text},
  text:{fontSize:14,lineHeight:20,color:colors.text},
  muted:{fontSize:12,lineHeight:18,color:colors.muted},
  label:{fontSize:10,lineHeight:14,letterSpacing:.7,color:colors.muted},
  card:{padding:16,borderRadius:20,backgroundColor:colors.surface,gap:10},
  row:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:12,fontSize:14,minHeight:50},
  divider:{height:1,backgroundColor:colors.border,marginVertical:4},
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

