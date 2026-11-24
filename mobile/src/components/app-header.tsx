import {Image,Pressable,View} from 'react-native';
import {router,usePathname} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {useLanguage} from '../lib/language';
import {useOptionalLocation} from '../context/LocationContext';
import {UiElement} from './localized-ui';
import {BackButton} from './back-button';
import {SettingsButton} from './settings-button';
import {shouldShowMainHeader} from '../../../shared/header-visibility';

export function AppHeader({showBack=false}:{showBack?:boolean}){
  const {colors,mode,headerGradient}=useTheme();
  const {t}=useLanguage();
  const insets=useSafeAreaInsets();
  const pathname=usePathname();
  const locCtx=useOptionalLocation();
  if(!shouldShowMainHeader(pathname))return null;

  const activePlace=locCtx?.selectedLocation;
  const pillLabel=activePlace?.locality||activePlace?.city||(locCtx?.detecting?'Locating…':'Select Location');

  return (
    <View style={{paddingTop:insets.top,backgroundColor:colors.background,zIndex:1,borderBottomLeftRadius:12,borderBottomRightRadius:12,overflow:'hidden'}}>
      <LinearGradient pointerEvents="none" colors={headerGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
      <View style={{height:66,paddingLeft:8,paddingRight:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <UiElement
          as={Pressable}
          accessibilityRole="link"
          accessibilityLabel={t('navigation.home')}
          hitSlop={{top:8,bottom:8,left:8,right:8}}
          onPress={()=>{if(pathname!=='/')router.dismissTo('/');}}
          style={{width:154,minHeight:52,justifyContent:'center',flexShrink:1}}
        >
          <Image
            source={mode==='light'?require('../../assets/brand/lockup-light.png'):require('../../assets/brand/lockup-dark.png')}
            accessibilityLabel="VISTRAH"
            resizeMode="contain"
            style={{width:'100%',height:48,transform:[{translateX:-22}]}}
          />
        </UiElement>

        <View style={{flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Location: ${pillLabel}`}
            onPress={()=>{
              if(pathname!=='/location')router.push('/location');
            }}
            style={({pressed})=>({
              flexDirection:'row',
              alignItems:'center',
              gap:5,
              maxWidth:176,
              minHeight:36,
              paddingHorizontal:10,
              paddingVertical:6,
              borderRadius:999,
              backgroundColor:mode==='light'?'rgba(255,255,255,0.88)':'rgba(15,35,61,0.88)',
              borderWidth:1,
              borderColor:activePlace?colors.accent:(mode==='light'?'#cbd5e1':'#1e3a5f'),
              opacity:pressed?0.82:1,
            })}
          >
            <Feather name="map-pin" size={13} color={colors.accent}/>
            <Text
              numberOfLines={1}
              style={{
                fontSize:12,
                fontWeight:'600',
                color:colors.text,
                flexShrink:1,
              }}
            >
              {pillLabel}
            </Text>
            <Feather name="chevron-down" size={13} color={colors.muted}/>
          </Pressable>

          {showBack&&<BackButton/>}
          <SettingsButton/>
        </View>
      </View>
    </View>
  );
}
