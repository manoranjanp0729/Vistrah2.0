import copy from '../lib/interface-copy';
import {useState} from 'react';
import {FlatList,Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Field,Heading,Loading,ErrorPanel,Action} from './ui';
import {useResource} from '../lib/resource';
import {filterServices,type Category} from '../lib/catalogue';
import {useTheme} from '../lib/theme';
export default function ServiceList(){const {colors,styles}=useTheme();
  const params=useLocalSearchParams<{q?:string;slug?:string}>();const [typed,setTyped]=useState<string|null>(null);
  const query=typed??(typeof params.q==='string'?params.q:'');const category=typeof params.slug==='string'?params.slug:undefined;
  const catalogue=useResource<Category[]>('/catalogue');const rows=filterServices(catalogue.data??[],query,category);
  return <SafeAreaView edges={['left','right']} style={styles.page}><FlatList data={rows} keyExtractor={item=>String(item.service.id)} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ListHeaderComponent={<View style={{gap:16,marginBottom:20}}><Heading title={copy.catalogue.serviceTitle}/><Field label={copy.catalogue.serviceSearch} placeholder={copy.catalogue.servicePlaceholder} value={query} onChangeText={setTyped}/>{Boolean(category)&&<Action label={copy.catalogue.all} secondary onPress={()=>{router.replace('/services');}}/>}<Text style={styles.muted}>{copy.catalogue.serviceIntro}</Text></View>}
    renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{marginBottom:12,opacity:pressed?.75:1}]}><Text style={styles.label}>{item.category.title}</Text><Text style={styles.heading}>{item.service.title}</Text><Text style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>{copy.catalogue.explore}</Text></Pressable>}
    ListEmptyComponent={catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<Text style={styles.muted}>{copy.catalogue.noServices}</Text>}/></SafeAreaView>;
}
