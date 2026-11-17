import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api, ApiError } from '../lib/api';
import { useTheme } from '../lib/theme';
import { Text, TextInput } from './typography';
import {
  ASK_VISTRAH_STARTERS,
  ASK_VISTRAH_WELCOME,
  normalizeSuggestedActions,
  sanitizeChatActionHref,
  type AskVistrahHistoryItem,
  type AskVistrahMessage,
  type AskVistrahResponse,
} from '../../../shared/ask-vistrah';

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
  } else {
    router.push('/services');
  }
}

export function MobileAskVistrahWidget() {
  const pathname = usePathname();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskVistrahMessage[]>([ASK_VISTRAH_WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
            ? 'Ask VISTRAH is receiving many questions right now. Please pause ~30 seconds or use the quick links below.'
            : (err as Error).message ||
              'Could not reach Ask VISTRAH right now. You can browse services or list your business below.',
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
    <View pointerEvents="box-none" style={s.overlay}>
      {open && (
        <View
          style={[
            s.panel,
            {
              backgroundColor: isDark ? '#141927' : '#ffffff',
              borderColor: isDark ? 'rgba(212,175,55,0.35)' : 'rgba(15,23,42,0.16)',
            },
          ]}
        >
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.sparkleBadge}>
                <Ionicons name="sparkles" size={14} color="#d4af37" />
              </View>
              <View>
                <Text style={s.headerTitle}>Ask VISTRAH</Text>
                <Text style={s.headerSubtitle}>AI Guide · Vistrah India</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minimize Ask VISTRAH"
              onPress={() => setOpen(false)}
              hitSlop={8}
              style={s.closeBtn}
            >
              <Feather name="x" size={16} color="#f8fafc" />
            </Pressable>
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
                      { backgroundColor: isDark ? '#d4af37' : '#0f172a' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: isDark ? '#0f172a' : '#ffffff',
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
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
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
                              backgroundColor: isDark ? 'rgba(212,175,55,0.16)' : '#fffbeb',
                              borderColor: 'rgba(212,175,55,0.6)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isDark ? '#fde68a' : '#92400e',
                            }}
                          >
                            {act.label}
                          </Text>
                          <Feather
                            name="arrow-up-right"
                            size={12}
                            color={isDark ? '#fde68a' : '#92400e'}
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
                {ASK_VISTRAH_STARTERS.map(starter => (
                  <Pressable
                    key={starter}
                    accessibilityRole="button"
                    onPress={() => void sendQuestion(starter)}
                    style={[
                      s.starterChip,
                      {
                        backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#f8fafc',
                        borderColor: isDark ? 'rgba(212,175,55,0.35)' : colors.border,
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
                    { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
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
              placeholder="Ask about services, onboarding…"
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
                  backgroundColor: isDark ? '#d4af37' : '#0f172a',
                  opacity: busy || !input.trim() ? 0.45 : 1,
                },
              ]}
            >
              <Feather
                name="send"
                size={14}
                color={isDark ? '#0f172a' : '#d4af37'}
              />
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close Ask VISTRAH' : 'Ask VISTRAH'}
        onPress={() => setOpen(v => !v)}
        style={({ pressed }) => [s.launcher, { opacity: pressed ? 0.9 : 1 }]}
      >
        <Ionicons name="sparkles" size={15} color="#d4af37" />
        <Text style={s.launcherText}>Ask VISTRAH</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: 14,
    bottom: 84,
    zIndex: 900,
    alignItems: 'flex-end',
    gap: 10,
  },
  launcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.75)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  launcherText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  panel: {
    width: 340,
    maxWidth: '92%',
    maxHeight: 450,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.32)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212,175,55,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: 11,
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
    maxHeight: 320,
  },
  scrollContent: {
    padding: 12,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  botRow: {
    alignItems: 'flex-start',
    gap: 6,
  },
  botBubble: {
    maxWidth: '94%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
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
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
