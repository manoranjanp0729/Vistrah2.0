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
    'Discover. Connect. Grow. — Direct verified businesses, zero broker spam & free V Ads for any radius.',
  stripLine:
    '01 Live nearby availability · 02 Direct Call & Website (zero lead resale) · 03 ₹0 Free Listing + Free Any-Radius V Ads',
  triggerCollapsed: 'See why →',
  triggerExpanded: 'Hide',
  headline: 'Built for direct local trust—not stale maps or lead brokers.',
  subheadline:
    'Static directories show outdated phone numbers; lead portals resell your inquiry to five callers. VISTRAH pairs live hyperlocal proof with direct owner access across 15 essential divisions.',
  primaryCtaLabel: 'Explore 808+ Services',
  primaryCtaWebHref: '/services',
  secondaryCtaLabel: 'List Business & Upload V Ads Free — ₹0 Forever',
  secondaryCtaWebHref: '/seller/onboard',
  secondaryCtaMobileHref: '/seller/onboard',
} as const;

export const WHY_VISTRAH_PILLARS: readonly WhyVistrahPillar[] = [
  {
    num: '01',
    kicker: 'DISCOVER',
    title: 'Discover Live',
    body: 'Hyperlocal V Ads Reels & active businesses near you—real availability instead of stale static listings.',
    stripSummary: 'Live nearby V Ads & active providers',
  },
  {
    num: '02',
    kicker: 'CONNECT',
    title: 'Connect Direct',
    body: 'Direct Call, Website & Directions to local businesses—your contact details are never sold to third-party lead brokers.',
    stripSummary: 'Direct Call & Directions · Zero lead resale',
  },
  {
    num: '03',
    kicker: 'GROW',
    title: 'Grow Across 808+ Services',
    body: 'One unified platform spanning Home Services, HealthConnect, AgriConnect, Automobiles, Professional Services, and VISTRAH Ads & Marketing—with ',
    highlight: '₹0 Free Business Listing + Free V Ads for Any Radius Forever',
    stripSummary: '808+ services · ₹0 Free Listing + Free V Ads',
  },
] as const;
