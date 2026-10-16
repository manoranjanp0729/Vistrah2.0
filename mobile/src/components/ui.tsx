import {useLanguage} from '../lib/language';
import type {ReactNode} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,TextInput,View,type TextInputProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {useTheme,typography,spacing,radii,controlHeights,layout} from '../lib/theme';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import type {Membership} from '../lib/catalogue';
export function Page({children}:{children:ReactNode}){const {styles}=useTheme();return <SafeAreaView edges={['left','right','bottom']} style={styles.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;}
export function Action({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}) {const {colors}=useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:controlHeights.standard,padding:spacing.controlPadding,borderRadius:radii.action,alignItems:'center',justifyContent:'center',backgroundColor:secondary?colors.surface:colors.accent,opacity:disabled?.5:pressed?.75:1,borderWidth:layout.borderWidth,borderColor:secondary?colors.border:colors.accent})}><Text style={{color:secondary?colors.text:colors.ink,...typography.action,textAlign:'center'}}>{label}</Text></Pressable>;
}
export function Field({label,hideLabel=false,...props}:TextInputProps&{label:string;hideLabel?:boolean}){const {styles,colors}=useTheme();return <View style={{gap:spacing.fieldGap}}>{!hideLabel&&<Text style={styles.muted}>{label}</Text>}<TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input,props.multiline?{minHeight:controlHeights.multiline,textAlignVertical:'top'}:null,props.style]}/></View>;}
export function Loading(){const {colors,styles}=useTheme();const {t}=useLanguage();return <View accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} style={{padding:24}}><ActivityIndicator color={colors.accent}/><Text style={[styles.muted,{textAlign:'center',marginTop:12}]}>{t('common.loading')}</Text></View>;}
export function ErrorPanel({error,retry}:{error:Error|string;retry?:()=>void}){const {colors,styles}=useTheme();const {t}=useLanguage();return <View style={styles.card}><Text accessibilityRole="alert" style={{color:colors.error,lineHeight:19}}>{typeof error==='string'?error:error.message}</Text>{retry&&<Action label={t('common.retry')} onPress={retry} secondary/>}</View>;}
export function Heading({title,action,onPress}:{title:string;action?:string;onPress?:()=>void}){const {styles}=useTheme();return <View style={[styles.row,{justifyContent:'space-between'}]}><Text accessibilityRole="header" style={[styles.heading,{flex:1},typography.sectionHeading]}>{title}</Text>{Boolean(action)&&onPress&&<Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:controlHeights.compact,justifyContent:'center'}}><Text style={styles.muted}>{action} →</Text></Pressable>}</View>;}
export function MemberGate({children}:{children:ReactNode}){const {styles}=useTheme();const {copy}=useLanguage();
  const {user,ready}=useSession();const membership=useResource<Membership>(user?'/me/membership':null,user?.id??null);
  if(!ready)return <Loading/>;
  if(!user)return <View style={styles.card}><Text style={styles.heading}>{copy.service.signIn}</Text><Text style={styles.muted}>{copy.service.signInCopy}</Text><Action label="Sign in" onPress={()=>router.push('/auth')}/></View>;
  if(membership.error)return <ErrorPanel error={membership.error} retry={membership.retry}/>;
  if(!membership.data)return <Loading/>;
  if(!membership.data.active)return <View style={styles.card}><Text style={styles.heading}>{copy.service.membership}</Text><Text style={styles.muted}>{copy.service.membershipCopy}</Text><Action label={copy.service.exploreMembership} onPress={()=>router.push('/membership')}/></View>;
  return <>{children}</>;
}

