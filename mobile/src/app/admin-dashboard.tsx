import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../components/ui';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import {useTheme} from '../lib/theme';
import {openAdminDashboard} from '../lib/web';
import {adminTaskGroups,adminSummary,type AdminOverview} from '../../../shared/admin-dashboard';

export default function AdminDashboard(){
  const {user,ready}=useSession();
  const {styles,colors}=useTheme();
  const allowed=ready&&user?.role==='ADMIN';
  const result=useResource<AdminOverview>(allowed?'/admin/overview':null,allowed?user.id:null);
  const [expanded,setExpanded]=useState<string[]>([]);
  const [openError,setOpenError]=useState('');
  async function open(slug=''){
    setOpenError('');
    try{await openAdminDashboard(slug);}catch(error){setOpenError((error as Error).message);}
  }
  if(!ready)return <Page><Loading/></Page>;
  if(!user)return <Page><Heading title="Admin dashboard"/><Text style={styles.muted}>Sign in with your administrator account.</Text><Action label="Sign in" onPress={()=>router.push('/auth')}/></Page>;
  if(!allowed)return <Page><Heading title="Administrator access required"/><Text style={styles.muted}>This account cannot access administration.</Text></Page>;
  return <Page><Heading title="Admin dashboard"/>
    {result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data&&<>
      <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>{result.data.new_requests} new enquiries</Text><Text style={styles.muted}>Review customer requirements and assign the next step.</Text><Action label="Refresh dashboard" secondary onPress={result.retry}/></View>
      <View style={styles.row}>{adminSummary.map(item=><View key={item.key} style={[styles.card,{flexGrow:1,minWidth:90}]}><Text style={styles.heading}>{result.data![item.key]}</Text><Text style={styles.muted}>{item.label}</Text></View>)}</View>
    </>}
    <Text style={styles.muted}>Live platform counts appear here. Management tools open the admin website and require a separate sign-in.</Text>
    {Boolean(openError)&&<ErrorPanel error={openError}/>}
    {adminTaskGroups.map(group=>{
      const visible=!group.collapsed||expanded.includes(group.title);
      return <View key={group.title} style={{gap:10}}>
        {group.collapsed?<Pressable accessibilityRole="button" accessibilityState={{expanded:visible}} onPress={()=>setExpanded(previous=>visible?previous.filter(title=>title!==group.title):[...previous,group.title])} style={[styles.row,{minHeight:48,justifyContent:'space-between'}]}><Text style={styles.heading}>{group.title}</Text><Text style={styles.text}>{visible?'−':'+'}</Text></Pressable>:<Heading title={group.title}/>}
        {visible&&group.items.map(item=><Pressable key={item.slug} accessibilityRole="link" accessibilityLabel={item.label+', opens admin website'} onPress={()=>void open(item.slug)} style={({pressed})=>[styles.card,{minHeight:72,borderWidth:1,borderColor:colors.border,opacity:pressed?.75:1}]}><Text style={styles.heading}>{item.label} ↗</Text><Text style={styles.muted}>{item.description}</Text></Pressable>)}
      </View>;
    })}
    <Text style={styles.muted}>Stored counts do not confirm service availability. Payments remain sandbox only.</Text>
  </Page>;
}
