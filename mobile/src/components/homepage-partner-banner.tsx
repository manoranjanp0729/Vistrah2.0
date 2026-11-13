import {BannerGeometry} from './banner-geometry';
import {Text} from './typography';
import {Action} from './ui';
import {UiText} from "./localized-ui";
import {Platform,View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {useLanguage} from '../lib/language';
import {useBannerTheme} from '../lib/banner-theme';

export function HomepagePartnerBanner() {
  const banner = useBannerTheme();
  const {copy, t} = useLanguage();

  return (
    <LinearGradient
      colors={banner.gradient}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={{
        borderRadius: 24,
        padding: 22,
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 8,
        shadowColor: banner.shadow,
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <BannerGeometry/>
      {/* Decorative ambient glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: banner.glow,
          opacity: 0.25,
        }}
      />

      {/* Top Header Badge */}
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <LinearGradient
          colors={banner.gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10}}
        >
          <Text style={{color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2}}>
            ⭐ {t('home.badge') || 'FEATURED OPPORTUNITY'}
          </Text>
        </LinearGradient>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
          <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399'}} />
          <Text style={{color: banner.muted, fontSize: 11, fontWeight: '600'}}><UiText value={"Verified Network"}/></Text>
        </View>
      </View>

      {/* Title & Copy */}
      <View style={{gap: 6}}>
        <Text
          accessibilityRole="header"
          style={{
            color: '#ffffff',
            fontSize: Platform.OS === 'android' ? 22 : 20,
            lineHeight: Platform.OS === 'android' ? 28 : 25,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          <UiText value={copy.home.business} />
        </Text>
        <Text style={{color: banner.muted, fontSize: 13, lineHeight: 19}}>
          <UiText value={copy.home.businessDescription} />
        </Text>
      </View>

      {/* Key Highlights */}
      <View style={{gap: 8, paddingVertical: 2}}>
        {[
          {icon: 'check-circle', text: 'Verified Business Profile & Credibility'},
          {icon: 'users', text: 'Direct, Real-time Customer Inquiries'},
          {icon: 'video', text: 'Showcase Your Work on V Ads Reels'},
        ].map((prop, idx) => (
          <View key={idx} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Feather name={prop.icon as React.ComponentProps<typeof Feather>['name']} size={15} color={banner.text} />
            <Text style={{color: banner.muted, fontSize: 12, fontWeight: '600'}}>
              {prop.text}
            </Text>
          </View>
        ))}
      </View>

      {/* White actions remain distinct from the colourful banner. */}
      <View style={{gap:8,marginTop:4}}>
        <Action onColor label={copy.home.provider} onPress={()=>router.push('/provider')}/>
        <Action onColor label="Explore Partner Membership Plans" onPress={()=>router.push('/membership')}/>
      </View>

      {/* Review Reassurance */}
      <Text style={{color: banner.muted, fontSize: 11, textAlign: 'center', lineHeight: 15, marginTop: 2}}>
        <UiText value={copy.home.review} />
      </Text>
    </LinearGradient>
  );
}
