export type WhyVistrahPillar = {
  num: '01' | '02' | '03';
  kicker: string;
  title: string;
  body: string;
  highlight?: string;
  stripSummary: string;
};

export const WHY_VISTRAH_HEADER = {
  badge: 'WHY VISTRAH',
  eyebrow: 'WHY VISTRAH • DISCOVER. CONNECT. GROW.',
  collapsedSummary:
    'Discover. Connect. Grow. — Direct verified businesses, zero broker spam & 30 days V Ads at ₹0.',
  stripLine:
    '01 Live 2–25 km availability · 02 Direct Call & WhatsApp (zero lead resale) · 03 90d Free Basic + 30d V Ads ₹0',
  triggerCollapsed: 'See why →',
  triggerExpanded: 'Hide',
  headline: 'Built for direct local trust—not stale maps or lead brokers.',
  subheadline:
    'Static directories show outdated phone numbers; lead portals resell your inquiry to five callers. VISTRAH pairs live hyperlocal proof with direct owner access across 13 essential sectors.',
  primaryCtaLabel: 'Explore 13 Verticals',
  primaryCtaWebHref: '/services',
  secondaryCtaLabel: 'List Your Business Free — 30 Days V Ads ₹0',
  secondaryCtaWebHref: '/seller/onboard',
  secondaryCtaMobileHref: '/seller/onboard',
} as const;

export const WHY_VISTRAH_PILLARS: readonly WhyVistrahPillar[] = [
  {
    num: '01',
    kicker: 'DISCOVER',
    title: 'Discover Live',
    body: 'Hyperlocal V Ads Reels & active businesses within 2 km–25 km—real availability instead of stale static listings.',
    stripSummary: 'Live 2–25 km V Ads & active providers',
  },
  {
    num: '02',
    kicker: 'CONNECT',
    title: 'Connect Direct',
    body: 'Direct Call & WhatsApp to verified business owners—your contact details are never sold to third-party lead brokers.',
    stripSummary: 'Direct Call & WhatsApp · Zero lead resale',
  },
  {
    num: '03',
    kicker: 'GROW',
    title: 'Grow Across 13 Verticals',
    body: 'One unified platform spanning Civil & Construction, Real Estate, Legal, Automobiles, Overseas, HealthConnect, and VISTRAH Ads & Marketing—with ',
    highlight: '90 Days Free Basic Membership + First 30 Days of V Ads at ₹0',
    stripSummary: '13 sectors · 90d Free Basic + 30d V Ads ₹0',
  },
] as const;
