import {Platform} from 'react-native';
export const googleMapsEnabled=Platform.OS==='web'
 ? Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY)
 : Platform.OS==='android'&&process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED==='1';
