export type HeroBannerKey = 'users' | 'businesses' | 'ads' | 'agri' | 'health';

export type HeroBannerPillar = {
  num: '01' | '02' | '03' | '04';
  title: string;
  priceTag?: string;
  detail: string;
};

export type HeroBannerCta = {
  label: string;
  shortLabel: string;
  webHref: string;
  mobileRoute: string;
};

export type HeroBannerSlide = {
  key: HeroBannerKey;
  stepNumber: '01' | '02' | '03' | '04' | '05';
  badge: string;
  title: string;
  bannerSubtext: string;
  webImageSrc: string;
  summary: string;
  pillars: readonly HeroBannerPillar[];
  pricingNote: string;
  primaryCta: HeroBannerCta;
  secondaryCta?: HeroBannerCta;
};

export const HERO_BANNER_ASPECT_RATIO = 1736 / 621;

export const HERO_BANNERS: readonly HeroBannerSlide[] = [
  {
    key: 'users',
    stepNumber: '01',
    badge: 'FOR USERS',
    title: 'Find the Right Services on VISTRAH',
    bannerSubtext: 'Trusted service providers for every need, all in one place.',
    webImageSrc: '/hero-journey/for-users-widescreen.jpg',
    summary:
      'Skip outdated static map pins and lead-broker portals that resell your phone number to five callers. VISTRAH connects you directly with verified local businesses across India.',
    pillars: [
      {
        num: '01',
        title: 'Direct Call & WhatsApp — Zero Broker Spam',
        priceTag: 'DPDP Protected',
        detail:
          'Speak directly with verified business owners. Your contact details are never sold or auctioned to third-party lead brokers.',
      },
      {
        num: '02',
        title: '13 Essential Verticals Under One Roof',
        priceTag: '13 Sectors',
        detail:
          'Compare reviewed providers across Civil & Construction, Real Estate, Legal & Tax, Automobiles, Home Care, Overseas, Healthcare, Agriculture, and Hiring.',
      },
      {
        num: '03',
        title: 'Live Hyperlocal V Ads Reels (2 km–25 km)',
        priceTag: '2–25 km Live',
        detail:
          'Watch real 60-second work demonstrations and check active locality coverage before you call or request an estimate.',
      },
    ],
    pricingNote:
      'Free to browse and discover categories · DPDP Act 2023 compliant privacy controls.',
    primaryCta: {
      label: 'Explore Services',
      shortLabel: 'Explore Services',
      webHref: '/services',
      mobileRoute: '/services',
    },
    secondaryCta: {
      label: 'Watch Nearby V Ads',
      shortLabel: 'V Ads',
      webHref: '/v-ads',
      mobileRoute: '/v-ads',
    },
  },
  {
    key: 'businesses',
    stepNumber: '02',
    badge: 'FOR BUSINESSES',
    title: 'Grow Your Business with VISTRAH',
    bannerSubtext: 'Reach more customers. Get discovered. Grow faster.',
    webImageSrc: '/hero-journey/for-businesses-widescreen.jpg',
    summary:
      'Establish a verified local presence with zero upfront risk, then scale at your own pace with self-serve neighborhood V Ads or done-for-you digital studio support.',
    pillars: [
      {
        num: '01',
        title: 'Zero-Risk Onboarding & Trial',
        priceTag: '₹0 Upfront',
        detail:
          'Start with 90 Days Free Basic Business Membership plus your First 30 Days of Self-Serve V Ads at ₹0—with transparent Day 31+ monthly rates and zero auto-charges.',
      },
      {
        num: '02',
        title: 'Done-For-You Creative & Website Creation',
        priceTag: 'From ₹499 / ₹4,999',
        detail:
          'Need assets built for you? VISTRAH Studio crafts brand graphics & reels (from ₹499–₹2,999) and mobile-first websites with WhatsApp enquiry capture (from ₹4,999 one-time).',
      },
      {
        num: '03',
        title: 'Managed Social Media & Local Reach',
        priceTag: 'From ₹4,999/mo',
        detail:
          'Publish fixed-price packages, receive direct customer enquiries, or add end-to-end Instagram, Facebook, YouTube & Google management.',
      },
    ],
    pricingNote:
      '₹0 due today for 90-day Basic listing & 30-day V Ads trial · Studio services quoted transparently before work begins.',
    primaryCta: {
      label: 'List Your Business Free',
      shortLabel: 'List Free',
      webHref: '/provider',
      mobileRoute: '/provider',
    },
    secondaryCta: {
      label: 'View Pricing',
      shortLabel: 'Pricing',
      webHref: '/pricing',
      mobileRoute: '/marketing-pricing',
    },
  },
  {
    key: 'ads',
    stepNumber: '03',
    badge: 'VISTRAH ADS & MARKETING',
    title: 'Advertise with VISTRAH',
    bannerSubtext: 'Showcase your business to the right audience. More visibility. More growth.',
    webImageSrc: '/hero-journey/v-ads-widescreen.jpg',
    summary:
      'One transparent rate card covering self-serve hyperlocal V Ads and full-stack agency execution—with every build fee, management retainer, and media spend clearly separated.',
    pillars: [
      {
        num: '01',
        title: 'Creative & Video Production',
        priceTag: 'From ₹499 – ₹2,999',
        detail:
          '9:16 commercial reels, festival & promotional posters, social graphics, and complete brand identity kits at fixed one-time package pricing.',
      },
      {
        num: '02',
        title: 'Website Creation',
        priceTag: 'From ₹4,999 one-time',
        detail:
          'Mobile-first campaign landing pages (from ₹4,999) and multi-page business websites (from ₹12,999) wired for direct call & WhatsApp lead capture.',
      },
      {
        num: '03',
        title: 'Social Media Marketing',
        priceTag: 'From ₹4,999/mo + GST',
        detail:
          'End-to-end Instagram, Facebook, YouTube, and Google campaign management—explicitly separating VISTRAH’s management fee from your platform ad spend.',
      },
      {
        num: '04',
        title: 'In-App V Ads (2 km – 25 km)',
        priceTag: '₹0 First 30 Days',
        detail:
          'Run geo-targeted 9:16 video ads at ₹0 for Month 1, then transparent Day 31+ rates (₹4,500–₹24,000/mo + 18% GST by radius). Outdoor hoardings & LED vans quoted on request.',
      },
    ],
    pricingNote:
      '18% GST and third-party platform media spend billed separately · Zero hidden agency markups.',
    primaryCta: {
      label: 'View Rate Card & Packages',
      shortLabel: 'Rate Card',
      webHref: '/pricing',
      mobileRoute: '/marketing-pricing',
    },
    secondaryCta: {
      label: 'Open V Ads Studio',
      shortLabel: 'V Ads Studio',
      webHref: '/seller/v-ads',
      mobileRoute: '/seller/v-ads',
    },
  },
  {
    key: 'agri',
    stepNumber: '04',
    badge: 'VISTRAH AGRICONNECT',
    title: 'Stronger Farmers, Brighter Tomorrow with VISTRAH',
    bannerSubtext: 'Access markets, quality inputs, expert advice and modern solutions.',
    webImageSrc: '/hero-journey/agriconnect-widescreen.jpg',
    summary:
      'VISTRAH AgriConnect brings verified rural & agricultural specialists onto one direct discovery network—helping farmers cut middleman delays across every crop cycle.',
    pillars: [
      {
        num: '01',
        title: 'Direct Market & Buyer Access',
        priceTag: 'Direct Connect',
        detail:
          'Connect directly with verified produce buyers, cold-storage operators, transport partners, and local mandi logistics.',
      },
      {
        num: '02',
        title: 'Quality Inputs & Irrigation Support',
        priceTag: 'Verified Suppliers',
        detail:
          'Locate trusted seed, fertilizer, drip-irrigation, solar pump, and greenhouse equipment suppliers serving your district.',
      },
      {
        num: '03',
        title: 'Farm Machinery Rentals & Advisory',
        priceTag: 'On-Demand',
        detail:
          'Book tractors, harvesters, drone spraying, soil testing, and practical agronomy guidance with clear upfront terms.',
      },
    ],
    pricingNote:
      'Direct farmer-to-provider enquiry · Verify scope, availability, and rates directly with suppliers.',
    primaryCta: {
      label: 'Explore Agri Services',
      shortLabel: 'Agri Services',
      webHref: '/agri-connect',
      mobileRoute: '/agri-connect',
    },
  },
  {
    key: 'health',
    stepNumber: '05',
    badge: 'V HEALTHCONNECT',
    title: 'Better Health for a Brighter Tomorrow on VISTRAH',
    bannerSubtext:
      'Trusted healthcare services, expert care and wellness support for you and your family.',
    webImageSrc: '/hero-journey/healthconnect-family-banner.jpg',
    summary:
      'Find reviewed clinics, diagnostic labs, home nursing, and wellness specialists near your neighborhood with direct appointment and enquiry contact.',
    pillars: [
      {
        num: '01',
        title: 'Verified Doctors, Clinics & Diagnostics',
        priceTag: 'Local Care',
        detail:
          'Discover specialist clinics, dental & eye care, pathology labs, imaging centers, and home sample collection near you.',
      },
      {
        num: '02',
        title: 'Pharmacies, Home Nursing & Physiotherapy',
        priceTag: 'At-Home Support',
        detail:
          'Connect directly with neighborhood pharmacies, elder care attendants, post-operative nursing, and certified physiotherapists.',
      },
      {
        num: '03',
        title: 'Fitness, Nutrition & Preventive Wellness',
        priceTag: 'Family Wellbeing',
        detail:
          'Explore yoga studios, strength & conditioning centers, clinical nutritionists, and holistic family wellness programs.',
      },
    ],
    pricingNote:
      'For medical emergencies call 108 / local emergency services immediately · Verify clinical credentials directly.',
    primaryCta: {
      label: 'Explore Health Services',
      shortLabel: 'Health Services',
      webHref: '/services?category=health-fitness-and-wellness',
      mobileRoute: '/services?category=health-fitness-and-wellness',
    },
  },
] as const;
