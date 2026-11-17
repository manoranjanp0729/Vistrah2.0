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
    subtitle: '₹0 free business listing, ₹0 any-radius V Ads forever, plus done-for-you Studio, Web & Automation.',
    webImageSrc: '/hero-journey/for-businesses-widescreen.jpg',
    storyPath: '/for-businesses',
    stats: [
      {value: '₹0', label: 'Free Business Listing'},
      {value: '₹0', label: 'Any-Radius V Ads'},
      {value: '₹4,999', label: 'Websites Starting'},
      {value: '0%', label: 'Lead Commission'},
    ],
    primaryCta: {
      label: 'List Your Business Free',
      shortLabel: 'List Free',
      webHref: '/seller/onboard',
      mobileRoute: '/seller/onboard',
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
    subtitle: 'Free self-serve V Ads for any radius + paid creative studio, website & automation team.',
    webImageSrc: '/hero-journey/v-ads-widescreen.jpg',
    storyPath: '/ads-and-marketing',
    stats: [
      {value: '₹0', label: 'Any-Radius V Ads'},
      {value: '₹499+', label: 'Creatives & Reels'},
      {value: '₹4,999+', label: 'Websites & Tech'},
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
      webHref: '/seller/onboard?category=agriculture-and-farming',
      mobileRoute: '/seller/onboard?category=agriculture-and-farming',
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
      webHref: '/services?category=health-fitness-and-wellness',
      mobileRoute: '/services?category=health-fitness-and-wellness',
    },
    secondaryCta: {
      label: 'Register Clinic / Lab',
      shortLabel: 'Join HealthConnect',
      webHref: '/seller/onboard?category=health-fitness-and-wellness',
      mobileRoute: '/seller/onboard?category=health-fitness-and-wellness',
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
  {num: '01', slug: 'home-and-everyday-services', title: 'Home Services', caption: 'Repairs, interiors, cleaning & movers', icon: 'home'},
  {num: '02', slug: 'professional-services', title: 'Legal, Tax & Consulting', caption: 'Lawyers, CAs, marketing & IT pros', icon: 'briefcase'},
  {num: '03', slug: 'automobiles', title: 'Automobiles', caption: 'EVs, servicing, detailing & roadside help', icon: 'truck'},
  {num: '04', slug: 'health-fitness-and-wellness', title: 'HealthConnect', caption: 'Clinics, labs, home care & fitness', icon: 'heart'},
  {num: '05', slug: 'agriculture-and-farming', title: 'AgriConnect', caption: 'Machinery, seeds, irrigation & advisory', icon: 'sun'},
  {num: '06', slug: 'rental-services', title: 'Rentals', caption: 'Vehicles, tools, appliances & event gear', icon: 'key'},
  {num: '07', slug: 'food-and-dining', title: 'Food & Dining', caption: 'Restaurants, cafés, bakeries & catering', icon: 'coffee'},
  {num: '08', slug: 'shopping-and-local-retail', title: 'Local Retail', caption: 'Electronics, fashion, furniture & makers', icon: 'shopping-bag'},
  {num: '09', slug: 'education-and-skills', title: 'Education & Skills', caption: 'Tutors, IT courses, exams & coaching', icon: 'book-open'},
  {num: '10', slug: 'jobs-and-careers', title: 'Jobs & Careers', caption: 'Local hiring, IT roles & career support', icon: 'users'},
  {num: '11', slug: 'travel-stay-and-experiences', title: 'Travel & Stay', caption: 'Stays, tours, transfers & experiences', icon: 'compass'},
  {num: '12', slug: 'beauty-fashion-and-lifestyle', title: 'Beauty & Lifestyle', caption: 'Salons, spas, bridal & studio shoots', icon: 'star'},
  {num: '13', slug: 'events-and-celebrations', title: 'Events & Celebrations', caption: 'Venues, weddings, decor & planners', icon: 'calendar'},
  {num: '14', slug: 'pet-care', title: 'Pet Care', caption: 'Vet clinics, grooming, boarding & supplies', icon: 'heart'},
  {num: '15', slug: 'property-and-construction', title: 'Property & Construction', caption: 'Real estate, plots, contractors & materials', icon: 'briefcase'},
] as const;

export const BUSINESS_TIMELINE = [
  {
    step: '01',
    badge: 'FREE FOREVER',
    price: '₹0',
    title: 'List Free — 808+ Service Types',
    caption: 'Pick your services, pin your shop location, and receive direct customer calls & directions at ₹0.',
    mockupTitle: 'Verified Business Card',
    mockupPills: ['✓ Free Forever', 'Direct Call & Website', '808+ Service Types'],
  },
  {
    step: '02',
    badge: 'FREE ANY RADIUS',
    price: '₹0 Forever',
    title: 'Create & Upload Free V Ads',
    caption: 'Publish 9:16 hyperlocal video ads for any target radius inside VISTRAH at ₹0 forever.',
    mockupTitle: 'Geo-Radius Reel Broadcast',
    mockupPills: ['Free for Any Radius', '2 km · 10 km · 25 km · 50 km+', '₹0 Forever'],
  },
  {
    step: '03',
    badge: 'PAID STUDIO & TECH',
    price: 'From ₹499 / ₹4,999',
    title: 'Scale With Studio, Website & Automation',
    caption: 'Hire VISTRAH for commercial ad shoots, Meta/Google marketing, custom websites, or business automation.',
    mockupTitle: 'VISTRAH Studio & Tech Stack',
    mockupPills: ['Reels ₹2,999', 'Websites ₹4,999+', 'Workflow Automation'],
  },
] as const;

export const ADS_STUDIO_PILLARS = [
  {
    num: '01',
    tag: 'BRAND & VIDEO STUDIO',
    title: 'Creative & Video Production',
    price: 'From ₹499 – ₹2,999',
    caption: '9:16 commercial reels, festival posters, brochure graphics, and brand identity kits at fixed one-time rates.',
    tiers: [
      {label: 'Social Graphic / Banner', rate: '₹499 – ₹699'},
      {label: 'Promotional Poster / Brochure', rate: '₹799'},
      {label: '9:16 Commercial Reel / Logo Kit', rate: '₹2,999'},
    ],
  },
  {
    num: '02',
    tag: 'VISTRAH TECH & AUTOMATION',
    title: 'Website Design & Business Automation',
    price: 'From ₹4,999 one-time',
    caption: 'Custom mobile-first websites with Call & WhatsApp capture plus business workflow automation.',
    tiers: [
      {label: 'Campaign Landing Page', rate: '₹4,999'},
      {label: 'Business Website', rate: '₹12,999+'},
      {label: 'Business Workflow Automation', rate: 'Custom Quote'},
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
  {zone: '2 km Neighbourhood', month1: '₹0 / Free Forever', day31: 'Free on VISTRAH', daily: '₹0'},
  {zone: '5 km Ward Cluster', month1: '₹0 / Free Forever', day31: 'Free on VISTRAH', daily: '₹0'},
  {zone: '10 km City Corridor', month1: '₹0 / Free Forever', day31: 'Free on VISTRAH', daily: '₹0'},
  {zone: '25 km – 50 km+ Reach', month1: '₹0 / Free Forever', day31: 'Free on VISTRAH', daily: '₹0'},
] as const;

export const AGRI_CARDS = [
  {
    num: '01',
    badge: 'FARM → BUYER',
    title: 'Direct Market Access',
    caption: 'Connect directly with produce buyers, cold storage, grading teams, and transport.',
    chips: ['Land Prep & Harvest', 'Post-Harvest Grading', 'Transport Links'],
    subcategory: 'farming-and-agricultural-services',
    icon: 'trending-up',
  },
  {
    num: '02',
    badge: 'CERTIFIED SUPPLY',
    title: 'Quality Inputs & Irrigation',
    caption: 'Source verified seeds, saplings, drip-irrigation kits, and organic compost.',
    chips: ['Crop Seeds & Nurseries', 'Drip & Sprinklers', 'Organic Compost'],
    subcategory: 'seeds-plants-and-nurseries',
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
    subcategory: 'soil-testing-and-crop-care',
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
    subcategory: 'doctors-and-specialists',
    icon: 'user-check',
  },
  {
    num: '02',
    badge: 'DOORSTEP LABS',
    title: 'Diagnostics & Imaging',
    caption: 'Pathology blood panels, full-body checkups, X-ray/MRI centers, and home sample pickup.',
    tag: 'Home Collection',
    subcategory: 'diagnostic-services',
    icon: 'activity',
  },
  {
    num: '03',
    badge: 'MEDICAL ESSENTIALS',
    title: 'Pharmacies & Supplies',
    caption: 'Neighborhood chemists, surgical supplies, oxygen concentrators, and mobility aids.',
    tag: 'Verified Stockists',
    subcategory: 'pharmacies-and-medical-supplies',
    icon: 'plus-square',
  },
  {
    num: '04',
    badge: 'RECOVERY AT HOME',
    title: 'Home Care & Physiotherapy',
    caption: 'Post-operative rehabilitation, sports physio, elder care, and recovery support.',
    tag: 'Home Visits',
    subcategory: 'physiotherapy-and-rehabilitation',
    icon: 'home',
  },
  {
    num: '05',
    badge: 'PREVENTIVE HEALTH',
    title: 'Wellness, Yoga & Nutrition',
    caption: 'Fitness studios, yoga & meditation, registered dietitians, and mental wellbeing.',
    tag: 'Holistic Care',
    subcategory: 'fitness-centres',
    icon: 'heart',
  },
] as const;

export function getHeroBannerByKey(key: HeroBannerKey): HeroBannerSlide {
  return HERO_BANNERS.find(b => b.key === key) ?? HERO_BANNERS[0];
}
