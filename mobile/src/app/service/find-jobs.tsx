import {Text} from '../../components/typography';
import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {Image,Pressable,View} from 'react-native';
import {SelectionFill,PageTitle,Page,Heading} from '../../components/ui';
import {ExternalJobsList} from '../../components/external-jobs-list';
import {EmployerJobsList} from '../../components/employer-jobs-list';
import {useTheme} from '../../lib/theme';
export default function FindJobs(){
  const {colors,styles}=useTheme();const [tab,setTab]=useState<'vistrah'|'external'>('vistrah');
  return <Page>
    <UiElement as={Image} source={require('../../../assets/services/find-jobs.png')} accessibilityLabel="A job seeker browsing vacancies on a laptop — AI-generated illustrative image" resizeMode="cover" style={{height:144,width:'100%',borderRadius:18}}/>
    <Text style={styles.label}><UiText value={"Jobs & Careers"}/></Text><UiElement as={PageTitle} title="Find Jobs"/>
    <Text style={styles.text}><UiText value={"Explore job opportunities and choose where to look for your next role."}/></Text>
    <UiElement as={View} accessibilityRole="tablist" accessibilityLabel="Job sources" style={{flexDirection:'row',alignSelf:'center',width:'100%',maxWidth:460,gap:6,padding:5,marginVertical:12,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border}}>
      {([{id:'vistrah',title:'VISTRAH Jobs'},{id:'external',title:'External Jobs'}] as const).map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:tab===item.id}} onPress={()=>setTab(item.id)} style={({pressed})=>({flex:1,minHeight:48,padding:10,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:tab===item.id?colors.accent:colors.surface,opacity:pressed?.75:1})}><SelectionFill selected={tab===item.id} radius={13}/><Text style={{color:tab===item.id?'#fff':colors.text,fontWeight:'600',fontSize:13,textAlign:'center'}}><UiText value={item.title}/></Text></Pressable>)}
    </UiElement>
    {tab==='vistrah'?<EmployerJobsList/>:<><UiElement as={Heading} title="External Jobs"/><Text style={styles.muted}><UiText value={"Browse source-listed vacancies. Each job links to its original listing, which opens outside VISTRAH."}/></Text><ExternalJobsList/></>}
  </Page>;
}
