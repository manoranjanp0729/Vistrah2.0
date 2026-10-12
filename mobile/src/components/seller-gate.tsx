import {useState,type ReactNode} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Action,Loading,ErrorPanel} from './ui';
import {api} from '../lib/api';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export function SellerGate({children}:{children:ReactNode}){
  const session=useSession();const {styles}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function enable(){setBusy(true);setError('');try{await api('/auth/seller/enable',{method:'POST'});await session.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(!session.ready)return <Loading/>;
  if(!session.user)return <><Text style={styles.muted}>Use one VISTRAH account for customer, seller and employer access. Customer membership is not required to offer services or post jobs.</Text><Action label="Sign in as seller / employer" onPress={()=>router.push({pathname:'/auth',params:{mode:'seller'}})}/><Action label="Create seller / employer account" secondary onPress={()=>router.push({pathname:'/auth',params:{mode:'seller',register:'1'}})}/></>;
  if(!session.user.seller_enabled)return <><Text style={styles.muted}>Keep your existing account and enable seller/employer access. Each business and service still needs its own approval.</Text>{Boolean(error)&&<ErrorPanel error={error}/>}<Action label="Enable seller / employer access" disabled={busy} onPress={()=>void enable()}/></>;
  return <View key={session.user.id} style={{gap:16}}>{children}</View>;
}
