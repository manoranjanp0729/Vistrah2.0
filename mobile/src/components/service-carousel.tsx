import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AppState,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {router, useFocusEffect, type Href} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {UiElement} from './localized-ui';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {
  HERO_BANNERS,
  HERO_BANNER_ASPECT_RATIO,
  type HeroBannerKey,
} from '../../../shared/hero-banners';

const BANNER_IMAGES: Record<HeroBannerKey, ImageSourcePropType> = {
  users: require('../../assets/hero-journey/for-users-widescreen.jpg'),
  businesses: require('../../assets/hero-journey/for-businesses-widescreen.jpg'),
  ads: require('../../assets/hero-journey/v-ads-widescreen.jpg'),
  agri: require('../../assets/hero-journey/agriconnect-widescreen.jpg'),
  health: require('../../assets/hero-journey/healthconnect-family-banner.jpg'),
};

export function ServiceCarousel() {
  const {colors, mode} = useTheme();
  const isDark = mode === 'dark';

  const scroll = useRef<ScrollView>(null);
  const frame = useRef<View>(null);
  const current = useRef(0);
  const offset = useRef(0);
  const dragging = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [interaction, setInteraction] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof IntersectionObserver === 'undefined' ||
      !frame.current
    ) {
      return;
    }
    const observer = new IntersectionObserver(entries =>
      setVisible(entries[0]?.isIntersecting ?? false),
    );
    observer.observe(frame.current as unknown as Element);
    return () => observer.disconnect();
  }, []);

  const settle = useCallback(() => {
    if (!width || dragging.current) return;
    const next = Math.max(
      0,
      Math.min(HERO_BANNERS.length - 1, Math.round(offset.current / width)),
    );
    const target = next * width;
    if (Math.abs(offset.current - target) > 0.1) {
      scroll.current?.scrollTo({x: target, animated: false});
    }
    offset.current = target;
    current.current = next;
    setIndex(next);
    setInteracting(false);
    setInteraction(value => value + 1);
  }, [width]);

  const scheduleSettle = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, 180);
  };

  const beginInteraction = () => {
    dragging.current = true;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    setInteracting(true);
  };

  const endInteraction = () => {
    dragging.current = false;
    scheduleSettle();
  };

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [width],
  );

  useFocusEffect(
    useCallback(() => {
      if (!width || !active || !visible || interacting) return;
      const timer = setInterval(() => {
        setInteracting(true);
        scroll.current?.scrollTo({
          x: ((current.current + 1) % HERO_BANNERS.length) * width,
          animated: true,
        });
        scheduleSettle();
      }, 5000);
      return () => clearInterval(timer);
    }, [width, active, visible, interacting, interaction]),
  );

  const slideSize = {width, height: width / HERO_BANNER_ASPECT_RATIO};

  useEffect(() => {
    if (!width) return;
    const handle = requestAnimationFrame(() => {
      offset.current = current.current * width;
      scroll.current?.scrollTo({x: offset.current, animated: false});
    });
    return () => cancelAnimationFrame(handle);
  }, [width]);

  const jumpTo = (targetIdx: number) => {
    if (!width) return;
    current.current = targetIdx;
    offset.current = targetIdx * width;
    setIndex(targetIdx);
    scroll.current?.scrollTo({x: targetIdx * width, animated: true});
    setInteraction(v => v + 1);
  };

  const currentBanner = HERO_BANNERS[index] ?? HERO_BANNERS[0];

  const surface = isDark ? '#18181b' : '#ffffff';
  const surfaceSoft = isDark ? '#111113' : '#f8fafc';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
  const textPrimary = isDark ? '#fafafa' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#475569';

  return (
    <View
      ref={frame}
      style={[
        s.cardWrap,
        {
          backgroundColor: surface,
          borderColor: hairline,
        },
      ]}
    >
      <View style={{width: '100%', aspectRatio: HERO_BANNER_ASPECT_RATIO}}>
        <ScrollView
          ref={scroll}
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={() => {
            if (width) {
              offset.current = current.current * width;
              scroll.current?.scrollTo({x: offset.current, animated: false});
            }
          }}
          style={{flex: 1}}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          removeClippedSubviews={false}
          contentContainerStyle={{height: slideSize.height, paddingHorizontal: 0, gap: 0}}
          horizontal
          snapToOffsets={
            width ? HERO_BANNERS.map((_, position) => position * width) : undefined
          }
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onTouchStart={beginInteraction}
          onTouchEnd={endInteraction}
          onTouchCancel={endInteraction}
          onScrollBeginDrag={beginInteraction}
          onScrollEndDrag={endInteraction}
          onScroll={event => {
            offset.current = event.nativeEvent.contentOffset.x;
            if (!dragging.current) scheduleSettle();
          }}
          onMomentumScrollEnd={event => {
            offset.current = event.nativeEvent.contentOffset.x;
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settle();
          }}
        >
          {(width > 0 ? HERO_BANNERS : []).map(slide => (
            <Pressable
              key={slide.key}
              accessibilityRole="link"
              accessibilityLabel={`${slide.badge}: ${slide.title}`}
              onPress={() => router.push(slide.storyPath as Href)}
              style={[
                slideSize,
                {
                  flexGrow: 0,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                },
              ]}
            >
              <Image
                source={BANNER_IMAGES[slide.key]}
                resizeMode="cover"
                accessible={false}
                style={slideSize}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[s.controlBar, {borderTopColor: hairline}]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(currentBanner.storyPath as Href)}
          style={({pressed}) => [s.cueBtn, {opacity: pressed ? 0.75 : 1}]}
        >
          <Text style={[s.stepCount, {color: textPrimary}]}>
            {currentBanner.stepNumber} / 05
          </Text>
          <Text style={[s.cueText, {color: textSecondary}]}>
            {currentBanner.navTitle} · Open guide →
          </Text>
        </Pressable>

        <UiElement
          as={View}
          accessibilityLabel={`Journey slide ${index + 1} of 5`}
          style={s.dotsRow}
        >
          {HERO_BANNERS.map((slide, position) => (
            <Pressable
              key={slide.key}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Show banner ${position + 1}: ${slide.badge}`}
              onPress={() => jumpTo(position)}
            >
              <View
                style={{
                  width: position === index ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: position === index ? colors.accent : colors.muted,
                  opacity: position === index ? 1 : 0.4,
                }}
              />
            </Pressable>
          ))}
        </UiElement>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(currentBanner.storyPath as Href)}
          style={({pressed}) => [
            s.directPill,
            {
              backgroundColor: surfaceSoft,
              borderColor: hairline,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[s.directPillText, {color: textPrimary}]}>
            {currentBanner.primaryCta.shortLabel}
          </Text>
          <Feather name="arrow-right" size={12} color={textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cardWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  controlBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  stepCount: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cueText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  directPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
