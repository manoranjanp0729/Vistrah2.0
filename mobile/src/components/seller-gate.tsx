import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState,type ReactNode} from 'react';
import {Pressable,View} from 'react-native';
import {Redirect,router,usePathname} from 'expo-router';
import {Action,Heading,Loading,ErrorPanel} from './ui';
import {api} from '../lib/api';
import {useSession} from '../lib/session';
import {isSellerUser} from '../lib/types';
import {useTheme} from '../lib/theme';
import {legalVersion,sellerLegalCopy} from '../../../shared/legal';

export function SellerOnboardingCard({description="Keep your existing account and complete seller onboarding or register your business to manage listings, orders, and V Ads.",onEnabled}:{description?:string;onEnabled?:()=>void}){
  const session=useSession();const {styles,colors}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [termsAccepted,setTermsAccepted]=useState(false),[marketingConsent,setMarketingConsent]=useState(false);
  async function enable(){
    if(!termsAccepted){setError(sellerLegalCopy.required);return;}
    setBusy(true);setError('');
    try{
      await api('/auth/seller/enable',{method:'POST',body:JSON.stringify({privacy_policy_version:legalVersion,marketing_consent:marketingConsent})});
      await session.refresh();
      onEnabled?.();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <View style={styles.card}>
    <UiElement as={Heading} title="Complete Seller Onboarding / Register Business"/>
    <Text style={styles.muted}><UiText value={description}/></Text>
    {Boolean(error)&&<ErrorPanel error={error}/>}
    <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
      <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityState={{checked:termsAccepted,disabled:busy}} disabled={busy} onPress={()=>setTermsAccepted(v=>!v)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{termsAccepted?'\u2713':''}</Text></View></UiElement>
      <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>
        <UiText value={"I accept Vistrah India Pvt Limited’s Seller "}/>
        <Text accessibilityRole="link" onPress={()=>router.push('/terms')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Terms"}/></Text>{', '}
        <Text accessibilityRole="link" onPress={()=>router.push('/privacy')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Privacy Policy"}/></Text>{', & '}
        <Text accessibilityRole="link" onPress={()=>router.push('/grievance-officer')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Grievance Policy"}/></Text>
      </Text>
    </View>
    <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
      <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityState={{checked:marketingConsent,disabled:busy}} disabled={busy} onPress={()=>setMarketingConsent(v=>!v)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{marketingConsent?'\u2713':''}</Text></View></UiElement>
      <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>{sellerLegalCopy.marketing}</Text>
    </View>
    <UiElement as={Action} label="List your business (3 easy steps)" disabled={busy} onPress={()=>router.push('/seller/onboard')}/>
    <UiElement as={Action} label={busy?'Enabling…':'Enable V Ads / Employer access only'} secondary disabled={busy||!termsAccepted} onPress={()=>void enable()}/>
  </View>;
}
export function SellerGate({children,nextPath}:{children:ReactNode;nextPath?:string}){
  const session=useSession();const pathname=usePathname();
  const target=nextPath||(pathname?.startsWith('/seller')&&pathname!=='/seller'?pathname:'/seller/onboard');
  if(!session.ready)return <Loading/>;
  if(!session.user)return <Redirect href={{pathname:'/auth',params:{next:target}}}/>;
  if(!isSellerUser(session.user))return <Redirect href={target.startsWith('/seller/onboard')?(target as '/seller/onboard'):'/seller/onboard'}/>;
  return <View key={session.user.id} style={{gap:16}}>{children}</View>;
}
