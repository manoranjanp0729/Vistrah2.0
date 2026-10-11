import {Switch,Text,View} from 'react-native';
import {Page,Heading} from '../components/ui';
import {useTheme} from '../lib/theme';
export default function Settings(){
 const {mode,setMode,colors,styles,ready,error}=useTheme();
 return <Page><Heading title="Settings"/><View style={[styles.card,styles.row,{justifyContent:'space-between'}]}><View style={{gap:4,flex:1}}><Text style={styles.text}>Dark theme</Text><Text style={styles.muted}>{mode==='dark'?'Dark':'Light'}</Text></View><Switch accessibilityLabel="Dark theme" value={mode==='dark'} disabled={!ready} onValueChange={enabled=>setMode(enabled?'dark':'light')} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#ffffff"/></View>{Boolean(error)&&<Text accessibilityRole="alert" style={{color:colors.error}}>{error}</Text>}</Page>;
}
