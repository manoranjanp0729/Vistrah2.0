import {useLanguage} from '../../../lib/language';
import {useState,type ReactElement} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Field,Heading,Loading,ErrorPanel,Action} from '../../../components/ui';
import {PhotoCard} from '../../../components/photo-card';
import {PhotoCardRail} from '../../../components/photo-card-rail';
import {MarketplaceCategories} from '../../../components/marketplace-categories';
import {SellerAddCard} from '../../../components/seller-add-card';
import {useResource} from '../../../lib/resource';
import {filterServices,mobileServiceId,type Category} from '../../../lib/catalogue';
import {marketplaceItemId,resolveMarketplaceSelection,searchMarketplaceEntries,type MarketplaceSelection} from '../../../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../../../lib/marketplace-photo';
import {servicePhotos} from '../../../lib/service-photos';
import {useTheme} from '../../../lib/theme';
import {useSession} from '../../../lib/session';

export default function Services(){
  const {styles}=useTheme();const {t,label}=useLanguage();
  const {user}=useSession();const sellerMode=Boolean(user?.seller_enabled);
  const startSellerApplication=(selection:MarketplaceSelection={})=>router.push({pathname:'/provider-applications/new',params:{...(selection.category?{categorySlug:selection.category}:{}),...(selection.subcategory?{subcategorySlug:selection.subcategory}:{}),...(selection.type?{typeSlug:selection.type}:{})}});
  const sellerCard=(key:string,title:string,selection:MarketplaceSelection,card:ReactElement)=>sellerMode?<SellerAddCard key={key} label={title} onAdd={()=>startSellerApplication(selection)}>{card}</SellerAddCard>:card;
  const raw=useLocalSearchParams<{category?:string;subcategory?:string;type?:string;q?:string}>();
  const params:MarketplaceSelection={category:typeof raw.category==='string'?raw.category:undefined,subcategory:typeof raw.subcategory==='string'?raw.subcategory:undefined,type:typeof raw.type==='string'?raw.type:undefined,q:typeof raw.q==='string'?raw.q:undefined};
  const scope=JSON.stringify(params),[draft,setDraft]=useState<{scope:string;value:string}|null>(null);
  const query=draft?.scope===scope?draft.value:params.q??'';
  const selected=resolveMarketplaceSelection(params),needle=query.trim(),showPublished=Boolean(selected)&&Boolean(needle);
  const catalogue=useResource<Category[]>(showPublished?'/catalogue':null);
  const rows=filterServices(catalogue.data??[],query).filter(item=>item.category.active&&item.service.active&&(!item.subcategory||item.subcategory.active));
  const open=(selection:MarketplaceSelection)=>{setDraft(null);router.push({pathname:'/services',params:selection});};
  if(!selected)return <SafeAreaView edges={['left','right']} style={styles.page}><View style={styles.content}><Heading title={t('discovery.notFound')}/><Text style={styles.muted}>{t('discovery.chooseValid')}</Text><Action secondary label={t('catalogue.all')} onPress={()=>open({})}/></View></SafeAreaView>;
  const {category,subcategory,listingType}=selected;
  const results=searchMarketplaceEntries(query);
  return <SafeAreaView edges={['left','right']} style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={{alignItems:'flex-end'}}><Action secondary label={user?.seller_enabled?'Seller dashboard':user?'Enable seller access':'Seller login'} onPress={()=>router.push(user?'/seller':{pathname:'/auth',params:{mode:'seller'}})}/></View>
    {user?.seller_enabled&&<View style={{gap:8}}><Text style={styles.muted}>Offering services through VISTRAH? Register services for your business. New listings require approval before appearing to customers.</Text><Action label="Add services to my business" onPress={()=>startSellerApplication(params)}/></View>}
    <Heading title={listingType?label(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug),listingType.title):subcategory?label(marketplaceItemId(category!.slug,subcategory.slug),subcategory.title):category?label(marketplaceItemId(category.slug),category.title):t('discovery.title')}/>
    <Field hideLabel label={t('discovery.searchLabel')} placeholder={t('discovery.searchPlaceholder')} value={query} onChangeText={value=>setDraft({scope,value})}/>
    {needle?<View style={{gap:12}}><Heading title={t('discovery.results')} action={t('common.clear')} onPress={()=>{setDraft({scope,value:''});}}/><PhotoCardRail vertical label={t('discovery.resultsLabel')} cards={results.map(result=><PhotoCard list discovery key={result.id} title={label(result.id,result.title)} meta="" source={nativeMarketplacePhoto(result.id)} imageAlt={nativeMarketplaceAlt(result.id)} onPress={()=>open(result.selection)}/>)}/>{!results.length&&<Text style={styles.muted}>{t('discovery.noMatches')}</Text>}</View>:listingType?<View style={{gap:12}}>
      <PhotoCard list discovery title={label(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug),listingType.title)} meta="" source={nativeMarketplacePhoto(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug))} imageAlt={nativeMarketplaceAlt(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug))} onPress={()=>open({category:category!.slug,subcategory:subcategory!.slug,type:listingType.slug})}/>
      <Text style={styles.muted}>{t('discovery.unavailableType')}</Text><Action secondary label={t('discovery.backTo',{name:label(marketplaceItemId(category!.slug,subcategory!.slug),subcategory!.title)})} onPress={()=>open({category:category!.slug,subcategory:subcategory!.slug})}/>
    </View>:subcategory?<View style={{gap:12}}><Heading title={t('discovery.types')}/><PhotoCardRail vertical label={t('discovery.types')} cards={subcategory.listing_types.map(type=>sellerCard(type.slug,type.title,{category:category!.slug,subcategory:subcategory!.slug,type:type.slug},<PhotoCard list discovery key={type.slug} testID={`marketplace-type-${type.slug}`} title={label(marketplaceItemId(category!.slug,subcategory!.slug,type.slug),type.title)} meta="" source={nativeMarketplacePhoto(marketplaceItemId(category!.slug,subcategory.slug,type.slug))} imageAlt={nativeMarketplaceAlt(marketplaceItemId(category!.slug,subcategory.slug,type.slug))} onPress={()=>open({category:category!.slug,subcategory:subcategory.slug,type:type.slug})}/>))}/><Action secondary label={t('discovery.allSubcategories',{name:label(marketplaceItemId(category!.slug),category!.title)})} onPress={()=>open({category:category!.slug})}/></View>:category?<View style={{gap:12}}><Heading title={t('discovery.exploreSubcategories')}/><PhotoCardRail vertical label={t('discovery.subcategories')} cards={category.subcategories.map(sub=>sellerCard(sub.slug,sub.title,{category:category!.slug,subcategory:sub.slug},<PhotoCard list discovery key={sub.slug} testID={`marketplace-subcategory-${sub.slug}`} title={label(marketplaceItemId(category!.slug,sub.slug),sub.title)} meta="" source={nativeMarketplacePhoto(marketplaceItemId(category.slug,sub.slug))} imageAlt={nativeMarketplaceAlt(marketplaceItemId(category.slug,sub.slug))} onPress={()=>open({category:category.slug,subcategory:sub.slug})}/>))}/><Action secondary label={t('catalogue.all')} onPress={()=>open({})}/></View>:<MarketplaceCategories sellerMode={sellerMode}/>}
    {(category||needle)?<><View style={styles.divider}/><Heading title={showPublished?t('nav.services'):t('discovery.looking')}/>
    {!showPublished?<Action secondary label={t('common.exploreServices')} onPress={()=>open({})}/>:catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:rows.length?<PhotoCardRail vertical label={t('nav.services')} cards={rows.map(item=>sellerCard(String(item.service.id),item.service.title,{category:item.category.slug,subcategory:item.subcategory?.slug,type:item.service.slug},<PhotoCard list compactServiceGrid key={item.service.id} title={item.service.title} meta={item.service.id<0?t('common.jobsDiscovery'):t('common.service')} source={servicePhotos[item.service.slug]?.source} imageAlt={servicePhotos[item.service.slug]?.alt} onPress={()=>router.push({pathname:'/service/[id]',params:{id:mobileServiceId(item)}})}/>))}/>:<Text style={styles.muted}>{t('catalogue.noServices')}</Text>}</>:null}
  </ScrollView></SafeAreaView>;
}