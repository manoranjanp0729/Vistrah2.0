import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState,type ReactNode} from 'react';
import {View} from 'react-native';
import {Redirect,router,usePathname} from 'expo-router';
import {Action,Heading,Loading,ErrorPanel} from './ui';
import {api} from '../lib/api';
import {useSession} from '../lib/session';
import {isSellerUser} from '../lib/types';
import {useTheme} from '../lib/theme';
export function SellerOnboardingCard({description="Keep your existing account and complete seller onboarding or register your business to manage listings, orders, and V Ads.",onEnabled}:{description?:string;onEnabled?:()=>void}){
  const session=useSession();const {styles}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function enable(){setBusy(true);setError('');try{await api('/auth/seller/enable',{method:'POST'});await session.refresh();onEnabled?.();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <View style={styles.card}><UiElement as={Heading} title="Complete Seller Onboarding / Register Business"/><Text style={styles.muted}><UiText value={description}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}<UiElement as={Action} label={busy?'Enabling…':'Complete seller onboarding'} disabled={busy} onPress={()=>void enable()}/><UiElement as={Action} label="Register business" secondary disabled={busy} onPress={()=>router.push('/provider-applications/new')}/></View>;
}
export function SellerGate({children,nextPath}:{children:ReactNode;nextPath?:string}){
  const session=useSession();const pathname=usePathname();
  const target=nextPath||(pathname?.startsWith('/seller')?pathname:'/seller');
  if(!session.ready)return <Loading/>;
  if(!session.user)return <Redirect href={{pathname:'/auth',params:{next:target}}}/>;
  if(!isSellerUser(session.user))return <SellerOnboardingCard/>;
  return <View key={session.user.id} style={{gap:16}}>{children}</View>;
}
