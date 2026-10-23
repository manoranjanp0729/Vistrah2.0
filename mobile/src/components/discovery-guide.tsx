import {Text} from './typography';
import {UiText} from "./localized-ui";
import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {LinearGradient} from 'expo-linear-gradient';
import brandTheme from '../../../shared/brand-theme.json';
import copy from '../lib/interface-copy';
import {useTheme} from '../lib/theme';

const shortcuts = {
  jobs: {route: '/service/find-jobs', icon: 'briefcase', gradient: ['#2563eb', '#3b82f6']},
  discovery: {route: '/discover-more', icon: 'compass', gradient: ['#7c3aed', '#a855f7']},
  employer: {route: '/employer-jobs', icon: 'users', gradient: ['#059669', '#10b981']},
} as const;

export function DiscoveryGuide() {
  const {colors, styles, mode, accentGradient} = useTheme();
  const [journey, setJourney] = useState<'customer' | 'provider'>('customer');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(true);

  const content = copy.engagement;
  const selected = content[journey];

  return (
    <View style={{gap: 24, marginVertical: 10}}>
      {/* 1. INTERACTIVE PATHWAY SECTION */}
      <View style={{gap: 12}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <LinearGradient
            colors={accentGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={{paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10}}
          >
            <Text style={{color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2}}>
              <UiText value={"DISCOVERY PATHWAY "}/></Text>
          </LinearGradient>
        </View>

        <Text style={[styles.heading, {fontSize: 21, fontWeight: '800', letterSpacing: -0.2}]}>
          <UiText value={content.title} />
        </Text>
        <Text style={[styles.muted, {fontSize: 13, marginTop: -4, lineHeight: 18}]}>
          <UiText value={content.intro} />
        </Text>

        {/* Dual Journey Segmented Control */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: mode === 'dark' ? '#211e2c' : '#f0ecf7',
            padding: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: mode === 'dark' ? '#393246' : '#e2dbef',
            gap: 4,
          }}
        >
          {(['customer', 'provider'] as const).map(value => {
            const isSelected = journey === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}
                onPress={() => setJourney(value)}
                style={{flex: 1, borderRadius: 16, overflow: 'hidden'}}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={accentGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Feather
                      name={value === 'customer' ? 'shopping-bag' : 'briefcase'}
                      size={14}
                      color="#fff"
                    />
                    <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>
                      <UiText value={value === 'customer' ? content.customerLabel : content.providerLabel} />
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Feather
                      name={value === 'customer' ? 'shopping-bag' : 'briefcase'}
                      size={14}
                      color={colors.muted}
                    />
                    <Text style={{color: colors.text, fontSize: 13, fontWeight: '600'}}>
                      <UiText value={value === 'customer' ? content.customerLabel : content.providerLabel} />
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Selected Journey Step Card */}
        <View
          style={[
            styles.card,
            {
              borderRadius: 22,
              padding: 20,
              gap: 16,
              borderWidth: 1,
              borderColor: mode === 'dark' ? '#393246' : '#e2dbef',
              backgroundColor: mode === 'dark' ? '#211e2c' : '#ffffff',
              shadowColor: brandTheme.gradient[1],
              shadowOffset: {width: 0, height: 6},
              shadowOpacity: mode === 'dark' ? 0.22 : 0.08,
              shadowRadius: 14,
              elevation: 3,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1}}>
              <UiText value={selected.eyebrow} />
            </Text>
            <Text accessibilityRole="header" style={[styles.heading, {fontSize: 18, fontWeight: '800'}]}>
              <UiText value={selected.title} />
            </Text>
            <Text style={[styles.muted, {fontSize: 13, lineHeight: 19}]}>
              <UiText value={selected.description} />
            </Text>
          </View>

          {/* Steps */}
          <View style={{gap: 10}}>
            {selected.steps.map((step, index) => (
              <View
                key={step.title}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                  backgroundColor: mode === 'dark' ? '#29243d' : '#f9f7fd',
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#393246' : '#ece5f7',
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{color: '#fff', fontSize: 11, fontWeight: '800'}}>
                    0{index + 1}
                  </Text>
                </View>
                <View style={{flex: 1, gap: 2}}>
                  <Text style={[styles.text, {fontWeight: '700', fontSize: 13}]}>
                    <UiText value={step.title} />
                  </Text>
                  <Text style={[styles.muted, {fontSize: 12, lineHeight: 17}]}>
                    <UiText value={step.description} />
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(journey === 'customer' ? '/services' : '/provider')}
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
              }}
            >
              <Text style={{color: '#fff', fontWeight: '800', fontSize: 14}}>
                <UiText value={selected.action} />
              </Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </LinearGradient>
          </Pressable>

          <Text style={[styles.muted, {fontSize: 11, textAlign: 'center', lineHeight: 16}]}>
            <UiText value={selected.note} />
          </Text>
        </View>
      </View>

      {/* 2. EXPLORE MORE PATHWAYS (SHORTCUT TILES) */}
      <View style={{gap: 12}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: mode === 'dark' ? '#2c2542' : '#ebdffc',
            }}
          >
            <Text style={{color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1}}>
              <UiText value={"EXPLORE HORIZONS "}/></Text>
          </View>
        </View>
        <Text style={[styles.heading, {fontSize: 18, fontWeight: '800'}]}>
          <UiText value={content.shortcutsTitle} />
        </Text>

        <View style={{gap: 10}}>
          {content.shortcuts.map(item => {
            const target = shortcuts[item.key as keyof typeof shortcuts];
            const iconName = target?.icon ?? 'compass';
            const gradientColors = target?.gradient ?? [brandTheme.gradient[0], brandTheme.gradient[1]];
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.title + '. ' + item.action}
                onPress={() => target && router.push(target.route as any)}
                style={({pressed}) => [
                  styles.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 14,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: mode === 'dark' ? '#393246' : '#e6e0f0',
                    backgroundColor: mode === 'dark' ? '#211e2c' : '#ffffff',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={[gradientColors[0], gradientColors[1]]}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name={iconName} size={20} color="#fff" />
                </LinearGradient>
                <View style={{flex: 1, gap: 2}}>
                  <Text style={[styles.text, {fontWeight: '700', fontSize: 14}]}>
                    <UiText value={item.title} />
                  </Text>
                  <Text style={[styles.muted, {fontSize: 12, lineHeight: 16}]} numberOfLines={2}>
                    <UiText value={item.description} />
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: mode === 'dark' ? '#2c2542' : '#f0ecf7',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{color: colors.accent, fontWeight: '700', fontSize: 11}}>
                    <UiText value={item.action} />
                  </Text>
                  <Feather name="arrow-right" size={12} color={colors.accent} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. A FEW THINGS WORTH KNOWING (FAQ) */}
      <View style={{gap: 12}}>
        <Pressable
          onPress={() => setShowFaq(prev => !prev)}
          style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}
        >
          <View style={{gap: 2}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: mode === 'dark' ? '#2c2542' : '#ebdffc',
                }}
              >
                <Text style={{color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1}}>
                  <UiText value={"FREQUENT QUESTIONS "}/></Text>
              </View>
            </View>
            <Text style={[styles.heading, {fontSize: 18, fontWeight: '800'}]}>
              <UiText value={content.faqTitle} />
            </Text>
          </View>
          <Feather name={showFaq ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
        </Pressable>

        {showFaq && (
          <View style={{gap: 8}}>
            {content.faq.map(item => {
              const isItemOpen = openQuestion === item.question;
              return (
                <Pressable
                  key={item.question}
                  accessibilityRole="button"
                  accessibilityState={{expanded: isItemOpen}}
                  onPress={() => setOpenQuestion(isItemOpen ? null : item.question)}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: mode === 'dark' ? '#393246' : '#e6e0f0',
                    backgroundColor: mode === 'dark' ? '#211e2c' : '#ffffff',
                    padding: 14,
                    gap: isItemOpen ? 8 : 0,
                  }}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
                    <Text style={[styles.text, {flex: 1, fontWeight: '600', fontSize: 13}]}>
                      <UiText value={item.question} />
                    </Text>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: mode === 'dark' ? '#29243d' : '#f3effa',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name={isItemOpen ? 'minus' : 'plus'} size={14} color={colors.accent} />
                    </View>
                  </View>
                  {isItemOpen && (
                    <Text style={[styles.muted, {fontSize: 12, lineHeight: 17, paddingTop: 4}]}>
                      <UiText value={item.answer} />
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
