import {useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {SafeAreaView} from 'react-native-safe-area-context';

type Group='Websites'|'Digital'|'Creative'|'Outdoor'|'Mobility';
type Item={id:string;group:Group;name:string;price:number;unit?:string;features:string[];description:string;quote?:boolean};
const items:Item[]=[
{id:'landing',group:'Websites',name:'Landing Page',price:4999,description:'A clear, focused page to introduce your business.',features:['Responsive layout','Lead contact form','Basic SEO setup']},
{id:'basic',group:'Websites',name:'Basic Business Website',price:12999,description:'A professional five-page website for your business.',features:['Up to 5 pages','Mobile responsive','Contact form','Basic SEO setup']},
{id:'professional',group:'Websites',name:'Professional Website',price:24999,description:'A polished website for a growing business.',features:['Custom page layouts','Content management setup','Enquiry forms','Basic SEO setup','One revision round']},
{id:'ecommerce',group:'Websites',name:'E-commerce Website',price:39999,description:'Sell products online with a practical store setup.',features:['Product catalogue','Cart and checkout configuration','Mobile responsive','Payment provider integration subject to approval']},
{id:'custom',group:'Websites',name:'Custom Web Application',price:99999,description:'Tailored applications scoped to your requirements.',features:['Requirements discovery','Custom feature planning','Implementation quotation'],quote:true},
{id:'social',group:'Digital',name:'Social Media Starter',price:5999,unit:'/month',description:'Consistent social media presence for small businesses.',features:['4 social creatives','Post captions','Scheduled publishing','Basic reporting']},
{id:'seo',group:'Digital',name:'Local SEO',price:4999,unit:'/month',description:'Improve visibility in local search.',features:['Local keyword review','On-page recommendations','Monthly summary']},
{id:'googleads',group:'Digital',name:'Google Ads Management',price:4999,unit:'/month',description:'Campaign setup and management. Ad spend is extra.',features:['Campaign configuration','Basic optimization','Performance reporting']},
{id:'growth',group:'Digital',name:'Growth Marketing Package',price:9999,unit:'/month',description:'Multi-format creative and campaign management.',features:['8 creatives','2 edited reels','One managed campaign','Monthly reporting']},
{id:'graphic',group:'Creative',name:'Social Media Graphic',price:499,description:'A branded static creative for your campaign.',features:['One static design','Platform-ready export','One revision round']},
{id:'reel',group:'Creative',name:'Promotional Reel',price:2999,description:'An edited short-format promotional video.',features:['Client-supplied footage','15–30 second edit','Music subject to licensing']},
{id:'aivideo',group:'Creative',name:'AI-assisted Video Ad',price:2999,description:'Creative development using AI-assisted tools.',features:['Creative brief','Short-form video concept','One revision round']},
{id:'brand',group:'Creative',name:'Brand Identity Starter',price:14999,description:'An identity kit tailored to a small business.',features:['Logo concept','Color palette','Basic brand guidance']},
{id:'hoarding',group:'Outdoor',name:'Outdoor Hoarding',price:150000,unit:'/month',description:'Location-specific roadside billboard advertising.',features:['Site availability check','Placement options','Media quotation'],quote:true},
{id:'shelter',group:'Outdoor',name:'Bus Shelter Advertising',price:35000,unit:'/month',description:'Outdoor media in selected bus shelter locations.',features:['Location selection','Placement quotation','Production estimate'],quote:true},
{id:'screen',group:'Outdoor',name:'Digital Outdoor Screen',price:15000,unit:'/month',description:'DOOH display inventory at selected locations.',features:['Screen inventory options','Slot frequency confirmation','Campaign quotation'],quote:true},
{id:'autor',group:'Mobility',name:'Auto Rear Panel Branding',price:230,unit:'/auto/month',description:'Local awareness through auto-rickshaw branding.',features:['Auto count selection','Production quotation','Campaign duration options'],quote:true},
{id:'autoh',group:'Mobility',name:'Auto Hood Branding',price:580,unit:'/auto/month',description:'Vehicle-based neighborhood visibility.',features:['Route and fleet planning','Branding artwork review','Supplier quotation'],quote:true},
{id:'bus',group:'Mobility',name:'Bus Panel Advertising',price:8000,unit:'/bus/month',description:'Promote your brand across chosen bus routes.',features:['Route options','Panel placement','Campaign quotation'],quote:true},
];
const groups:Group[]=['Websites','Digital','Creative','Outdoor','Mobility'];
const icons:Record<Group,string>={Websites:'monitor',Digital:'bar-chart-2',Creative:'edit-3',Outdoor:'airplay',Mobility:'truck'};
const inr=(n:number)=>'₹'+n.toLocaleString('en-IN');
const C={navy:'#102e57',muted:'#657086',purple:'#6134c6',pink:'#bc2e91',panel:'#eae6f5',background:'#f7f6fc',stroke:'#e7e0f2'};
export default function MarketingPricing(){
 const [group,setGroup]=useState<Group>('Websites');
 const [search,setSearch]=useState('');
 const [selectedId,setSelectedId]=useState('professional');
 const [compare,setCompare]=useState(false);
 const filtered=useMemo(()=>items.filter(item=>(search.trim()?true:item.group===group)&&(item.name+' '+item.description).toLowerCase().includes(search.trim().toLowerCase())),[group,search]);
 const selected=items.find(x=>x.id===selectedId)??items[0];
 const choose=(item:Item)=>{setSelectedId(item.id);setCompare(false);};
 return <SafeAreaView style={s.screen} edges={['top','bottom']}>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   <View style={s.header}><Text style={s.logo}>VISTRAH</Text><Pressable accessibilityLabel="Back" onPress={()=>router.back()} style={s.settings}><Feather name="arrow-left" size={23} color={C.pink}/></Pressable></View>
   <Text style={s.title}>Ads & Marketing</Text><Text style={s.subtitle}>Explore transparent starting prices for your business.</Text>
   <View style={s.search}><Feather name="search" size={22} color={C.muted}/><TextInput value={search} onChangeText={setSearch} placeholder="Search websites, creatives, outdoor ads…" placeholderTextColor="#8990a2" style={s.input} accessibilityLabel="Search marketing services"/></View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{groups.map(x=><Pressable key={x} onPress={()=>{setGroup(x);setSearch('');setSelectedId(items.find(i=>i.group===x)?.id??'basic');setCompare(false);}}><LinearGradient colors={group===x?['#5636cd','#bd3295']:['#ece8f6','#ece8f6']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.chip}><Feather name={icons[x] as any} size={17} color={group===x?'white':C.muted}/><Text style={[s.chipText,group===x&&{color:'white'}]}>{x}</Text></LinearGradient></Pressable>)}</ScrollView>
   <View style={s.grid}>{filtered.map(item=><Pressable key={item.id} onPress={()=>choose(item)} accessibilityRole="button" accessibilityLabel={item.name+' price '+inr(item.price)} style={[s.tile,selectedId===item.id&&s.tileSelected]}><View style={s.tileTop}><View style={s.iconBg}><Feather name={icons[item.group] as any} size={24} color={C.purple}/></View><Feather name="arrow-up-right" color={C.pink} size={18}/></View><Text style={s.tileName}>{item.name}</Text><Text style={s.price}>{item.quote?'From ':''}{inr(item.price)}<Text style={s.unit}>{item.unit??''}</Text></Text><Text style={s.description} numberOfLines={2}>{item.description}</Text></Pressable>)}</View>
   {filtered.length===0&&<Text style={s.empty}>No services match your search.</Text>}
   <View style={s.detail}><Text style={s.detailTitle}>{selected.name}</Text><Text style={s.subtitle}>{selected.description}</Text><View style={s.costRow}><Text style={s.costLabel}>Starting at</Text><Text style={s.detailPrice}>{inr(selected.price)}<Text style={s.unit}>{selected.unit??''}</Text></Text></View><Text style={s.sectionTitle}>What's included</Text>{selected.features.map(f=><View key={f} style={s.feature}><Feather name="check-circle" size={17} color={C.pink}/><Text style={s.featureText}>{f}</Text></View>)}<Text style={s.note}>Indicative VISTRAH starting price, not a confirmed quote. Scope, media spend, printing, taxes and third-party charges may be additional.</Text><Pressable onPress={()=>Alert.alert('Request a quote','This is a pricing UI preview. Quote submission will be connected to the VISTRAH enquiry flow before launch.')}><LinearGradient colors={['#5a35cb','#ba3297']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.button}><Text style={s.buttonText}>Get Quote  →</Text></LinearGradient></Pressable><Pressable onPress={()=>setCompare(v=>!v)} style={s.outline}><Text style={s.outlineText}>{compare?'Hide comparison':'Compare pricing options'}</Text></Pressable>{compare&&items.filter(i=>i.group===selected.group).map(i=><Pressable key={i.id} style={s.compareRow} onPress={()=>choose(i)}><Text style={s.featureText}>{i.name}</Text><Text style={s.comparePrice}>{inr(i.price)}{i.unit??''}</Text></Pressable>)}</View>
  </ScrollView>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.background},
 content:{paddingHorizontal:18,paddingBottom:36,gap:14},
 header:{height:100,borderBottomLeftRadius:26,borderBottomRightRadius:26,backgroundColor:'#e6e5f2',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:26,marginHorizontal:-18,paddingTop:10},
 logo:{fontSize:26,fontWeight:'800',letterSpacing:2,color:C.navy},
 settings:{backgroundColor:'#f8f8fc',width:48,height:48,borderRadius:25,alignItems:'center',justifyContent:'center'},
 title:{fontSize:29,fontWeight:'800',color:C.navy,marginTop:10},subtitle:{fontSize:14,color:C.muted,lineHeight:21},
 search:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#edeaf5',borderRadius:24,paddingHorizontal:16,minHeight:54},input:{flex:1,color:C.navy,fontSize:14},
 filters:{gap:8,paddingBottom:3},chip:{flexDirection:'row',gap:7,paddingHorizontal:16,height:43,alignItems:'center',borderRadius:23},chipText:{fontSize:13,fontWeight:'700',color:C.muted},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{width:'48%',flexGrow:1,backgroundColor:'#fffaff',borderRadius:20,borderWidth:1,borderColor:C.stroke,padding:13,minHeight:185,gap:8},tileSelected:{borderColor:'#a63da4',borderWidth:2},
 tileTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},iconBg:{width:46,height:46,borderRadius:13,backgroundColor:'#eee8fb',alignItems:'center',justifyContent:'center'},
 tileName:{fontSize:15,fontWeight:'700',color:C.navy,minHeight:38},price:{fontSize:19,fontWeight:'800',color:'#a42083'},unit:{fontSize:12,fontWeight:'500',color:C.muted},description:{fontSize:12,lineHeight:17,color:C.muted},
 detail:{backgroundColor:'#eeeaf7',borderRadius:24,padding:19,gap:12,marginTop:8},detailTitle:{fontSize:23,fontWeight:'800',color:C.navy},costRow:{backgroundColor:'#fcfaff',padding:14,borderRadius:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},costLabel:{color:C.muted},detailPrice:{fontSize:20,fontWeight:'800',color:'#a42083'},
 sectionTitle:{fontSize:17,fontWeight:'800',color:C.navy,marginTop:4},feature:{flexDirection:'row',gap:10,alignItems:'center'},featureText:{fontSize:14,color:C.navy,flexShrink:1},note:{fontSize:11,lineHeight:17,color:C.muted},
 button:{minHeight:49,borderRadius:16,alignItems:'center',justifyContent:'center'},buttonText:{color:'white',fontWeight:'800',fontSize:16},outline:{borderRadius:16,borderColor:C.pink,borderWidth:1,minHeight:45,alignItems:'center',justifyContent:'center'},outlineText:{color:C.pink,fontWeight:'700'},compareRow:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:9,borderBottomWidth:1,borderColor:'#ded6ec'},comparePrice:{color:C.pink,fontWeight:'700',fontSize:12},empty:{textAlign:'center',color:C.muted,padding:28}
});
