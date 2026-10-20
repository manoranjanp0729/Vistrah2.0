import {Linking} from 'react-native';
import {validateBase} from './api';
import {adminTaskGroups} from '../../../shared/admin-dashboard';
export async function openAdminDashboard(section=''){
  if(section&&!adminTaskGroups.some(group=>group.items.some(item=>item.slug===section)))throw new Error('Unknown admin tool.');
  let configured=process.env.EXPO_PUBLIC_ADMIN_URL;
  if(!configured&&!__DEV__)throw new Error('The admin dashboard address is not configured.');
  if(!configured){const fallback=new URL(validateBase(process.env.EXPO_PUBLIC_WEB_URL??'',__DEV__));fallback.port='3200';configured=fallback.origin;}
  const base=validateBase(configured,__DEV__);
  // Only the independent admin app opens externally; no session is shared.
  await Linking.openURL(base+'/admin'+(section?'/'+section:''));
}
