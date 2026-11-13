import MapView,{Marker,PROVIDER_GOOGLE} from 'react-native-maps';
import type {GooglePoint} from '../../../shared/google-location';

export function GoogleLocationMap({point,onPin,disabled=false}:{point:GooglePoint;onPin:(point:GooglePoint)=>void;disabled?:boolean}){
 return <MapView style={{height:260,width:'100%'}} provider={PROVIDER_GOOGLE} region={{...point,latitudeDelta:.04,longitudeDelta:.04}} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false} onPress={event=>{if(!disabled)onPin(event.nativeEvent.coordinate);}}><Marker coordinate={point} draggable={!disabled} onDragEnd={event=>{if(!disabled)onPin(event.nativeEvent.coordinate);}}/></MapView>;
}
