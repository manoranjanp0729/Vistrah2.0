import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {Image,Linking,Platform,View} from 'react-native';
import {Action} from './ui';
import {useTheme} from '../lib/theme';
import {previewTiles,type GeoPoint} from '../lib/maptiler';
export const maptilerKey=Platform.OS==='web'?(process.env.EXPO_PUBLIC_MAPTILER_WEB_API_KEY??''):(process.env.EXPO_PUBLIC_MAPTILER_API_KEY??'');
export const mapHeaders:Record<string,string>=Platform.OS==='web'?{}:{'User-Agent':'Vistrah-Mobile-2.0'};
export function LocationPreview({point}:{point:GeoPoint}){
 const {colors,styles}=useTheme();const [width,setWidth]=useState(300),[zoom,setZoom]=useState(14),[error,setError]=useState('');
 if(!maptilerKey)return <Text style={styles.muted}><UiText value={"Live maps need a configured MapTiler key. Manual location still works."}/></Text>;
 const tiles=previewTiles(point,width,220,zoom);

 return <View style={{gap:8}}><UiElement as={View} onLayout={event=>setWidth(event.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel="Map preview centred on your selected location" style={{height:220,overflow:'hidden',borderRadius:16,backgroundColor:colors.surface}}>{tiles.map(tile=><Image key={`${zoom}/${tile.x}/${tile.y}`} source={{uri:`https://api.maptiler.com/maps/streets-v4/256/${zoom}/${tile.x}/${tile.y}.png?key=${encodeURIComponent(maptilerKey)}`,headers:mapHeaders}} onError={()=>setError('Map tiles could not load. Check your map key and connection.')} style={{position:'absolute',left:tile.left,top:tile.top,width:256,height:256}}/>)}<View pointerEvents="none" style={{position:'absolute',left:width/2-10,top:100,width:20,height:20,borderRadius:10,backgroundColor:colors.accent,borderWidth:3,borderColor:'#fff'}}/></UiElement><View style={styles.row}><Text accessibilityRole="link" onPress={()=>void Linking.openURL('https://www.maptiler.com/copyright/').catch(()=>setError('Could not open attribution.'))} style={[styles.muted,{fontSize:10}]}><UiText value={"© MapTiler"}/></Text><Text accessibilityRole="link" onPress={()=>void Linking.openURL('https://www.openstreetmap.org/copyright').catch(()=>setError('Could not open attribution.'))} style={[styles.muted,{fontSize:10}]}><UiText value={"© OpenStreetMap contributors"}/></Text></View><View style={styles.row}><UiElement as={Action} label="Zoom in" secondary disabled={zoom>=18} onPress={()=>{setError('');setZoom(value=>value+1);}}/><UiElement as={Action} label="Zoom out" secondary disabled={zoom<=2} onPress={()=>{setError('');setZoom(value=>value-1);}}/></View><Text style={styles.muted}><UiText value={"Preview pin follows your selected location. Adjust coordinates and choose Use this location to move the pin."}/></Text>{Boolean(error)&&<Text accessibilityRole="alert" style={{color:colors.error}}><UiText value={error}/></Text>}</View>;
}
