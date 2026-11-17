export type HeroBannerKey = 'users' | 'businesses' | 'ads' | 'agri' | 'health';

export type HeroStat = {
  value: string;
  label: string;
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
  navTitle: string;
  title: string;
  subtitle: string;
  webImageSrc: string;
  storyPath: string;
  stats: readonly HeroStat[];
  primaryCta: HeroBannerCta;
  secondaryCta?: HeroBannerCta;
};

export const HERO_BANNER_ASPECT_RATIO = 1736 / 621;

export const HERO_BANNERS: readonly HeroBannerSlide[] = [
  {
    key: 'users',
    stepNumber: '01',
    badge: 'FOR USERS',
    navTitle: 'For Users',
    title: 'Find the Right Services on VISTRAH',
    subtitle: 'Direct verified business owners across 13 sectors—zero broker call spam.',
    webImageSrc: '/hero-journey/for-users-widescreen.jpg',
    storyPath: '/for-users',
    stats: [
      {value: '13+', label: 'Essential Verticals'},
      {value: '0', label: 'Lead-Broker Resales'},
      {value: '2–25 km', label: 'Live V Ads Reels'},
      {value: '100%', label: 'Direct Owner Access'},
    ],
    primaryCta: {
      label: 'Explore Services',
      shortLabel: 'Explore Services',
      webHref: '/services',
      mobileRoute: '/services',
    },
    secondaryCta: {
      label: 'Watch Live V Ads',
      shortLabel: 'Watch V Ads',
      webHref: '/v-ads',
      mobileRoute: '/v-ads',
    },
  },
  {
    key: 'businesses',
    stepNumber: '02',
    badge: 'FOR BUSINESSES',
    navTitle: 'For Businesses',
    title: 'Grow Your Business with VISTRAH',
    subtitle: '90 days free listing, 30 days V Ads at ₹0, and done-for-you digital studio.',
    webImageSrc: '/hero-journey/for-businesses-widescreen.jpg',
    storyPath: '/for-businesses',
    stats: [
      {value: '90 Days', label: 'Free Basic Listing'},
      {value: '₹0', label: 'First 30 Days V Ads'},
      {value: '₹4,999', label: 'Websites Starting'},
      {value: '0%', label: 'Lead Commission'},
    ],
    primaryCta: {
      label: 'List Your Business Free',
      shortLabel: 'List Free',
      webHref: '/provider',
      mobileRoute: '/provider',
    },
    secondaryCta: {
      label: 'View Full Pricing',
      shortLabel: 'Pricing',
      webHref: '/pricing',
      mobileRoute: '/marketing-pricing',
    },
  },
  {
    key: 'ads',
    stepNumber: '03',
    badge: 'VISTRAH ADS & MARKETING',
    navTitle: 'Ads & Marketing',
    title: 'Advertise with VISTRAH',
    subtitle: 'Self-serve 9:16 V Ads + full-stack creative, website, and social agency.',
    webImageSrc: '/hero-journey/v-ads-widescreen.jpg',
    storyPath: '/ads-and-marketing',
    stats: [
      {value: '₹0', label: 'Month 1 V Ads Trial'},
      {value: '₹499+', label: 'Creatives & Reels'},
      {value: '₹4,999+', label: 'Websites & Pages'},
      {value: '0%', label: 'Ad-Spend Markup'},
    ],
    primaryCta: {
      label: 'View Live Rate Card',
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
    navTitle: 'AgriConnect',
    title: 'Stronger Farmers, Brighter Tomorrow',
    subtitle: 'Direct produce buyers, certified inputs, tractor rentals, and soil advisory.',
    webImageSrc: '/hero-journey/agriconnect-widescreen.jpg',
    storyPath: '/agri-connect',
    stats: [
      {value: '9', label: 'Agri Subsectors'},
      {value: '54', label: 'Farming Services'},
      {value: 'Direct', label: 'Buyer & Rental Links'},
      {value: '₹0', label: 'Farmer Discovery'},
    ],
    primaryCta: {
      label: 'Explore Agri Services',
      shortLabel: 'Agri Services',
      webHref: '/services?category=agriculture-and-farming',
      mobileRoute: '/services?category=agriculture-and-farming',
    },
    secondaryCta: {
      label: 'List Agri Business',
      shortLabel: 'List Agri Service',
      webHref: '/provider',
      mobileRoute: '/provider',
    },
  },
  {
    key: 'health',
    stepNumber: '05',
    badge: 'V HEALTHCONNECT',
    navTitle: 'HealthConnect',
    title: 'Better Health for a Brighter Tomorrow',
    subtitle: 'Verified clinics, doorstep lab tests, pharmacies, home care, and wellness.',
    webImageSrc: '/hero-journey/healthconnect-family-banner.jpg',
    storyPath: '/health-connect',
    stats: [
      {value: '10', label: 'Care Pathways'},
      {value: '50+', label: 'Health Specialties'},
      {value: 'At-Home', label: 'Labs & Nursing'},
      {value: 'Direct', label: 'Clinic Appointments'},
    ],
    primaryCta: {
      label: 'Explore Health Services',
      shortLabel: 'Health Services',
      webHref: '/services?category=health-and-fitness',
      mobileRoute: '/services?category=health-and-fitness',
    },
    secondaryCta: {
      label: 'Register Clinic / Lab',
      shortLabel: 'Join HealthConnect',
      webHref: '/provider',
      mobileRoute: '/provider',
    },
  },
] as const;

export const USER_COMPARISON = {
  legacyTitle: 'Static Maps & Lead Portals',
  legacyTag: 'OLD DIRECTORY MODEL',
  legacyRows: [
    'Phone number sold to 4–6 competing brokers',
    'Outdated 2021 pins & closed storefronts',
    'Paid middleman rankings hide real specialists',
    'Zero visual proof of actual work quality',
  ],
  vistrahTitle: 'VISTRAH Direct Network',
  vistrahTag: 'VERIFIED OWNER MODEL',
  vistrahRows: [
    'Direct Call & WhatsApp to verified owner',
    'DPDP 2023 privacy—zero lead resale spam',
    'Live 9:16 V Ads Reels within 2 km–25 km',
    'Reviewed credentials & upfront scope cards',
  ],
} as const;

export const USER_VERTICALS = [
  {num: '01', slug: 'food-and-dining', title: 'Food & Dining', caption: 'Restaurants, cafés, sweets, catering & tiffin', icon: 'coffee'},
  {num: '02', slug: 'home-services', title: 'Home Services', caption: 'Cleaning, repairs, appliances, painting & movers', icon: 'home'},
  {num: '03', slug: 'shops-and-retail', title: 'Shops & Retail', caption: 'Grocery, mobiles, clothing, furniture & hardware', icon: 'shopping-bag'},
  {num: '04', slug: 'beauty-and-personal-care', title: 'Beauty & Personal Care', caption: 'Salons, parlours, spas, tailoring & jewellery', icon: 'star'},
  {num: '05', slug: 'health-and-fitness', title: 'HealthConnect', caption: 'Clinics, hospitals, labs, pharmacy & gyms', icon: 'heart'},
  {num: '06', slug: 'vehicles', title: 'Vehicles', caption: 'Sales, servicing, car wash, parts & towing', icon: 'truck'},
  {num: '07', slug: 'property-and-construction', title: 'Property & Construction', caption: 'Buy, sell, rent, contractors & architects', icon: 'briefcase'},
  {num: '08', slug: 'rentals', title: 'Rentals', caption: 'Vehicles, equipment, furniture & party items', icon: 'key'},
  {num: '09', slug: 'travel-and-stay', title: 'Travel & Stay', caption: 'Hotels, homestays, tours & taxis', icon: 'compass'},
  {num: '10', slug: 'education-and-training', title: 'Education & Training', caption: 'Schools, tuition, skills, languages & arts', icon: 'book-open'},
  {num: '11', slug: 'events-and-celebrations', title: 'Events & Celebrations', caption: 'Venues, decorators, photographers & DJs', icon: 'calendar'},
  {num: '12', slug: 'professional-and-business-services', title: 'Professional Services', caption: 'Legal, tax & GST, marketing, IT & recruitment', icon: 'users'},
  {num: '13', slug: 'agriculture-and-farming', title: 'AgriConnect', caption: 'Machinery, seeds, irrigation, labour & dairy', icon: 'sun'},
] as const;

export const BUSINESS_TIMELINE = [
  {
    step: '01',
    badge: '90 DAYS FREE',
    price: '₹0',
    title: 'List Free — Verified Storefront',
    caption: 'Verify ownership once, pin your locality coverage, and receive direct customer calls.',
    mockupTitle: 'Verified Business Card',
    mockupPills: ['✓ Ownership Verified', 'Direct Call & WhatsApp', 'Fixed-Price Packages'],
  },
  {
    step: '02',
    badge: 'FIRST 30 DAYS ₹0',
    price: '₹0 Month 1',
    title: 'Launch V Ads — Hyperlocal 9:16 Reels',
    caption: 'Broadcast 60s video proof across 2 km–25 km. Transparent Day 31+ rates, zero auto-charge.',
    mockupTitle: 'Geo-Radius Reel Broadcast',
    mockupPills: ['2 km · 5 km · 10 km · 25 km', '₹0 Due Today', 'Day 31+ Optional'],
  },
  {
    step: '03',
    badge: 'DONE-FOR-YOU STUDIO',
    price: 'From ₹499 / ₹4,999',
    title: 'Scale With Studio — Creatives, Web & Social',
    caption: 'Add commercial reels, mobile-first websites, or managed social campaigns anytime.',
    mockupTitle: 'VISTRAH Studio Stack',
    mockupPills: ['Reels ₹2,999', 'Websites ₹4,999+', 'Social ₹4,999/mo'],
  },
] as const;

export const ADS_STUDIO_PILLARS = [
  {
    num: '01',
    tag: 'BRAND & VIDEO STUDIO',
    title: 'Creative & Video Production',
    price: 'From ₹499 – ₹2,999',
    caption: '9:16 commercial reels, festival posters, and brand identity kits at fixed one-time rates.',
    tiers: [
      {label: 'Social Graphic / Banner', rate: '₹499 – ₹699'},
      {label: 'Promotional Poster', rate: '₹799'},
      {label: '9:16 Commercial Reel / Logo Kit', rate: '₹2,999'},
    ],
  },
  {
    num: '02',
    tag: 'WEB ENGINEERING',
    title: 'Website Creation & Web Apps',
    price: 'From ₹4,999 one-time',
    caption: 'Fast, mobile-first websites wired with instant Call, WhatsApp, and enquiry capture.',
    tiers: [
      {label: 'Campaign Landing Page', rate: '₹4,999'},
      {label: 'Portfolio Showcase Site', rate: '₹7,999'},
      {label: 'Multi-Page Business Website', rate: '₹12,999+'},
    ],
  },
  {
    num: '03',
    tag: 'GROWTH & PERFORMANCE',
    title: 'Social Media & Performance Marketing',
    price: 'From ₹4,999/mo + GST',
    caption: 'Instagram, Facebook, YouTube & Google management—fee strictly separated from ad spend.',
    tiers: [
      {label: 'Starter Monthly Retainer', rate: '₹4,999/mo'},
      {label: 'Growth Multi-Channel', rate: '₹9,999/mo'},
      {label: 'Platform Ad Spend (Meta/Google)', rate: 'At Actuals (0% Markup)'},
    ],
  },
] as const;

export const VADS_RATE_SNAPSHOT = [
  {zone: '2 km Neighbourhood', month1: '₹0 (30 Days Free)', day31: '₹4,500/mo + GST', daily: '₹150/day'},
  {zone: '5 km Ward Cluster', month1: '₹0 (30 Days Free)', day31: '₹7,500/mo + GST', daily: '₹250/day'},
  {zone: '10 km City Corridor', month1: '₹0 (30 Days Free)', day31: '₹13,500/mo + GST', daily: '₹450/day'},
  {zone: '25 km Metro Reach', month1: '₹0 (30 Days Free)', day31: '₹24,000/mo + GST', daily: '₹800/day'},
] as const;

export const AGRI_CARDS = [
  {
    num: '01',
    badge: 'FARM → BUYER',
    title: 'Direct Market Access',
    caption: 'Connect directly with produce buyers, cold storage, grading teams, and transport.',
    chips: ['Land Prep & Harvest', 'Post-Harvest Grading', 'Transport Links'],
    subcategory: 'farm-labour-and-services',
    icon: 'trending-up',
  },
  {
    num: '02',
    badge: 'CERTIFIED SUPPLY',
    title: 'Quality Inputs & Irrigation',
    caption: 'Source verified seeds, saplings, drip-irrigation kits, and organic compost.',
    chips: ['Crop Seeds & Nurseries', 'Drip & Sprinklers', 'Organic Compost'],
    subcategory: 'seeds-fertiliser-and-nursery',
    icon: 'droplet',
  },
  {
    num: '03',
    badge: 'ON-DEMAND FLEET',
    title: 'Machinery & Rentals',
    caption: 'Book tractors, tillers, combine harvesters, and agricultural drones on clear terms.',
    chips: ['Tractor Rental', 'Harvester Booking', 'Drone Surveying'],
    subcategory: 'farm-equipment-and-machinery',
    icon: 'sliders',
  },
  {
    num: '04',
    badge: 'PRECISION CARE',
    title: 'Expert Crop Advisory',
    caption: 'Schedule soil NPK testing, pest monitoring, nutrient plans, and dairy setup help.',
    chips: ['Soil Lab Testing', 'Crop Pest Care', 'Dairy & Livestock'],
    subcategory: 'seeds-fertiliser-and-nursery',
    icon: 'compass',
  },
] as const;

export const HEALTH_PATHWAYS = [
  {
    num: '01',
    badge: 'CLINICAL CARE',
    title: 'Doctors & Clinics',
    caption: 'General physicians, pediatrics, dental, eye care, orthopedic, and cardiology clinics.',
    tag: 'Direct Clinic Call',
    subcategory: 'clinic-and-doctor',
    icon: 'user-check',
  },
  {
    num: '02',
    badge: 'DOORSTEP LABS',
    title: 'Diagnostics & Imaging',
    caption: 'Pathology blood panels, full-body checkups, X-ray/MRI centers, and home sample pickup.',
    tag: 'Home Collection',
    subcategory: 'diagnostic-lab',
    icon: 'activity',
  },
  {
    num: '03',
    badge: 'MEDICAL ESSENTIALS',
    title: 'Pharmacies & Supplies',
    caption: 'Neighborhood chemists, surgical supplies, oxygen concentrators, and mobility aids.',
    tag: 'Verified Stockists',
    subcategory: 'pharmacy',
    icon: 'plus-square',
  },
  {
    num: '04',
    badge: 'RECOVERY AT HOME',
    title: 'Home Care & Physiotherapy',
    caption: 'Post-operative rehabilitation, sports physio, elder care, and recovery support.',
    tag: 'Home Visits',
    subcategory: 'physiotherapy',
    icon: 'home',
  },
  {
    num: '05',
    badge: 'PREVENTIVE HEALTH',
    title: 'Wellness, Yoga & Nutrition',
    caption: 'Fitness studios, yoga & meditation, registered dietitians, and mental wellbeing.',
    tag: 'Holistic Care',
    subcategory: 'gym-and-yoga',
    icon: 'heart',
  },
] as const;

export function getHeroBannerByKey(key: HeroBannerKey): HeroBannerSlide {
  return HERO_BANNERS.find(b => b.key === key) ?? HERO_BANNERS[0];
}
