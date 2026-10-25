import {Text,TextInput} from './typography';
import {HomepageVideoPlayer} from './homepage-video-player';
import type {ReactNode} from 'react';
import {Image,Linking,Platform,Pressable,ScrollView,View} from 'react-native';
import {router,usePathname,type Href} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {useState} from 'react';
import {useTheme,spacing,typography} from '../lib/theme';
import {useLanguage} from '../lib/language';
import {useResource} from '../lib/resource';
import {MarketplaceCategories} from './marketplace-categories';
import {AdsMarketing} from './ads-marketing';
import {translate} from '../../../shared/i18n';
import type {LiveVistrahPage,PageSection} from '../../../shared/edit-vistrah';
import {contentHref,contentImage,sectionCopy,featureEnabled,sectionLayout} from '../../../shared/edit-vistrah-content';

export function ContentSection({section,editorialOnly=false,preview=false,previewLocale}:{section:PageSection;editorialOnly?:boolean;preview?:boolean;previewLocale?:'en'|'kn'|'hi'}){
 const language=useLanguage(),locale=previewLocale??language.locale,{colors,accentGradient}=useTheme();const [query,setQuery]=useState('');
 const copy=sectionCopy(section,locale),href=contentHref(section.action_href);
 const banner=['hero_banner','editable_banner'].includes(section.type),ink=banner?'#fff':colors.text;
 const images=section.images.filter(image=>contentImage(image.url));
 const layout=sectionLayout(section),rail=layout==='rail'||!section.variation.startsWith('content_');
 const action=(label:string,onPress:()=>void)=>preview?<View style={{alignSelf:'flex-start',overflow:'hidden',borderRadius:14}}><LinearGradient colors={accentGradient} style={{minHeight:48,paddingHorizontal:18,paddingVertical:13}}><Text style={{...typography.action,color:'#fff'}}>{label}</Text></LinearGradient></View>:<Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>({opacity:pressed?.8:1,alignSelf:'flex-start',overflow:'hidden',borderRadius:14})}><LinearGradient colors={accentGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{minHeight:48,paddingHorizontal:18,paddingVertical:13}}><Text style={{...typography.action,color:'#fff'}}>{label}</Text></LinearGradient></Pressable>;
 const content=<>
  <Text accessibilityRole="header" style={{...typography.title,color:ink}}>{copy.title}</Text>
  {!!copy.description&&<Text style={{...typography.body,color:ink}}>{copy.description}</Text>}
  {section.type==='search_bar'&&!editorialOnly&&<><TextInput editable={!preview} accessibilityLabel={copy.title} placeholder={copy.description} value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={()=>{if(!preview)router.push({pathname:'/services',params:{q:query}});}} placeholderTextColor={colors.muted} style={{padding:14,borderRadius:12,backgroundColor:colors.background,color:colors.text,borderWidth:1,borderColor:colors.border}}/>{action(copy.action||translate(locale,'common.search'),()=>router.push({pathname:'/services',params:{q:query}}))}</>}
  {!!images.length&&<ScrollView horizontal={rail} scrollEnabled={rail} showsHorizontalScrollIndicator={rail} contentContainerStyle={{gap:12,...(!rail?{flexDirection:'row',flexWrap:'wrap'} as const:{})}}>{images.map((image,index)=>{
   const uri=image.url.startsWith('/')&&Platform.OS!=='web'?'https://vistrah.in'+image.url:image.url;
   return <View key={index} style={{width:rail?280:'100%',gap:6,...(!rail?{flexGrow:1,flexBasis:230}: {})}}><Image accessibilityLabel={image.alt_text||image.title||copy.title} source={{uri}} resizeMode="cover" style={{width:'100%',aspectRatio:16/9,borderRadius:14,backgroundColor:colors.soft}}/>{!!image.title&&<Text style={{color:ink,lineHeight:20}}>{image.title}</Text>}</View>;
  })}</ScrollView>}
  {!!section.video_urls?.length&&(preview?<Text style={{color:ink}}>Video playlist · {section.video_urls.filter(url=>url.trim()).length} videos</Text>:<HomepageVideoPlayer key={section.video_urls.join('|')} videos={section.video_urls.filter(url=>contentImage(url)).map(uri=>uri.startsWith('/')&&Platform.OS!=='web'?'https://vistrah.in'+uri:uri)}/>)}
  {section.type==='services_for_you'&&!editorialOnly&&(preview?<View style={{padding:18,borderWidth:1,borderColor:colors.border,borderRadius:12}}><Text style={{color:ink}}>Live categories · managed in Service catalogue</Text></View>:<MarketplaceCategories compact/>)}
  {section.type==='big_widget'&&!editorialOnly&&(preview?<View style={{padding:18,borderWidth:1,borderColor:colors.border,borderRadius:12}}><Text style={{color:ink}}>Ads & Marketing · live service cards</Text></View>:<AdsMarketing/>)}
  {href&&copy.action&&featureEnabled(section,'show_direct_cta')&&action(copy.action,()=>{if(href.startsWith('mailto:'))void Linking.openURL(href);else router.push(href as Href);})}
 </>;
 const layoutStyle=section.variation.startsWith('content_')?{padding:layout==='ribbon'?14:spacing.sectionPadding,borderWidth:layout==='spotlight'?3:1,borderColor:colors.border}:{padding:banner?spacing.sectionPadding:spacing.pagePadding,borderWidth:banner?0:1,borderColor:colors.border};
 return banner?<LinearGradient colors={accentGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{...layoutStyle,gap:spacing.elementGap,borderRadius:22}}>{content}</LinearGradient>:<View style={{...layoutStyle,gap:spacing.elementGap,borderRadius:22,backgroundColor:colors.surface}}>{content}</View>;
}

export function EditVistrahContent({slug,children,replace=false,required=false}:{slug:string;children?:ReactNode;replace?:boolean;required?:boolean}){
 const pathname=usePathname().replace(/^\/app(?=\/|$)/,'')||'/';
 const {data,error,loading}=useResource<LiveVistrahPage>('/edit-vistrah/pages/'+encodeURIComponent(slug));
 const {colors}=useTheme(),{t}=useLanguage();
 if(!data||data.path!==pathname||data.target_platform===(Platform.OS==='web'?'mobile':'web'))return <>{required?<Text accessibilityRole="alert" style={{color:colors.text}}>{loading?t('common.loading'):error?.message||'This page is not published for this device.'}</Text>:children}</>;
 const sections=data.sections.filter(section=>section.enabled&&(section.type!=='header'||!!section.content)).sort((a,b)=>a.order-b.order);
 return <><View style={{gap:spacing.sectionGap}}>{sections.map(section=><ContentSection section={section} editorialOnly={!replace} key={section.id}/>)}</View>{!replace&&children}</>;
}
