import {Linking} from 'react-native';
import {validateBase} from './api';
export async function openWebsite(path:string) {
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('..'))throw new Error('Invalid website path.');
  const base=validateBase(process.env.EXPO_PUBLIC_WEB_URL??'',__DEV__);
  // Tokens and credentials are never placed in a URL or shared with the browser.
  await Linking.openURL(base+path);
}
