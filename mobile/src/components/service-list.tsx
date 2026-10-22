import {UiText,UiElement} from "./localized-ui";
import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Field,Heading,Loading,ErrorPanel,Action} from './ui';
import {PhotoCard} from './photo-card';
import {PhotoCardRail} from './photo-card-rail';
import {useResource} from '../lib/resource';
import {filterServices,mobileServiceId,type Category} from '../lib/catalogue';
import {useTheme} from '../lib/theme';
import {servicePhotos} from '../lib/service-photos';
export default function ServiceList(){const {styles}=useTheme();const {copy,t}=useLanguage();
  const params=useLocalSearchParams<{q?:string;slug?:string}>();const [typed,setTyped]=useState<string|null>(null);
  const query=typed??(typeof params.q==='string'?params.q:'');const category=typeof params.slug==='string'?params.slug:undefined;
  const catalogue=useResource<Category[]>('/catalogue');const rows=filterServices(catalogue.data??[],query,category);
  return <SafeAreaView edges={['left','right']} style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={{gap:12}}><Heading title={copy.catalogue.serviceTitle}/><Field hideLabel label={copy.catalogue.serviceSearch} placeholder={copy.catalogue.servicePlaceholder} value={query} onChangeText={setTyped}/>{Boolean(category)&&<Action label={copy.catalogue.all} secondary onPress={()=>router.replace('/services')}/>}</View>
    {rows.length?<UiElement as={PhotoCardRail} vertical label={t('nav.services')} cards={rows.map(item=><PhotoCard list key={item.service.id} title={item.service.title} meta={item.service.id<0?t('common.jobsDiscovery'):t('common.service')} source={servicePhotos[item.service.slug]?.source} onPress={()=>router.push({pathname:'/service/[id]',params:{id:mobileServiceId(item)}})}/>)}/>:catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<Text style={styles.muted}><UiText value={copy.catalogue.noServices}/></Text>}
  </ScrollView></SafeAreaView>;
}