import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AskVistrahWidget } from '../components/ask-vistrah-widget';
import {
  ASK_VISTRAH_STARTERS,
  normalizeSuggestedActions,
  sanitizeChatActionHref,
} from '../../shared/ask-vistrah';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

describe('Ask VISTRAH floating widget & action sanitizer', () => {
  it('renders the floating Ask VISTRAH launcher cleanly', () => {
    const html = renderToStaticMarkup(createElement(AskVistrahWidget));
    expect(html).toContain('Ask VISTRAH');
    expect(html).toContain('data-ask-vistrah="true"');
    expect(ASK_VISTRAH_STARTERS).toHaveLength(3);
  });

  it('allows only internal VISTRAH routes and strips untrusted external or script URIs', () => {
    expect(sanitizeChatActionHref('/seller/onboard?category=food-and-dining&type=restaurants')).toBe(
      '/seller/onboard?category=food-and-dining&type=restaurants',
    );
    expect(sanitizeChatActionHref('/services/nearby?category=pet-care&type=dog-walking')).toBe(
      '/services/nearby?category=pet-care&type=dog-walking',
    );
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
