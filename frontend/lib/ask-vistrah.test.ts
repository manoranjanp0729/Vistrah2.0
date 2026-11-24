import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AskVistrahWidget } from '../components/ask-vistrah-widget';
import { LanguageProvider } from '../components/language-provider';
import { MarketplaceCategories } from '../components/marketplace-categories';
import { ReferenceHeroCarousel } from '../components/reference-hero-carousel';
import {
  ASK_VISTRAH_STARTERS,
  ASTRA_AGENT_NAME,
  ASTRA_AUTO_HIDE_MS,
  ASTRA_PEEK_COUNTER_SHIFT_PX,
  ASTRA_PEEK_TRANSLATE_PERCENT,
  ASTRA_TOP_SAFE_PX,
  ASTRA_WELCOME,
  ASTRA_Y_STORAGE_KEY,
  GEMINI_BRAND_LABEL,
  clampAstraTop,
  createAstraLauncherController,
  normalizeSuggestedActions,
  sanitizeChatActionHref,
} from '../../shared/ask-vistrah';
import { HERO_BANNERS } from '../../shared/hero-banners';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    createElement('img', { alt, src }),
}));

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Astra movable & auto-hiding launcher, static hero, and borderless cards', () => {
  it('renders right-side 4-point Gemini sparkle in both expanded and auto-hidden peek states with touch-action: none', () => {
    const expandedHtml = renderToStaticMarkup(
      createElement(AskVistrahWidget, { initialPeek: false, initialTopPx: 240 }),
    );
    const peekHtml = renderToStaticMarkup(
      createElement(AskVistrahWidget, { initialPeek: true, initialTopPx: 240 }),
    );
    const css = readFileSync(
      new URL('../components/ask-vistrah-widget.module.css', import.meta.url),
      'utf8',
    );

    expect(ASTRA_AGENT_NAME).toBe('Astra');
    expect(GEMINI_BRAND_LABEL).toBe('Powered by Google Gemini');
    expect(ASTRA_WELCOME.content).toContain('I am Astra');
    expect(ASK_VISTRAH_STARTERS).toHaveLength(3);

    // Expanded state: right-docked with Astra on left and 4-point Gemini sparkle on right
    expect(expandedHtml).toContain('data-astra="true"');
    expect(expandedHtml).toContain('data-docked-edge="right"');
    expect(expandedHtml).toContain('data-astra-peek="false"');
    expect(expandedHtml).toContain('top:240px');
    expect(expandedHtml).toContain('data-gemini-spark="true"');
    expect(expandedHtml.indexOf('Astra')).toBeLessThan(
      expandedHtml.indexOf('data-gemini-spark="true"'),
    );

    // Auto-hidden peek state: tucked 58% off-edge while keeping 4-point Gemini sparkle rendered & counter-shifted on right edge
    expect(peekHtml).toContain('data-astra-peek="true"');
    expect(peekHtml).toContain(`translateX(${ASTRA_PEEK_TRANSLATE_PERCENT}%)`);
    expect(peekHtml).toContain('data-gemini-spark="true"');
    expect(peekHtml.indexOf('Astra')).toBeLessThan(peekHtml.indexOf('data-gemini-spark="true"'));

    // CSS enforces non-scroll-hijacking drag & counter-translated sparkle in peek mode
    expect(css).toContain('touch-action: none;');
    expect(css).toContain('user-select: none;');
    expect(css).toContain('transform: translateX(58%);');
    expect(css).toContain(`transform: translateX(-${ASTRA_PEEK_COUNTER_SHIFT_PX}px);`);
  });

  it('smoothly updates, clamps, and persists vertical Y drag without opening chat on release', () => {
    const storage = createMemoryStorage();
    const ctrl = createAstraLauncherController({
      initialViewportHeight: 800,
      storage,
    });

    // At 800px viewport: minTop = 72, maxTop = 800 - 96 - 48 = 656
    expect(clampAstraTop(-50, 800)).toBe(ASTRA_TOP_SAFE_PX);
    expect(clampAstraTop(9999, 800)).toBe(656);
    expect(ctrl.getState().topPx).toBe(656);

    // Drag upward by 400px (beyond deadzone > 6px)
    ctrl.pointerDown({ pointerId: 1, clientX: 790, clientY: 660, viewportHeight: 800 });
    ctrl.pointerMove({ pointerId: 1, clientX: 788, clientY: 260, viewportHeight: 800 });
    expect(ctrl.getState().isDraggingY).toBe(true);
    expect(ctrl.getState().topPx).toBe(256);
    expect(ctrl.getState().open).toBe(false);

    // Drag past top header safe zone -> clamps cleanly at 72px
    ctrl.pointerMove({ pointerId: 1, clientX: 788, clientY: -100, viewportHeight: 800 });
    expect(ctrl.getState().topPx).toBe(72);

    // Release at clientY = 300 (deltaY = -360 -> topPx = 656 - 360 = 296)
    ctrl.pointerUp({ pointerId: 1, clientX: 788, clientY: 300, viewportHeight: 800 }, storage);
    expect(ctrl.getState().isDraggingY).toBe(false);
    expect(ctrl.getState().topPx).toBe(296);
    expect(storage.getItem(ASTRA_Y_STORAGE_KEY)).toBe('296');

    // Synthetic click fired by browser right after pointerup is suppressed!
    expect(ctrl.click()).toBe(false);
    expect(ctrl.getState().open).toBe(false);

    // Next real tap (without dragging) opens Astra at the saved Y position
    ctrl.pointerDown({ pointerId: 2, clientX: 790, clientY: 310, viewportHeight: 800 });
    ctrl.pointerUp({ pointerId: 2, clientX: 790, clientY: 312, viewportHeight: 800 }, storage);
    expect(ctrl.click()).toBe(true);
    expect(ctrl.getState().open).toBe(true);
    expect(ctrl.getState().topPx).toBe(296);

    ctrl.dispose();
  });

  it('auto-hides to right-edge peek after 2.5s idle, wakes on hover/focus, opens on <= -28px leftward drag, and restarts idle timer on close', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const ctrl = createAstraLauncherController({
      initialViewportHeight: 800,
      initialTopPx: 320,
      storage,
    });
    ctrl.start();

    expect(ctrl.getState().isPeek).toBe(false);
    vi.advanceTimersByTime(ASTRA_AUTO_HIDE_MS - 100);
    expect(ctrl.getState().isPeek).toBe(false);

    // Reaches 2.5s idle -> transitions to peek state
    vi.advanceTimersByTime(100);
    expect(ctrl.getState().isPeek).toBe(true);

    // Hover immediately wakes to full pill and pauses auto-hide while hovered
    ctrl.pointerEnter();
    expect(ctrl.getState().isPeek).toBe(false);
    vi.advanceTimersByTime(ASTRA_AUTO_HIDE_MS * 2);
    expect(ctrl.getState().isPeek).toBe(false);

    // Pointer leave restarts the 2.5s idle timer
    ctrl.pointerLeave();
    vi.advanceTimersByTime(ASTRA_AUTO_HIDE_MS);
    expect(ctrl.getState().isPeek).toBe(true);

    // Leftward drag <= -28px pulls out and pops open Astra chat panel
    ctrl.pointerDown({ pointerId: 5, clientX: 795, clientY: 330, viewportHeight: 800 });
    expect(ctrl.getState().isPeek).toBe(false);
    ctrl.pointerMove({ pointerId: 5, clientX: 760, clientY: 331, viewportHeight: 800 }); // deltaX = -35 <= -28
    expect(ctrl.getState().open).toBe(true);
    ctrl.pointerUp({ pointerId: 5, clientX: 760, clientY: 331, viewportHeight: 800 }, storage);
    // Synthetic click after swipe release must not close the freshly opened drawer
    expect(ctrl.click()).toBe(false);
    expect(ctrl.getState().open).toBe(true);

    // While chat is open, launcher never auto-hides
    vi.advanceTimersByTime(ASTRA_AUTO_HIDE_MS * 3);
    expect(ctrl.getState().isPeek).toBe(false);

    // Closing chat snaps back to right edge at saved Y=320 and restarts 2.5s idle auto-hide timer
    ctrl.closeChat();
    expect(ctrl.getState().open).toBe(false);
    expect(ctrl.getState().topPx).toBe(320);
    expect(ctrl.getState().isPeek).toBe(false);
    vi.advanceTimersByTime(ASTRA_AUTO_HIDE_MS);
    expect(ctrl.getState().isPeek).toBe(true);

    ctrl.dispose();
  });

  it('keeps only the single static For Businesses homepage hero banner and borderless Services Near You cards', () => {
    expect(HERO_BANNERS).toHaveLength(1);
    expect(HERO_BANNERS[0].key).toBe('businesses');
    expect(HERO_BANNERS[0].navTitle).toBe('For Businesses');

    const heroHtml = renderToStaticMarkup(
      createElement(LanguageProvider, null, createElement(ReferenceHeroCarousel)),
    );
    expect(heroHtml).toContain('For Businesses');
    expect(heroHtml).not.toContain('aria-label="Pause slide rotation"');

    const gridHtml = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(MarketplaceCategories, { borderless: true }),
      ),
    );
    expect(gridHtml).toContain('data-borderless="true"');
  });

  it('allows only internal VISTRAH routes and strips untrusted external or script URIs', () => {
    expect(
      sanitizeChatActionHref('/seller/onboard?category=restaurants-and-dining&type=restaurant'),
    ).toBe('/seller/onboard?category=restaurants-and-dining&type=restaurant');
    expect(sanitizeChatActionHref('https://evil.example.com')).toBeNull();
    expect(sanitizeChatActionHref('javascript:alert(1)')).toBeNull();

    expect(
      normalizeSuggestedActions([
        { label: 'Browse Services', href: '/services' },
        { label: 'Phish', href: 'https://evil.example.com' },
        { label: 'Duplicate', href: '/services' },
        { label: 'List Free', href: '/seller/onboard' },
      ]),
    ).toEqual([
      { label: 'Browse Services', href: '/services' },
      { label: 'List Free', href: '/seller/onboard' },
    ]);
  });
});
