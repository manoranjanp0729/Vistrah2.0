'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Send, X } from 'lucide-react';
import {
  ASK_VISTRAH_STARTERS,
  ASK_VISTRAH_WELCOME,
  GEMINI_BRAND_LABEL,
  GEMINI_SPARK_PATH,
  GEMINI_SPARK_VIEWBOX,
  normalizeSuggestedActions,
  type AskVistrahHistoryItem,
  type AskVistrahMessage,
} from '../../shared/ask-vistrah';
import s from './ask-vistrah-widget.module.css';

const SESSION_KEY = 'vistrah.ask_chat.v1';

function GeminiLogo({ size = 16 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={GEMINI_SPARK_VIEWBOX}
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path d={GEMINI_SPARK_PATH} fill={`url(#${gradId})`} />
    </svg>
  );
}

export function AskVistrahWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskVistrahMessage[]>([ASK_VISTRAH_WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-16)));
    } catch {
      // Ignore storage quota errors
    }
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

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
              'Ask VISTRAH is receiving high traffic right now. Please wait ~30 seconds or use the direct links below.',
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
        throw new Error(body.detail || 'Ask VISTRAH is temporarily unavailable.');
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
            'Could not reach Ask VISTRAH right now. You can still browse all 800+ services or list your business directly.',
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

  return (
    <div className={s.root} data-ask-vistrah="true">
      {open && (
        <section
          className={s.panel}
          role="dialog"
          aria-label="Ask VISTRAH AI Assistant"
        >
          <header className={s.header}>
            <div className={s.headerBrand}>
              <span className={s.headerBadge} aria-hidden="true">
                <GeminiLogo size={17} />
              </span>
              <div>
                <h2 className={s.headerTitle}>Ask VISTRAH</h2>
                <p className={s.headerSubtitle}>
                  <GeminiLogo size={11} />
                  <span>{GEMINI_BRAND_LABEL}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              className={s.closeBtn}
              aria-label="Minimize Ask VISTRAH"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
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
                          onClick={() => setOpen(false)}
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
                {ASK_VISTRAH_STARTERS.map(starter => (
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
              placeholder="Ask about services, onboarding, V Ads…"
              aria-label="Ask VISTRAH a question"
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
        className={s.launcher}
        aria-expanded={open}
        aria-label={open ? 'Close Ask VISTRAH chat' : 'Open Ask VISTRAH — Powered by Google Gemini'}
        onClick={() => setOpen(v => !v)}
      >
        <GeminiLogo size={20} />
        <span className={s.launcherTextCol}>
          <span className={s.launcherTitle}>Ask VISTRAH</span>
          <span className={s.launcherPowered}>
            <GeminiLogo size={10} />
            <span>{GEMINI_BRAND_LABEL}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
