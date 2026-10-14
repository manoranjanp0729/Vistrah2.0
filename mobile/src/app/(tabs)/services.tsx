import copy from '../../lib/interface-copy';
import {useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Field,Heading,Loading,ErrorPanel} from '../../components/ui';
import {CategoryCard} from '../../components/category-card';
import {useResource} from '../../lib/resource';
import {filterServices,type Category} from '../../lib/catalogue';
import {useTheme} from '../../lib/theme';
export default function Services(){const {styles}=useTheme();
  const params=useLocalSearchParams<{q?:string}>();
  const [typed,setTyped]=useState<string|null>(null);
  const query=typed??(typeof params.q==='string'?params.q:'');
  const {width}=useWindowDimensions();
  const columns=width>=760?4:width>=360?2:1;
  const taxonomy=useResource<{categories:{slug:string;title:string;subcategories:{slug:string;title:string;listing_types:{slug:string;title:string}[]}[]}[]}>('/marketplace/taxonomy');
  const [expanded,setExpanded]=useState<string|null>(null);
  const catalogue=useResource<Category[]>('/catalogue');
  const matching=new Set(filterServices(catalogue.data??[],query).map(item=>item.category.id));
  const needle=query.trim().toLocaleLowerCase();
  const categories=(catalogue.data??[]).filter(category=>!needle||matching.has(category.id)||[category.title,category.description].join(' ').toLocaleLowerCase().includes(needle));
  return <SafeAreaView edges={['left','right']} style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Heading title={copy.catalogue.title}/><Field label={copy.catalogue.search} placeholder={copy.catalogue.placeholder} value={query} onChangeText={setTyped}/>
    <Text style={styles.muted}>Explore marketplace classifications. Listing types are not necessarily available services.</Text>
    {taxonomy.loading?<Loading/>:taxonomy.error?<ErrorPanel error={taxonomy.error} retry={taxonomy.retry}/>:taxonomy.data?.categories.filter(cat=>!needle||[cat.title,...cat.subcategories.flatMap(sub=>[sub.title,...sub.listing_types.map(t=>t.title)])].some(t=>t.toLowerCase().includes(needle))).map(cat=><View key={cat.slug} style={styles.card}><Pressable accessibilityRole="button" onPress={()=>setExpanded(expanded===cat.slug?null:cat.slug)}><Text style={styles.heading}>{cat.title}</Text><Text style={styles.muted}>{cat.subcategories.length} subcategories</Text></Pressable>{expanded===cat.slug?cat.subcategories.map(sub=><View key={sub.slug}><Text style={styles.heading}>{sub.title}</Text>{sub.listing_types.map(t=><Text key={t.slug} style={styles.muted}>{t.title}</Text>)}</View>):null}</View>)}
    <Heading title="Currently published services"/>
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:categories.length?<View style={styles.grid}>{categories.map((category,index)=><CategoryCard key={category.id} category={category} index={index} columns={columns}/>)}</View>:<Text style={styles.muted}>{copy.catalogue.empty}</Text>}
  </ScrollView></SafeAreaView>;
}
