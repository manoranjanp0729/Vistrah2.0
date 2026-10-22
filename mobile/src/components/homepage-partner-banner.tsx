import {UiText} from "./localized-ui";
import {Platform, Pressable, Text, View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {useLanguage} from '../lib/language';
import {useTheme} from '../lib/theme';

export function HomepagePartnerBanner() {
  const {accentGradient} = useTheme();
  const {copy, t} = useLanguage();

  return (
    <LinearGradient
      colors={accentGradient}
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
        shadowColor: '#283db6',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
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
          backgroundColor: '#7741c4',
          opacity: 0.25,
        }}
      />

      {/* Top Header Badge */}
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <LinearGradient
          colors={accentGradient}
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
          <Text style={{color: '#c2b2df', fontSize: 11, fontWeight: '600'}}><UiText value={"Verified Network"}/></Text>
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
        <Text style={{color: '#d8ccf0', fontSize: 13, lineHeight: 19}}>
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
            <Feather name={prop.icon as any} size={15} color="#c084fc" />
            <Text style={{color: '#e9d5ff', fontSize: 12, fontWeight: '600'}}>
              {prop.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{gap: 8, marginTop: 4}}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/provider')}
          style={({pressed}) => [{borderRadius: 16, overflow: 'hidden', opacity: pressed ? 0.9 : 1}]}
        >
          <LinearGradient
            colors={accentGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              flexDirection: 'row',
              gap: 8,
              shadowColor: '#7741c4',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text style={{color: '#ffffff', fontWeight: '800', fontSize: 14}}>
              <UiText value={copy.home.provider} /> →
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/membership')}
          style={({pressed}) => [
            {
              paddingVertical: 11,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#4a336e',
              backgroundColor: '#20163660',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <LinearGradient pointerEvents="none" colors={accentGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:"absolute",top:0,left:0,right:0,bottom:0,borderRadius:15}}/>
          <Text style={{color: '#ffffff', fontWeight: '700', fontSize: 13}}>
            <UiText value={"Explore Partner Membership Plans "}/></Text>
        </Pressable>
      </View>

      {/* Review Reassurance */}
      <Text style={{color: '#a795c6', fontSize: 11, textAlign: 'center', lineHeight: 15, marginTop: 2}}>
        <UiText value={copy.home.review} />
      </Text>
    </LinearGradient>
  );
}
