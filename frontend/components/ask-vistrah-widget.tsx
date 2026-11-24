'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Send, X } from 'lucide-react';
import {
  ASTRA_AGENT_NAME,
  ASTRA_PEEK_TRANSLATE_PERCENT,
  ASTRA_STARTERS,
  ASTRA_WELCOME,
  GEMINI_BRAND_LABEL,
  GEMINI_SPARK_PATH,
  GEMINI_SPARK_VIEWBOX,
  createAstraLauncherController,
  normalizeSuggestedActions,
  type AskVistrahHistoryItem,
  type AskVistrahMessage,
  type AstraLauncherState,
} from '../../shared/ask-vistrah';
import s from './ask-vistrah-widget.module.css';

const SESSION_KEY = 'vistrah.astra_chat.v1';

function GeminiLogo({ size = 16 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={GEMINI_SPARK_VIEWBOX}
      aria-hidden="true"
      data-gemini-spark="true"
      style={{ flexShrink: 0, display: 'inline-block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="55%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path d={GEMINI_SPARK_PATH} fill={`url(#${gradId})`} />
    </svg>
  );
}

export type AskVistrahWidgetProps = {
  initialPeek?: boolean;
  initialTopPx?: number;
};

export function AskVistrahWidget({
  initialPeek = false,
  initialTopPx,
}: AskVistrahWidgetProps) {
  const controllerRef = useRef<ReturnType<typeof createAstraLauncherController> | null>(null);
  const [ui, setUi] = useState<AstraLauncherState>(() => {
    const initial = createAstraLauncherController({ initialPeek, initialTopPx });
    return initial.getState();
  });
  const [hydrated, setHydrated] = useState(initialTopPx !== undefined);
  const [messages, setMessages] = useState<AskVistrahMessage[]>([ASTRA_WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : null;
    const ctrl = createAstraLauncherController({
      initialViewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
      initialPeek,
      initialTopPx,
      storage,
      onChange: next => setUi(next),
    });
    controllerRef.current = ctrl;
    ctrl.hydrateFromStorage(typeof window !== 'undefined' ? window.innerHeight : 800, storage);
    setHydrated(true);

    function onResize() {
      ctrl.resize(window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AskVistrahMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.slice(-16));
        }
      }
    } catch {
      // Ignore storage access errors in private browsing
    }

    return () => {
      window.removeEventListener('resize', onResize);
      ctrl.dispose();
    };
  }, [initialPeek, initialTopPx]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-16)));
    } catch {
      // Ignore storage quota errors
    }
    if (ui.open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, ui.open]);

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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        reply?: string;
        detail?: string;
        suggestedActions?: Array<{ label?: string; href?: string }>;
      };

      if (res.status === 429) {
        setMessages(prev => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'assistant',
            content:
              body.reply ||
              body.detail ||
              'Astra is receiving high traffic right now. Please wait ~30 seconds or use the direct links below.',
            suggestedActions: normalizeSuggestedActions(
              body.suggestedActions ?? [
                { label: 'Browse Services', href: '/services' },
                { label: 'List Your Business', href: '/seller/onboard' },
              ],
            ),
            isError: true,
          },
        ]);
        return;
      }

      if (!res.ok || !body.reply) {
        throw new Error(body.detail || 'Astra is temporarily unavailable.');
      }

      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'assistant',
          content: body.reply!,
          suggestedActions: normalizeSuggestedActions(body.suggestedActions),
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content:
            (err as Error).message ||
            'Could not reach Astra right now. You can still browse verified local services or list your business directly.',
          suggestedActions: [
            { label: 'Browse Services', href: '/services' },
            { label: 'List Your Business', href: '/seller/onboard' },
          ],
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const isDragging = ui.isDraggingY || ui.isDraggingX;
  const launcherStyle: CSSProperties = {};
  if (hydrated) {
    launcherStyle.top = `${ui.topPx}px`;
    launcherStyle.bottom = 'auto';
  }
  if (ui.isDraggingX && ui.pullX < 0) {
    launcherStyle.transform = `translateX(${ui.pullX}px)`;
  } else if (ui.isPeek && !ui.open) {
    launcherStyle.transform = `translateX(${ASTRA_PEEK_TRANSLATE_PERCENT}%)`;
  }

  const launcherClassName = [
    s.launcher,
    ui.isPeek && !ui.open ? s.launcherPeek : '',
    isDragging ? s.launcherDragging : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={s.root}
      data-ask-vistrah="true"
      data-astra="true"
      data-docked-edge="right"
    >
      {ui.open && (
        <section
          className={s.panel}
          role="dialog"
          aria-label="Astra — VISTRAH AI Assistant Powered by Google Gemini"
        >
          <header className={s.header}>
            <div className={s.headerBrand}>
              <div>
                <h2 className={s.headerTitle}>{ASTRA_AGENT_NAME}</h2>
                <p className={s.headerSubtitle}>
                  <span>{GEMINI_BRAND_LABEL}</span>
                  <GeminiLogo size={11} />
                </p>
              </div>
            </div>
            <div className={s.headerRight}>
              <span className={s.headerBadge} aria-hidden="true">
                <GeminiLogo size={16} />
              </span>
              <button
                type="button"
                className={s.closeBtn}
                aria-label="Minimize Astra"
                onClick={() => controllerRef.current?.closeChat()}
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className={s.messages}>
            {messages.map(msg =>
              msg.role === 'user' ? (
                <div key={msg.id} className={s.bubbleRowUser}>
                  <div className={s.userBubble}>{msg.content}</div>
                </div>
              ) : (
                <div key={msg.id} className={s.bubbleRowBot}>
                  <div className={`${s.botBubble} ${msg.isError ? s.errorBubble : ''}`}>
                    {msg.content}
                  </div>
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className={s.actionsRow}>
                      {msg.suggestedActions.map(act => (
                        <Link
                          key={`${msg.id}-${act.href}`}
                          href={act.href}
                          className={s.actionLink}
                          onClick={() => controllerRef.current?.closeChat()}
                        >
                          <span>{act.label}</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {messages.length <= 2 && !busy && (
              <div className={s.startersWrap} aria-label="Suggested questions">
                {ASTRA_STARTERS.map(starter => (
                  <button
                    key={starter}
                    type="button"
                    className={s.starterChip}
                    disabled={busy}
                    onClick={() => void sendQuestion(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className={s.bubbleRowBot}>
                <div className={s.botBubble} role="status">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            className={s.composer}
            onSubmit={e => {
              e.preventDefault();
              void sendQuestion(input);
            }}
          >
            <input
              type="text"
              className={s.input}
              value={input}
              maxLength={600}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Astra about services, onboarding, V Ads…"
              aria-label="Ask Astra a question"
            />
            <button
              type="submit"
              className={s.sendBtn}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={launcherClassName}
        aria-expanded={ui.open}
        aria-label={ui.open ? 'Close Astra chat' : 'Open Astra — Powered by Google Gemini'}
        data-astra-peek={ui.isPeek && !ui.open ? 'true' : 'false'}
        data-astra-dragging={isDragging ? 'true' : 'false'}
        style={launcherStyle}
        onPointerEnter={() => controllerRef.current?.pointerEnter()}
        onPointerLeave={() => controllerRef.current?.pointerLeave()}
        onFocus={() => controllerRef.current?.focus()}
        onBlur={() => controllerRef.current?.blur()}
        onPointerDown={e => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          controllerRef.current?.pointerDown({
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
            viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
          });
        }}
        onPointerMove={e => {
          controllerRef.current?.pointerMove({
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
            viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
          });
        }}
        onPointerUp={e => {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          controllerRef.current?.pointerUp(
            {
              pointerId: e.pointerId,
              clientX: e.clientX,
              clientY: e.clientY,
              viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
            },
            typeof window !== 'undefined' ? window.sessionStorage : null,
          );
        }}
        onPointerCancel={e => {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          controllerRef.current?.pointerCancel(e.pointerId);
        }}
        onClick={() => {
          controllerRef.current?.click();
        }}
      >
        <span className={s.edgeGrip} aria-hidden="true" />
        <span className={s.launcherTextCol}>
          <span className={s.launcherTitle}>{ASTRA_AGENT_NAME}</span>
          <span className={s.launcherPowered}>{GEMINI_BRAND_LABEL}</span>
        </span>
        <span className={s.launcherSparkWrap}>
          <GeminiLogo size={18} />
        </span>
      </button>
    </div>
  );
}
