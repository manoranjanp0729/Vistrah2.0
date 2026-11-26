import {Text,TextInput} from './typography';
import {UiText,UiElement} from "./localized-ui";
import brandTheme from '../../../shared/brand-theme.json';
import {useLanguage} from '../lib/language';
import type {ReactNode} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,View,useWindowDimensions,type TextInputProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {router,usePathname,useGlobalSearchParams,type Href} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {useTheme,typography,spacing,radii,controlHeights,layout} from '../lib/theme';
import {backFallback} from '../lib/navigation-policy';
import {isMobileTabRootPath,shouldShowMainHeader} from '../../../shared/header-visibility';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import type {Membership} from '../lib/catalogue';
export function Page({children,title,gradientColors,sectioned=false,hideBack=false}:{children:ReactNode;title?:string;gradientColors?:[string,string,string];sectioned?:boolean;hideBack?:boolean}){const {styles,colors}=useTheme();const {t}=useLanguage();const pathname=usePathname(),params=useGlobalSearchParams();const {width}=useWindowDimensions();const horizontalPadding=width>=768?spacing.pagePaddingDesktop:spacing.pagePadding;const hasTopHeader=shouldShowMainHeader(pathname);const showInlineBack=!hideBack&&!isMobileTabRootPath(pathname);const edges=hasTopHeader?(['left','right','bottom'] as const):(['top','left','right','bottom'] as const);return <SafeAreaView edges={edges} style={styles.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingHorizontal:horizontalPadding},sectioned&&{gap:spacing.sectionGap}]}>{showInlineBack&&<Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={()=>router.canGoBack()?router.back():router.replace(backFallback(pathname,params) as Href)} style={({pressed})=>({alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,minHeight:controlHeights.standard,paddingVertical:spacing.small,opacity:pressed?0.72:1})}><Feather name="arrow-left" size={17} color={colors.accent}/><Text style={{color:colors.accent,fontWeight:'600',fontSize:13.5}}>{t('common.back')}</Text></Pressable>}{Boolean(title)&&<PageTitle title={title!} gradientColors={gradientColors}/>}{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;}
export function PageTitle({title}:{title:string;gradientColors?:[string,string,string]}){const {styles}=useTheme();return <View style={{gap:spacing.fieldGap,paddingBottom:spacing.regular}}><Text accessibilityRole="header" style={styles.title}><UiText value={title}/></Text></View>;}
export function Action({label,onPress,secondary=false,disabled=false,onColor=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;onColor?:boolean;auth?:boolean}) {const {colors}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:controlHeights.standard,padding:spacing.controlPadding,borderRadius:radii.action,alignItems:'center',justifyContent:'center',backgroundColor:secondary||onColor?colors.surface:colors.accent,opacity:disabled?.5:pressed?.85:1,borderWidth:layout.borderWidth,borderColor:secondary||onColor?colors.border:colors.accent})}>
  <Text style={{color:secondary||onColor?colors.text:colors.ink,...typography.action,textAlign:'center'}}><UiText value={label}/></Text>
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
