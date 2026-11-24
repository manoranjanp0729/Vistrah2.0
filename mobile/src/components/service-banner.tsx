import {UiElement} from "./localized-ui";
import {useState,type ComponentProps} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {LinearGradient} from 'expo-linear-gradient';
import type {ServiceContext} from '../lib/catalogue';
import {resolveServicePhotoAlt,resolveServicePhotoSource} from '../lib/service-photos';
type Icon=ComponentProps<typeof Feather>['name'];
const subjects:Record<string,Icon>={
  'restaurant':'coffee','cafes':'coffee','pubs':'coffee','street-food':'shopping-bag',
  'hotels':'home','homestays':'home','resorts':'sun',
  'cars':'truck','bikes':'navigation',
  'wedding':'heart','birthday':'gift',
  'hospitals':'activity','clinics':'plus-circle','laboratory':'thermometer',
  'schools':'book-open','colleges':'book','universities':'award','institutes':'monitor','tuitions':'edit-3',
  'salons':'scissors','beauty-parlour':'star','spas':'droplet','sauna':'wind',
  'residential':'home','commercial':'layers',
  'petrol-pumps':'droplet','auto-gas':'wind','ev-charging':'zap',
  'theatres':'film','social-events':'music',
  'retractable-roofing':'umbrella','bioclimatic-pergolas':'sun','glass-systems':'square','outdoor-structures':'layers',
  'resume-building':'file-text','job-application-assistance':'send','linkedin-profile':'linkedin','interview-preparation':'message-circle','career-consultation':'compass','job-search-assistance':'search',
  'property-search':'search','property-verification':'shield','property-valuation':'bar-chart-2','buy-property':'key','sell-property':'tag','rental-assistance':'home',
  'residential-construction':'home','commercial-construction':'layers','architecture-design':'pen-tool','civil-engineering':'tool','estimation-boq':'clipboard','tenders':'award','contracts-documentation':'file-text','contractors-subcontractors':'users','inspection-verification':'check-circle','equipment-materials':'tool',
  'digital-marketing':'trending-up','outdoor-advertising':'map-pin','led-digital-displays':'monitor','signage-branding':'type','print-advertising':'printer','events-promotions':'calendar','media-advertising':'video','marketing-consultation':'message-circle',
  'income-tax-return-filing':'file-text','gst-registration':'edit','gst-filing':'clipboard','business-registration':'briefcase','tds-compliance':'check-circle','tax-consultation':'message-circle',
  'website-development':'globe','mobile-app-development':'smartphone','cloud-services':'cloud','devops-services':'git-branch','it-support':'headphones','software-consultation':'code',
  'business-setup':'briefcase','business-consultation':'message-circle','market-research':'pie-chart','documentation-services':'file-text','vendor-assistance':'users','business-process-support':'settings',
  'home-services':'home','ac-service-repair':'wind','electrical-services':'zap','plumbing-services':'droplet','pest-control':'shield','professional-consultation':'message-circle','interior-design':'layout',
};
const categories:Record<string,Icon>={
  'restaurants-and-dining':'coffee','hotels-and-stay':'home','vehicle-rentals':'truck','event-management':'calendar','hospitals-and-labs':'activity','education-and-skills':'book-open','salons-and-beauty-parlour':'scissors','civil-and-construction':'layers','fuel-and-charging-stations':'zap','vibe-finder':'film',
  'jobs-careers':'briefcase','real-estate':'home','civil-construction':'tool','marketing':'volume-2','tax-compliance':'credit-card','it-technology':'code','business-services':'briefcase','local-professional-services':'tool',
};
export function ServiceBanner({context}:{context:ServiceContext}){
  const [photoFailed,setPhotoFailed]=useState(false);
  const photo=resolveServicePhotoSource(context.service.slug,context.category.slug,context.service.image);
  const alt=resolveServicePhotoAlt(context.service.slug,context.category.slug,context.service.title);
  const subject=subjects[context.service.slug]??categories[context.category.slug]??'grid';
  const category=categories[context.category.slug]??'grid';
  return <UiElement as={View} accessible accessibilityRole="image" accessibilityLabel={alt} style={{height:148,borderRadius:18,overflow:'hidden'}}>
    {photo&&!photoFailed?(
      <View style={{width:'100%',height:148}}>
        <Image source={photo} resizeMode="cover" accessibilityLabel={alt} onError={()=>setPhotoFailed(true)} style={StyleSheet.absoluteFill}/>
      </View>
    ):(
      <LinearGradient colors={['#091B33','#0F294A','#163A66']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1,alignItems:'center',justifyContent:'center'}}>
        <View style={{position:'absolute',width:180,height:180,borderRadius:90,borderWidth:1,borderColor:'#60a5fa',opacity:.22}}/>
        <View style={{position:'absolute',width:240,height:240,borderRadius:120,borderWidth:1,borderColor:'#60a5fa',opacity:.14}}/>
        <View style={{width:92,height:78,borderRadius:14,backgroundColor:'#eff6ff',alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}],borderBottomWidth:5,borderBottomColor:'#93c5fd'}}><Feather name={subject} size={42} color="#0F294A"/></View>
        <View style={{position:'absolute',left:'18%',top:28,width:40,height:40,borderRadius:12,backgroundColor:'#fff7ed',alignItems:'center',justifyContent:'center',transform:[{rotate:'-12deg'}]}}><Feather name={category} size={20} color="#EA580C"/></View>
        <View style={{position:'absolute',right:'18%',bottom:17,width:32,height:32,borderRadius:16,backgroundColor:'#F97316',alignItems:'center',justifyContent:'center'}}><Feather name="check" size={17} color="#ffffff"/></View>
      </LinearGradient>
    )}
  </UiElement>;
}
