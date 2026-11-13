import {BannerGeometry} from './banner-geometry';
import {useBannerTheme} from '../lib/banner-theme';
import {Text,TextInput} from './typography';
import {UiText,UiElement} from "./localized-ui";
import brandTheme from '../../../shared/brand-theme.json';
import {useLanguage} from '../lib/language';
import type {ReactNode} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,View,type TextInputProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {router} from 'expo-router';
import {useTheme,typography,spacing,radii,controlHeights,layout} from '../lib/theme';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import type {Membership} from '../lib/catalogue';
export function Page({children,title,gradientColors,sectioned=false}:{children:ReactNode;title?:string;gradientColors?:[string,string,string];sectioned?:boolean}){const {styles}=useTheme();return <SafeAreaView edges={['left','right','bottom']} style={styles.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,sectioned&&{gap:spacing.sectionGap}]}>{Boolean(title)&&<PageTitle title={title!} gradientColors={gradientColors}/>}{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;}
export function PageTitle({title,gradientColors}:{title:string;gradientColors?:[string,string,string]}){const {accentGradient}=useTheme();return <LinearGradient colors={gradientColors??accentGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{padding:20,borderRadius:22,gap:8}}><Text style={{fontSize:10,letterSpacing:1.5,fontWeight:'700',color:'#eee4ff'}}>VISTRAH</Text><Text accessibilityRole="header" style={{...typography.title,color:'#fff'}}><UiText value={title}/></Text></LinearGradient>;}
export function Action({label,onPress,secondary=false,disabled=false,onColor=false,auth=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;onColor?:boolean;auth?:boolean}) {const {colors,accent}=useTheme();const banner=useBannerTheme();const colorInk=brandTheme.accentPresets.find(p=>p.id===accent)?.light??colors.accent;
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:controlHeights.standard,padding:spacing.controlPadding,borderRadius:radii.action,alignItems:'center',justifyContent:'center',backgroundColor:onColor?'#fff':secondary?colors.soft:colors.accent,opacity:disabled?.5:pressed?.9:1,transform:[{scale:pressed&&!disabled?.99:1}],borderWidth:layout.borderWidth,borderColor:onColor?'#fff':colors.accent,shadowColor:auth?banner.shadow:colors.accent,shadowOffset:{width:0,height:pressed?2:4},shadowOpacity:disabled?0:secondary?.04:.16,shadowRadius:8,elevation:disabled?0:secondary?1:3})}>
    {auth&&!secondary&&!onColor&&<LinearGradient pointerEvents="none" colors={banner.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,left:0,right:0,bottom:0,borderRadius:radii.action}}><BannerGeometry compact/></LinearGradient>}
    <Text style={{color:onColor?colorInk:secondary?colors.accent:auth?banner.text:colors.ink,...typography.action,textAlign:'center'}}><UiText value={label}/></Text>
  </Pressable>;
}
export function Field({label,hideLabel=false,...props}:TextInputProps&{label:string;hideLabel?:boolean}){const {styles,colors}=useTheme();return <View style={{gap:spacing.fieldGap}}>{!hideLabel&&<Text style={styles.muted}><UiText value={label}/></Text>}<UiElement as={TextInput} accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input,props.multiline?{minHeight:controlHeights.multiline,textAlignVertical:'top'}:null,props.style]}/></View>;}
export function Loading(){const {colors,styles}=useTheme();const {t}=useLanguage();return <UiElement as={View} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} style={{padding:24}}><ActivityIndicator color={colors.accent}/><Text style={[styles.muted,{textAlign:'center',marginTop:12}]}>{t('common.loading')}</Text></UiElement>;}
export function ErrorPanel({error,retry}:{error:Error|string;retry?:()=>void}){const {colors,styles}=useTheme();const {t}=useLanguage();return <View style={styles.card}><Text accessibilityRole="alert" style={{color:colors.error,lineHeight:19}}><UiText value={typeof error==='string'?error:error.message}/></Text>{retry&&<UiElement as={Action} label={t('common.retry')} onPress={retry} secondary/>}</View>;}
export function Heading({title,action,onPress}:{title:string;action?:string;onPress?:()=>void}){const {styles}=useTheme();return <View style={[styles.row,{justifyContent:'space-between'}]}><Text accessibilityRole="header" style={[styles.heading,{flex:1},typography.sectionHeading]}><UiText value={title}/></Text>{Boolean(action)&&onPress&&<Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:controlHeights.compact,justifyContent:'center'}}><Text style={styles.muted}>{action} →</Text></Pressable>}</View>;}
export function MemberGate({children}:{children:ReactNode}){const {styles}=useTheme();const {copy}=useLanguage();
  const {user,ready}=useSession();const membership=useResource<Membership>(user?'/me/membership':null,user?.id??null);
  if(!ready)return <Loading/>;
  if(!user)return <View style={styles.card}><Text style={styles.heading}><UiText value={copy.service.signIn}/></Text><Text style={styles.muted}><UiText value={copy.service.signInCopy}/></Text><UiElement as={Action} auth label="Sign in" onPress={()=>router.push('/auth')}/></View>;
  if(membership.error)return <ErrorPanel error={membership.error} retry={membership.retry}/>;
  if(!membership.data)return <Loading/>;
  if(!membership.data.active)return <View style={styles.card}><Text style={styles.heading}><UiText value={copy.service.membership}/></Text><Text style={styles.muted}><UiText value={copy.service.membershipCopy}/></Text><Action label={copy.service.exploreMembership} onPress={()=>router.push('/membership')}/></View>;
  return <>{children}</>;
}


export function SelectionFill({selected,radius=12,colors}:{selected:boolean;radius?:number;colors?:[string,string,string]}){const {colors:themeColors,accent}=useTheme();const fill=(brandTheme.accentPresets.find(p=>p.id===accent)?.light??themeColors.accent);return selected?<LinearGradient pointerEvents="none" colors={colors??[fill,fill,fill]} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,left:0,right:0,bottom:0,borderRadius:radius}}/>:null;}
