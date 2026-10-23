import {useAppFont} from '../../components/typography';
import {UiElement} from "../../components/localized-ui";
import {useLanguage} from '../../lib/language';
import {Tabs,router} from 'expo-router';
import {Image,Platform,Pressable,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../../lib/theme';
import {SettingsButton} from '../../components/settings-button';

function VAdsCenterIcon({focused,mode,accent}:{focused:boolean;mode:'light'|'dark';accent:string}){
  const isLight=mode==='light';const {accentGradient}=useTheme();
  return (
    <View style={{width:58,height:28,alignItems:'center',justifyContent:'center'}}>
      <LinearGradient
        colors={focused?accentGradient:(isLight?['#ffffff','#f4effa']:['#2b2438','#1f1a29'])}
        start={{x:0,y:0}}
        end={{x:1,y:1}}
        style={{
          width:58,
          height:58,
          borderRadius:29,
          alignItems:'center',
          justifyContent:'center',
          marginTop:-4,
          borderWidth:focused?2:1.5,
          borderColor:focused?(isLight?'#ffffff':'#d4c4ee'):(isLight?'#E2DBEF':'#393246'),
          shadowColor:accent,
          shadowOffset:{width:0,height:focused?3:1.5},
          shadowOpacity:focused?(isLight?0.28:0.38):(isLight?0.10:0.18),
          shadowRadius:focused?5:3,
          elevation:focused?4:2,
        }}
      >
        <Image
          source={require('../../../assets/brand/vistrah-v.png')}
          resizeMode="contain"
          style={{
            width:26,
            height:21,
            tintColor:focused?'#ffffff':accent,
            marginTop:0.5,
          }}
        />
      </LinearGradient>
    </View>
  );
}

export default function TabLayout(){const labelFont=useAppFont(500);const {colors,mode,headerGradient}=useTheme();const {copy,t,locale}=useLanguage();
  const insets=useSafeAreaInsets();
  return <Tabs backBehavior="history" screenOptions={{header:({route})=> <View style={{paddingTop:insets.top,backgroundColor:colors.background,zIndex:1,borderBottomLeftRadius:20,borderBottomRightRadius:20,overflow:'hidden'}}>{<LinearGradient pointerEvents="none" colors={headerGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}><View style={{position:'absolute',right:24,top:-52,width:160,height:160,borderRadius:80,backgroundColor:'#baa3e4',opacity:mode==='light'?.12:.06}}/></LinearGradient>}<View style={{height:66,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={t('navigation.home')} hitSlop={{top:8,bottom:8,left:8,right:8}} onPress={()=>{if(route.name!=='index')router.navigate('/');}} style={{width:180,minHeight:48,justifyContent:'center',flexShrink:0}}><Image source={mode==='light'?require('../../../assets/brand/lockup-light.png'):require('../../../assets/brand/lockup-dark.png')} accessibilityLabel="VISTRAH" resizeMode="contain" style={{width:'100%',height:48,flexShrink:0}}/></UiElement><SettingsButton/></View></View>,sceneStyle:{backgroundColor:colors.background,paddingBottom:14},tabBarStyle:{backgroundColor:colors.footer,borderTopColor:mode==='light'?'#E2DBEF':'#393246',borderTopWidth:.5,borderTopLeftRadius:18,borderTopRightRadius:18,overflow:'visible'},tabBarItemStyle:{minHeight:44},tabBarIconStyle:{width:48,height:28},tabBarLabelStyle:{fontFamily:labelFont,fontSize:11,lineHeight:locale==='en'?14:16,fontWeight:Platform.OS==='web'?'500':'normal'},tabBarLabelPosition:'below-icon',tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:mode==='light'?'#69758A':'#a3aec1'}}>
    <Tabs.Screen name="index" options={{title:copy.nav.discover,tabBarIcon:({color})=><Feather name="home" color={color} size={20}/>}}/>
    <Tabs.Screen name="services" options={{title:copy.nav.services,tabBarIcon:({color})=><Feather name="grid" color={color} size={20}/>}}/>
    <Tabs.Screen name="v-ads" options={{
      title:t('navigation.vAds'),
      tabBarShowLabel:false,
      tabBarLabel:()=>null,
      tabBarItemStyle:{minHeight:44,overflow:'visible'},
      tabBarButton:({ref:_ref,style,children,...props})=><UiElement as={Pressable} {...props} android_ripple={null} accessibilityLabel={t('navigation.vAds')} style={({pressed})=>[style,{overflow:'visible',opacity:pressed?.88:1}]}>{children}</UiElement>,
      tabBarIcon:({focused})=><VAdsCenterIcon focused={focused} mode={mode} accent={colors.accent}/>
    }}/>
    <Tabs.Screen name="requests" options={{title:'V Essentials',tabBarIcon:({color})=><Feather name="layers" color={color} size={20}/>}}/>
    <Tabs.Screen name="account" options={{title:copy.nav.account,tabBarIcon:({color})=><Feather name="user" color={color} size={20}/>}}/>
  </Tabs>;
}
