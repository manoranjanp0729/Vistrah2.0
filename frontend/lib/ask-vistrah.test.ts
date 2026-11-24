import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AskVistrahWidget } from '../components/ask-vistrah-widget';
import { LanguageProvider } from '../components/language-provider';
import { MarketplaceCategories } from '../components/marketplace-categories';
import { ReferenceHeroCarousel } from '../components/reference-hero-carousel';
import {
  ASK_VISTRAH_STARTERS,
  ASTRA_AGENT_NAME,
  ASTRA_WELCOME,
  GEMINI_BRAND_LABEL,
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

describe('Astra chat agent, static For Businesses hero, and borderless Services for You cards', () => {
  it('renders right-edge docked Astra launcher with Powered by Google Gemini and single 4-point Gemini sparkle on the right', () => {
    const html = renderToStaticMarkup(createElement(AskVistrahWidget));
    expect(ASTRA_AGENT_NAME).toBe('Astra');
    expect(GEMINI_BRAND_LABEL).toBe('Powered by Google Gemini');
    expect(ASTRA_WELCOME.content).toContain('I am Astra');
    expect(ASTRA_WELCOME.content).not.toContain('800+');
    expect(html).toContain('Astra');
    expect(html).not.toContain('Ask VISTRAH');
    expect(html).toContain('data-astra="true"');
    expect(html).toContain('data-gemini-spark="true"');
    expect(html.indexOf('Astra')).toBeLessThan(html.indexOf('data-gemini-spark="true"'));
    expect(html).toContain('#4285F4');
    expect(ASK_VISTRAH_STARTERS).toHaveLength(3);
  });

  it('keeps only the single static For Businesses homepage hero banner with zero carousel dots or play/pause buttons', () => {
    expect(HERO_BANNERS).toHaveLength(1);
    expect(HERO_BANNERS[0].key).toBe('businesses');
    expect(HERO_BANNERS[0].navTitle).toBe('For Businesses');
    expect(JSON.stringify(HERO_BANNERS)).not.toContain('800+');

    const heroHtml = renderToStaticMarkup(
      createElement(LanguageProvider, null, createElement(ReferenceHeroCarousel)),
    );
    expect(heroHtml).toContain('For Businesses');
    expect(heroHtml).not.toContain('aria-label="Pause slide rotation"');
    expect(heroHtml).not.toContain('aria-label="Show slide');
  });

  it('renders homepage Services for You cards borderless with frameless titles', () => {
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
    expect(
      sanitizeChatActionHref('/services/nearby?category=fuel-and-charging-stations&type=ev-charging'),
    ).toBe('/services/nearby?category=fuel-and-charging-stations&type=ev-charging');
    expect(sanitizeChatActionHref('https://evil.example.com')).toBeNull();
    expect(sanitizeChatActionHref('//evil.example.com')).toBeNull();
    expect(sanitizeChatActionHref('javascript:alert(1)')).toBeNull();
    expect(sanitizeChatActionHref('/admin/employees')).toBeNull();

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
