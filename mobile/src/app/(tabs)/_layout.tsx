import {Text,useAppFont} from '../../components/typography';
import {UiElement} from "../../components/localized-ui";
import {useLanguage} from '../../lib/language';
import {Tabs} from 'expo-router';
import {Image,Platform,Pressable,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {AppHeader} from '../../components/app-header';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../../lib/theme';

const vCircleSize=72.5;
// The standalone V clips its right arm. Use the complete wordmark's V with
// two source pixels of transparent space on each side; no bitmap is modified.
const vScale=32.5/105;
const vHeight=85*vScale;
const vTopPadding=2*vScale;

function VAdsCenterIcon({focused,mode,accent}:{focused:boolean;mode:'light'|'dark';accent:string}){
  const isLight=mode==='light';const {accentGradient}=useTheme();
  return (
    <View style={{width:72.5,height:28,alignItems:'center',justifyContent:'center'}}>
      <LinearGradient
        colors={focused?accentGradient:(isLight?['#ffffff','#f4effa']:['#2b2438','#1f1a29'])}
        start={{x:0,y:0}}
        end={{x:1,y:1}}
        style={{
          position:'absolute',
          // The center tab has zero padding; include the footer's 0.5px border
          // so the visible V starts on the footer's top edge.
          top:-((vCircleSize-vHeight)/2+vTopPadding+0.5),
          width:vCircleSize,
          height:vCircleSize,
          borderRadius:vCircleSize/2,
          alignItems:'center',
          justifyContent:'center',
          borderWidth:focused?2:1.5,
          borderColor:focused?(isLight?'#ffffff':'#d4c4ee'):(isLight?'#E2DBEF':'#393246'),
          shadowColor:accent,
          shadowOffset:{width:0,height:focused?3:1.5},
          shadowOpacity:focused?(isLight?0.28:0.38):(isLight?0.10:0.18),
          shadowRadius:focused?5:3,
          elevation:focused?4:2,
        }}
      >
        <View style={{width:32.5,height:vHeight,overflow:'hidden'}}>
         <Image
          source={require('../../../assets/brand/lockup-light.png')}
          resizeMode="stretch"
          style={{
            position:'absolute',
            width:866*vScale,
            height:288*vScale,
            left:-131*vScale,
            top:-101*vScale,
            tintColor:focused?'#ffffff':accent,
          }}
         />
        </View>
        <Text accessible={false} style={{position:'absolute',top:(vCircleSize+vHeight)/2+1,left:0,right:0,textAlign:'center',fontSize:10,lineHeight:12,fontWeight:'600',color:focused?'#ffffff':accent}}>Ads</Text>
      </LinearGradient>
    </View>
  );
}

export default function TabLayout(){const labelFont=useAppFont(500);const {colors,mode}=useTheme();const {copy,t,locale}=useLanguage();

  return <Tabs backBehavior="history" screenOptions={{header:()=> <AppHeader/>,sceneStyle:{backgroundColor:colors.background,paddingBottom:14},tabBarStyle:{backgroundColor:colors.footer,borderTopColor:mode==='light'?'#E2DBEF':'#393246',borderTopWidth:.5,borderTopLeftRadius:18,borderTopRightRadius:18,overflow:'visible'},tabBarItemStyle:{minHeight:44},tabBarIconStyle:{width:48,height:28},tabBarLabelStyle:{fontFamily:labelFont,fontSize:11,lineHeight:locale==='en'?14:16,fontWeight:Platform.OS==='web'?'500':'normal'},tabBarLabelPosition:'below-icon',tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:mode==='light'?'#69758A':'#a3aec1'}}>
    <Tabs.Screen name="index" options={{title:copy.nav.discover,tabBarIcon:({color})=><Feather name="home" color={color} size={20}/>}}/>
    <Tabs.Screen name="services" options={{title:copy.nav.services,tabBarIcon:({color})=><Feather name="grid" color={color} size={20}/>}}/>
    <Tabs.Screen name="v-ads" options={{
      title:t('navigation.vAds'),
      tabBarShowLabel:false,
      tabBarLabel:()=>null,
      tabBarIconStyle:{width:72.5,height:28,overflow:'visible'},
      tabBarItemStyle:{minHeight:44,overflow:'visible'},
      tabBarButton:({ref:_ref,style,children,...props})=><UiElement as={Pressable} {...props} android_ripple={null} accessibilityLabel={t('navigation.vAds')} style={({pressed})=>[style,{padding:0,justifyContent:'flex-start',alignItems:'center',overflow:'visible',opacity:pressed?.88:1}]}>{children}</UiElement>,
      tabBarIcon:({focused})=><VAdsCenterIcon focused={focused} mode={mode} accent={colors.accent}/>
    }}/>
    <Tabs.Screen name="requests" options={{title:'V Essentials',tabBarIcon:({color})=><Feather name="layers" color={color} size={20}/>}}/>
    <Tabs.Screen name="account" options={{title:copy.nav.account,tabBarIcon:({color})=><Feather name="user" color={color} size={20}/>}}/>
  </Tabs>;
}
