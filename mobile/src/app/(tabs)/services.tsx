import {useState} from 'react';
import {ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Field,Heading,Loading,ErrorPanel} from '../../components/ui';
import {CategoryCard} from '../../components/category-card';
import {useResource} from '../../lib/resource';
import {filterServices,type Category} from '../../lib/catalogue';
import {styles} from '../../lib/theme';
export default function Services(){
  const params=useLocalSearchParams<{q?:string}>();
  const [typed,setTyped]=useState<string|null>(null);
  const query=typed??(typeof params.q==='string'?params.q:'');
  const {width}=useWindowDimensions();
  const columns=width>=760?4:width>=360?2:1;
  const catalogue=useResource<Category[]>('/catalogue');
  const matching=new Set(filterServices(catalogue.data??[],query).map(item=>item.category.id));
  const needle=query.trim().toLocaleLowerCase();
  const categories=(catalogue.data??[]).filter(category=>!needle||matching.has(category.id)||[category.title,category.description].join(' ').toLocaleLowerCase().includes(needle));
  return <SafeAreaView edges={['left','right']} style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Heading title="Service categories"/><Field label="Search categories" placeholder="Property, tax, jobs…" value={query} onChangeText={setTyped}/>
    <Text style={styles.muted}>Choose a main category to see its services.</Text>
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:categories.length?<View style={styles.grid}>{categories.map((category,index)=><CategoryCard key={category.id} category={category} index={index} columns={columns}/>)}</View>:<Text style={styles.muted}>No categories match your search.</Text>}
  </ScrollView></SafeAreaView>;
}
