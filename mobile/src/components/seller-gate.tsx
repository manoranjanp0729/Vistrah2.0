import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState,type ReactNode} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Action,Loading,ErrorPanel} from './ui';
import {api} from '../lib/api';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export function SellerGate({children,nextPath}:{children:ReactNode;nextPath?:string}){
  const session=useSession(true);const {styles}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function enable(){setBusy(true);setError('');try{await api('/auth/seller/enable',{method:'POST'});await session.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(!session.ready)return <Loading/>;
  if(!session.user)return <><Text style={styles.muted}><UiText value={"Sign in separately as a seller or employer. Your customer session stays independent. Customer membership is not required to offer services or post jobs."}/></Text><UiElement as={Action} auth label="Sign in as seller / employer" onPress={()=>router.push({pathname:'/auth',params:{mode:'seller',next:nextPath}})}/><UiElement as={Action} auth label="Create seller / employer account" secondary onPress={()=>router.push({pathname:'/auth',params:{mode:'seller',register:'1',next:nextPath}})}/></>;
  if(!session.user.seller_enabled)return <><Text style={styles.muted}><UiText value={"Keep your existing account and enable seller/employer access. Each business and service still needs its own approval."}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}<UiElement as={Action} label="Enable seller / employer access" disabled={busy} onPress={()=>void enable()}/></>;
  return <View key={session.user.id} style={{gap:16}}>{children}</View>;
}
