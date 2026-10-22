import {UiText,UiElement} from "../../components/localized-ui";
import {useLanguage} from '../../lib/language';
import {useState,type ReactNode,type ComponentProps} from 'react';
import {Pressable,Text,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {router} from 'expo-router';
import {Page,Action,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {useTheme} from '../../lib/theme';
import {LinearGradient} from 'expo-linear-gradient';

function FeatureBannerButton({
  title,
  subtitle,
  icon,
  badgeText,
  gradientColors,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Feather>['name'];
  badgeText: string;
  gradientColors: [string, string, string];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({pressed}) => ({
        borderRadius: 20,
        overflow: 'hidden',
        opacity: pressed ? 0.92 : 1,
        transform: [{scale: pressed ? 0.99 : 1}],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        shadowColor: '#503fbd',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 3,
      })}
    >
      <LinearGradient
        colors={gradientColors}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.20)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name={icon} size={22} color="#FFFFFF" />
        </View>
        <View style={{flex: 1, gap: 2}}>
          <Text style={{fontSize: 9, letterSpacing: 1.2, fontWeight: '700', color: '#f0e6ff', textTransform: 'uppercase'}}>
            <UiText value={badgeText}/>
          </Text>
          <Text style={{fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2}}>
            <UiText value={title}/>
          </Text>
          <Text numberOfLines={1} style={{fontSize: 12, color: '#eadaff', fontWeight: '500'}}>
            <UiText value={subtitle}/>
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="chevron-right" size={18} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Row({label,icon,onPress,external=false}:{label:string;icon:ComponentProps<typeof Feather>['name'];onPress:()=>void;external?:boolean}){const {colors,styles}=useTheme();return <UiElement as={Pressable} accessibilityRole="button" accessibilityLabel={label+(external?', opens website':'')} onPress={onPress} style={({pressed})=>({minHeight:54,padding:14,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:pressed?colors.background:colors.surface})}><Feather name={icon} size={18} color={colors.text}/><Text style={[styles.text,{flex:1,fontSize:13,lineHeight:18}]}><UiText value={label}/></Text><Feather name={external?'external-link':'chevron-right'} size={16} color={colors.muted}/></UiElement>;}
function Group({children}:{children:ReactNode}){const {colors}=useTheme();return <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,gap:1,backgroundColor:colors.border}}>{children}</View>;}
function Section({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){const {styles}=useTheme();return <View style={{gap:8}}><View style={{gap:2}}><Text accessibilityRole="header" style={styles.heading}><UiText value={title}/></Text><Text style={[styles.muted,{fontSize:12}]}><UiText value={subtitle}/></Text></View><Group>{children}</Group></View>;}

export default function Account(){const {colors,styles,accentGradient}=useTheme();const {copy,t}=useLanguage();
 const session=useSession(false);const sellerSession=useSession(true);const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function logout(){setBusy(true);setError('');try{await session.signOut();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const roleLabel=session.user?.role==='ADMIN'?'Administrator':'Customer';
 return <Page>
  <View style={{gap:10}}>
    <UiElement as={FeatureBannerButton}
      title="Membership Plan"
      subtitle="Explore plans & exclusive member benefits"
      badgeText="VISTRAH PREMIUM"
      icon="award"
      gradientColors={accentGradient}
      onPress={()=>router.push('/membership')}
      accessibilityLabel="Membership Plan, explore plans and exclusive member benefits"
    />
    <UiElement as={FeatureBannerButton}
      title="V Ads Studio"
      subtitle="Create, promote & track your video ads"
      badgeText="CREATOR STUDIO"
      icon="video"
      gradientColors={accentGradient}
      onPress={()=>router.push('/seller/v-ads')}
      accessibilityLabel="V Ads Studio, create, promote and track your video ads"
    />
  </View>
  {!session.ready?<Loading/>:session.user?<View style={[styles.card,{flexDirection:'row',alignItems:'center',gap:12}]}><Feather name="user" size={24} color={colors.text}/><View style={{flex:1,gap:4}}><Text style={styles.heading}>{session.user.name}</Text><Text style={[styles.muted,{fontSize:12}]}>{session.user.email} · <UiText value={roleLabel}/></Text></View></View>:<><Text style={styles.muted}><UiText value={copy.account.intro}/></Text><Action label={copy.account.signIn} onPress={()=>router.push('/auth')}/></>}
  {Boolean(error||session.error)&&<ErrorPanel error={error||session.error} retry={session.error?session.retry:undefined}/>}{Boolean(session.error)&&<UiElement as={Action} label={t('account.clearSignIn')} secondary disabled={busy} onPress={()=>void logout()}/>}
  <UiElement as={Section} title="My Account & Activity" subtitle="Profile, requests, orders, and preferences">
   {session.user&&<><Row label={copy.account.profile} icon="user" onPress={()=>router.push('/profile')}/><Row label={copy.nav.requests} icon="file-text" onPress={()=>router.push('/my-requests')}/></>}
   <UiElement as={Row} label={t('account.cart')} icon="shopping-cart" onPress={()=>router.push('/commerce/cart')}/>
   {session.user&&<UiElement as={Row} label={t('account.orders')} icon="shopping-bag" onPress={()=>router.push('/commerce/orders')}/>}
   {session.user&&<Row label={copy.account.history} icon="credit-card" onPress={()=>router.push('/payments')}/>}
   <UiElement as={Row} label={copy.nav.location} icon="map-pin" onPress={()=>router.push('/location')}/>
   <UiElement as={Row} label={t('settings.title')} icon="settings" onPress={()=>router.push('/settings')}/>
  </UiElement>
  <UiElement as={Section} title="Seller & Business Tools" subtitle={sellerSession.user?`Signed in as seller: ${sellerSession.user.name}`:"Sign in separately to manage your seller business"}>
   {<><Row label={copy.account.seller} icon="grid" onPress={()=>router.push('/seller')}/><UiElement as={Row} label="V Ads Studio" icon="video" onPress={()=>router.push('/seller/v-ads')}/><UiElement as={Row} label="+ Add services" icon="plus-circle" onPress={()=>router.push('/services')}/></>}
   <UiElement as={Row} label={t('account.jobs')} icon="briefcase" onPress={()=>router.push('/employer-jobs')}/>
  </UiElement>
  {session.user?.role==='ADMIN'&&<UiElement as={Section} title="Administration" subtitle="Platform operations, approvals and oversight"><Row label={copy.account.admin} icon="shield" onPress={()=>router.push('/admin-dashboard')}/></UiElement>}
  {session.user&&<UiElement as={Action} label={busy?t('account.signingOut'):copy.account.signOut} secondary disabled={busy} onPress={()=>void logout()}/>}
 </Page>;
}
