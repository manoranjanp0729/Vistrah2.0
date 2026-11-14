import {UiElement} from "./localized-ui";
import type {ComponentProps} from 'react';
import {View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {LinearGradient} from 'expo-linear-gradient';
import type {ServiceContext} from '../lib/catalogue';
import {radii,useTheme} from '../lib/theme';
type Icon=ComponentProps<typeof Feather>['name'];
const subjects:Record<string,Icon>={
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
const categories:Record<string,Icon>={'jobs-careers':'briefcase','real-estate':'home','civil-construction':'tool','marketing':'volume-2','tax-compliance':'credit-card','it-technology':'code','business-services':'briefcase','local-professional-services':'tool'};
export function ServiceBanner({context}:{context:ServiceContext}){
  const {colors}=useTheme();
  const subject=subjects[context.service.slug]??categories[context.category.slug]??'grid';
  const category=categories[context.category.slug]??'grid';
  return <UiElement as={View} accessible accessibilityRole="image" accessibilityLabel={context.service.title+' illustration'} style={{height:112,borderRadius:radii.surface,borderWidth:1,borderColor:colors.borderSubtle,overflow:'hidden'}}>
    <LinearGradient colors={[colors.surface,colors.elevated,colors.surface]} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1,alignItems:'center',justifyContent:'center'}}>
      <View style={{position:'absolute',width:180,height:180,borderRadius:radii.pill,borderWidth:1,borderColor:colors.borderSubtle}}/>
      <View style={{position:'absolute',width:240,height:240,borderRadius:radii.pill,borderWidth:1,borderColor:colors.borderSubtle}}/>
      <View style={{width:92,height:78,borderRadius:radii.surface,backgroundColor:colors.elevated,borderWidth:1,borderColor:colors.borderSubtle,alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}]}}><Feather name={subject} size={42} color={colors.accent}/></View>
      <View style={{position:'absolute',left:'18%',top:28,width:40,height:40,borderRadius:radii.surface,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle,alignItems:'center',justifyContent:'center',transform:[{rotate:'-12deg'}]}}><Feather name={category} size={20} color={colors.text}/></View>
      <View style={{position:'absolute',right:'18%',bottom:17,width:32,height:32,borderRadius:radii.pill,backgroundColor:colors.brandPrimary,alignItems:'center',justifyContent:'center'}}><Feather name="check" size={17} color={colors.brandPrimaryInk}/></View>
      <View style={{position:'absolute',right:'12%',top:22,width:6,height:6,borderRadius:radii.pill,backgroundColor:colors.accent}}/>
      <View style={{position:'absolute',left:'11%',bottom:19,width:9,height:9,borderRadius:radii.pill,backgroundColor:colors.brandPrimary}}/>
    </LinearGradient>
  </UiElement>;
}
