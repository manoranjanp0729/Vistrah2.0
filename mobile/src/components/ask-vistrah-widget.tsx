import { createElement, useId, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { api, ApiError } from '../lib/api';
import { useTheme } from '../lib/theme';
import { Text, TextInput } from './typography';
import {
  ASTRA_AGENT_NAME,
  ASTRA_STARTERS,
  ASTRA_WELCOME,
  GEMINI_BRAND_LABEL,
  GEMINI_SPARK_PATH,
  GEMINI_SPARK_VIEWBOX,
  normalizeSuggestedActions,
  sanitizeChatActionHref,
  type AskVistrahHistoryItem,
  type AskVistrahMessage,
  type AskVistrahResponse,
} from '../../../shared/ask-vistrah';

const GEMINI_SPARK_PNG = require('../../assets/google/gemini-spark.png');

function MobileGeminiLogo({ size = 16 }: { size?: number }) {
  const gradId = useId();
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: GEMINI_SPARK_VIEWBOX,
        'aria-hidden': 'true',
        'data-gemini-spark': 'true',
        style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
      },
      createElement(
        'defs',
        null,
        createElement(
          'linearGradient',
          { id: gradId, x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
          createElement('stop', { offset: '0%', stopColor: '#4285F4' }),
          createElement('stop', { offset: '50%', stopColor: '#9B72CB' }),
          createElement('stop', { offset: '100%', stopColor: '#D96570' }),
        ),
      ),
      createElement('path', { d: GEMINI_SPARK_PATH, fill: `url(#${gradId})` }),
    );
  }
  return (
    <Image
      source={GEMINI_SPARK_PNG}
      accessibilityLabel="Google Gemini"
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}

function navigateChatHref(rawHref: string, onDone: () => void) {
  const safe = sanitizeChatActionHref(rawHref);
  if (!safe) return;
  const parsed = new URL(safe, 'https://vistrah.in');
  const params = Object.fromEntries(parsed.searchParams.entries());
  onDone();
  if (parsed.pathname === '/services') {
    router.push({ pathname: '/services', params });
  } else if (parsed.pathname === '/services/nearby') {
    router.push({ pathname: '/services/nearby', params });
  } else if (parsed.pathname === '/seller/onboard') {
    router.push({ pathname: '/seller/onboard', params });
  } else if (parsed.pathname === '/v-ads') {
    router.push('/v-ads');
  } else if (parsed.pathname === '/location') {
    router.push('/location');
  } else if (parsed.pathname === '/agri-connect') {
    router.push('/agri-connect');
  } else if (parsed.pathname === '/health-connect') {
    router.push('/health-connect');
  } else if (parsed.pathname === '/marketing-pricing' || parsed.pathname === '/pricing') {
    router.push('/marketing-pricing');
  } else if (parsed.pathname === '/jobs') {
    router.push('/jobs');
  } else if (parsed.pathname === '/membership') {
    router.push('/membership');
  } else if (parsed.pathname === '/contact') {
    router.push({ pathname: '/contact', params });
  } else {
    router.push('/services');
  }
}

export function MobileAskVistrahWidget() {
  const pathname = usePathname();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskVistrahMessage[]>([ASTRA_WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx <= -22) {
            setOpen(true);
          }
        },
      }),
    [],
  );

  if (pathname === '/settings') return null;

  async function sendQuestion(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || busy) return;

    const userMsg: AskVistrahMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const history: AskVistrahHistoryItem[] = messages
      .filter(m => m.id !== 'welcome' && !m.isError)
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    setInput('');
    setBusy(true);
    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    try {
      const res = await api<AskVistrahResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, history }),
      });
      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          suggestedActions: normalizeSuggestedActions(res.suggestedActions),
        },
      ]);
    } catch (err) {
      const isRateLimited = err instanceof ApiError && err.status === 429;
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: isRateLimited
            ? 'Astra is receiving many questions right now. Please pause ~30 seconds or use the quick links below.'
            : (err as Error).message ||
              'Could not reach Astra right now. You can browse verified local services or list your business below.',
          suggestedActions: [
            { label: 'Browse Services', href: '/services' },
            { label: 'List Your Business', href: '/seller/onboard' },
          ],
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <View pointerEvents="box-none" style={s.overlay} testID="astra-widget">
      {open && (
        <View
          style={[
            s.panel,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(249,115,22,0.4)' : 'rgba(15,41,74,0.16)',
            },
          ]}
        >
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={{ gap: 2 }}>
                <Text style={s.headerTitle}>{ASTRA_AGENT_NAME}</Text>
                <View style={s.poweredRow}>
                  <Text style={s.headerSubtitle}>{GEMINI_BRAND_LABEL}</Text>
                  <MobileGeminiLogo size={10} />
                </View>
              </View>
            </View>
            <View style={s.headerRight}>
              <View style={s.sparkleBadge}>
                <MobileGeminiLogo size={15} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minimize Astra"
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={s.closeBtn}
              >
                <Feather name="x" size={16} color="#f8fafc" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg =>
              msg.role === 'user' ? (
                <View key={msg.id} style={s.userRow}>
                  <View
                    style={[
                      s.userBubble,
                      { backgroundColor: isDark ? '#f97316' : '#0f294a' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: '#ffffff',
                        fontWeight: isDark ? '600' : '400',
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ) : (
                <View key={msg.id} style={s.botRow}>
                  <View
                    style={[
                      s.botBubble,
                      {
                        backgroundColor: isDark ? '#132f54' : '#f1f5f9',
                        borderColor: msg.isError ? 'rgba(220,38,38,0.45)' : 'transparent',
                        borderWidth: msg.isError ? 1 : 0,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, lineHeight: 19, color: colors.text }}>
                      {msg.content}
                    </Text>
                  </View>
                  {Boolean(msg.suggestedActions?.length) && (
                    <View style={s.actionsWrap}>
                      {msg.suggestedActions!.map(act => (
                        <Pressable
                          key={`${msg.id}-${act.href}`}
                          accessibilityRole="button"
                          onPress={() => navigateChatHref(act.href, () => setOpen(false))}
                          style={[
                            s.actionChip,
                            {
                              backgroundColor: isDark ? 'rgba(249,115,22,0.16)' : '#fff7ed',
                              borderColor: 'rgba(249,115,22,0.55)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isDark ? '#fed7aa' : '#ea580c',
                            }}
                          >
                            {act.label}
                          </Text>
                          <Feather
                            name="arrow-up-right"
                            size={12}
                            color={isDark ? '#fed7aa' : '#ea580c'}
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ),
            )}

            {messages.length <= 2 && !busy && (
              <View style={s.startersWrap}>
                {ASTRA_STARTERS.map(starter => (
                  <Pressable
                    key={starter}
                    accessibilityRole="button"
                    onPress={() => void sendQuestion(starter)}
                    style={[
                      s.starterChip,
                      {
                        backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : '#f8fafc',
                        borderColor: isDark ? 'rgba(249,115,22,0.38)' : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {starter}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {busy && (
              <View style={s.botRow}>
                <View
                  style={[
                    s.botBubble,
                    { backgroundColor: isDark ? '#132f54' : '#f1f5f9' },
                  ]}
                >
                  <Text style={{ fontSize: 13, color: colors.muted }}>Thinking…</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              s.composer,
              {
                borderTopColor: colors.border,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              maxLength={600}
              placeholder="Ask Astra about services, onboarding…"
              placeholderTextColor={colors.muted}
              returnKeyType="send"
              onSubmitEditing={() => void sendQuestion(input)}
              style={[
                s.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send question"
              disabled={busy || !input.trim()}
              onPress={() => void sendQuestion(input)}
              style={[
                s.sendBtn,
                {
                  backgroundColor: '#f97316',
                  opacity: busy || !input.trim() ? 0.45 : 1,
                },
              ]}
            >
              <Feather
                name="send"
                size={14}
                color="#ffffff"
              />
            </Pressable>
          </View>
        </View>
      )}

      <View {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close Astra' : 'Astra — Powered by Google Gemini'}
          onPress={() => setOpen(v => !v)}
          style={({ pressed }) => [s.launcher, { opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={s.launcherTextCol}>
            <Text style={s.launcherTitle}>{ASTRA_AGENT_NAME}</Text>
            <Text style={s.poweredText}>{GEMINI_BRAND_LABEL}</Text>
          </View>
          <MobileGeminiLogo size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: 0,
    bottom: 84,
    zIndex: 900,
    alignItems: 'flex-end',
    gap: 10,
  },
  launcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 46,
    paddingLeft: 16,
    paddingRight: 13,
    paddingVertical: 8,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    backgroundColor: '#0f294a',
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: 'rgba(249,115,22,0.72)',
    shadowColor: '#0f294a',
    shadowOffset: { width: -2, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 6,
  },
  launcherTextCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
  },
  launcherTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  poweredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poweredText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 11,
  },
  panel: {
    marginRight: 12,
    width: 332,
    maxWidth: '92%',
    maxHeight: 460,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0f294a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#0f294a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249,115,22,0.35)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 13,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 300,
  },
  scrollContent: {
    padding: 12,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  botRow: {
    gap: 6,
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    maxWidth: '93%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  startersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  starterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
