export type FlagshipSectorSlug =
  | 'real-estate-and-property'
  | 'interior-design-and-exteriors'
  | 'civil-construction-and-contractors'
  | 'healthconnect-and-clinics'
  | 'hospitality-restaurants-and-cafes'
  | 'salons-bridal-and-wellness'
  | 'events-weddings-and-media'
  | 'automobiles-and-garages'
  | 'legal-tax-and-business-compliance'
  | 'overseas-education-and-skill-academies';

export type AuditPillarId =
  | 'vistrah_presence'
  | 'dedicated_website'
  | 'hyperlocal_v_ads'
  | 'social_media_reach'
  | 'paid_ad_campaigns'
  | 'visual_brand_media'
  | 'google_local_seo';

export type AuditBillingType = 'free_forever' | 'one_time' | 'monthly';

export type ScoreTierLabel =
  | 'Hard to Find Online'
  | 'Seen, But Losing Customers'
  | 'Good Local Reach'
  | 'Top Choice in Your Area';

export function getScoreTierLabel(score: number): ScoreTierLabel {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  if (s >= 90) return 'Top Choice in Your Area';
  if (s >= 70) return 'Good Local Reach';
  if (s >= 40) return 'Seen, But Losing Customers';
  return 'Hard to Find Online';
}

export type AuditPillarDefinition = {
  readonly id: AuditPillarId;
  readonly product_title: string;
  readonly short_title: string;
  readonly max_points: number;
  readonly unit_price_inr: number;
  readonly billing_type: AuditBillingType;
  readonly billing_label: string;
  readonly gap_code: string;
  readonly description: string;
  readonly active_summary: string;
  readonly gap_summary: string;
  readonly deliverable_highlights: readonly string[];
};

export type SectorWebsitePattern = {
  readonly pattern_id: string;
  readonly pattern_title: string;
  readonly layout_archetype: string;
  readonly hero_headline_template: string;
  readonly key_sections: readonly string[];
  readonly conversion_cta: string;
};

export type SectorVerticalStrategy = {
  readonly plan_heading: string;
  readonly summary: string;
  readonly funnel_steps: readonly string[];
  readonly recommended_pillar_ids: readonly AuditPillarId[];
};

export type FlagshipSector = {
  readonly order: number;
  readonly slug: FlagshipSectorSlug;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly icon:
    | 'layers'
    | 'home'
    | 'tool'
    | 'heart'
    | 'coffee'
    | 'scissors'
    | 'camera'
    | 'truck'
    | 'briefcase'
    | 'book';
  readonly heroImage: string;
  readonly defaultSubcategorySlug: string;
  readonly defaultTypeSlug: string;
  readonly website_pattern: SectorWebsitePattern;
  readonly vertical_strategy: SectorVerticalStrategy;
};

export const GST_RATE_PERCENT = 18;
export const TOTAL_AUDIT_POINTS = 100;

/**
 * 7 Plain-Language Customer Growth Options (Total = 100 Points).
 * Business Listing (`vistrah_presence`) and Free Local Area Ads (`hyperlocal_v_ads`) are ₹0 — Free Forever.
 */
export const AUDIT_PILLARS: readonly AuditPillarDefinition[] = [
  {
    id: 'vistrah_presence',
    product_title: 'Get Listed on VISTRAH',
    short_title: 'Get Listed on VISTRAH',
    max_points: 20,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 — Free Forever',
    gap_code: 'unclaimed_vistrah',
    description: 'Let nearby customers find your shop, call you, and get directions on VISTRAH.',
    active_summary: 'Let nearby customers find your shop, call you, and get directions on VISTRAH.',
    gap_summary: "Not listed on VISTRAH yet — nearby customers can't find you here.",
    deliverable_highlights: [
      'Verified business badge for your shop in your local area',
      'Direct phone call, WhatsApp, and map directions with zero commission',
      'Full access to your Online Presence & Customer Growth Check page',
    ],
  },
  {
    id: 'dedicated_website',
    product_title: 'Your Own Business Website',
    short_title: 'Your Own Business Website',
    max_points: 20,
    unit_price_inr: 4999,
    billing_type: 'one_time',
    billing_label: '₹4,999 One-Time',
    gap_code: 'missing_website',
    description:
      'A clean website showing your photos, services, and a direct WhatsApp inquiry button.',
    active_summary:
      'A clean website showing your photos, services, and a direct WhatsApp inquiry button.',
    gap_summary: "No website yet — customers can't check your full work, prices, or book online.",
    deliverable_highlights: [
      'Works smoothly on phones and computers, tailored to your business',
      'One-tap WhatsApp inquiry, direct call button, and Google Maps pin',
      'Fast, secure website setup ready to share on WhatsApp & visiting cards',
    ],
  },
  {
    id: 'hyperlocal_v_ads',
    product_title: 'Free Local Area Ads (V Ads)',
    short_title: 'Free Local Area Ads (V Ads)',
    max_points: 15,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 — Free Forever',
    gap_code: 'no_v_ad',
    description: 'Show your offer video to people living and traveling near your business.',
    active_summary: 'Show your offer video to people living and traveling near your business.',
    gap_summary: "No free local V Ad running — you're missing free visibility in your area.",
    deliverable_highlights: [
      'Short vertical video shown to local people on the VISTRAH V Ads feed',
      'Reach 2 km, 10 km, 25 km, 50 km+ or any distance at ₹0 forever',
      'Direct call and shop details shown right below your video',
    ],
  },
  {
    id: 'social_media_reach',
    product_title: 'Instagram & Facebook Reels + Page Care',
    short_title: 'Instagram & Facebook Reels',
    max_points: 15,
    unit_price_inr: 4999,
    billing_type: 'monthly',
    billing_label: '₹4,999 / month',
    gap_code: 'missing_social_media',
    description: 'We create short videos and post regularly so local customers remember you.',
    active_summary: 'We create short videos and post regularly so local customers remember you.',
    gap_summary: 'Low Instagram & Facebook activity — customers rarely see updates from you.',
    deliverable_highlights: [
      'Regular short Reels, photo posts, and festival greetings for your business',
      'Clean video editing, simple captions, and local area tags',
      'Complete monthly care of your Instagram and Facebook pages',
    ],
  },
  {
    id: 'paid_ad_campaigns',
    product_title: 'Instagram & Facebook Customer Ads',
    short_title: 'Instagram & Facebook Ads',
    max_points: 10,
    unit_price_inr: 3999,
    billing_type: 'monthly',
    billing_label: '₹3,999 / month',
    gap_code: 'no_paid_campaigns',
    description: 'Run local ads that bring daily phone calls and WhatsApp messages.',
    active_summary: 'Run local ads that bring daily phone calls and WhatsApp messages.',
    gap_summary:
      'Not running local Instagram/Facebook ads — competitors are capturing nearby leads.',
    deliverable_highlights: [
      'Local ads shown to families and buyers near your shop or city',
      'Direct WhatsApp message and phone call buttons on every ad',
      'Zero extra markup on ad budget paid to Instagram & Facebook',
    ],
  },
  {
    id: 'visual_brand_media',
    product_title: 'Professional Shop & Work Photos/Videos',
    short_title: 'Shop & Work Photos/Videos',
    max_points: 10,
    unit_price_inr: 2999,
    billing_type: 'one_time',
    billing_label: '₹2,999 One-Time',
    gap_code: 'missing_visual_media',
    description:
      'Clear, attractive photos and videos of your shop and work that build instant trust.',
    active_summary:
      'Clear, attractive photos and videos of your shop and work that build instant trust.',
    gap_summary:
      'Missing good shop & work photos — customers hesitate without seeing your place.',
    deliverable_highlights: [
      'Bright, clear photos of your shopfront, team, and real work',
      'Ready-to-share short video for Free V Ads, WhatsApp, and Instagram',
      'Photos sized cleanly for your VISTRAH listing, Google Maps, and website',
    ],
  },
  {
    id: 'google_local_seo',
    product_title: 'Rank Higher on Google Search & Maps',
    short_title: 'Google Search & Maps Boost',
    max_points: 10,
    unit_price_inr: 2499,
    billing_type: 'one_time',
    billing_label: '₹2,499 One-Time',
    gap_code: 'weak_local_seo',
    description: 'Help your business appear at the top when people search on Google near you.',
    active_summary: 'Help your business appear at the top when people search on Google near you.',
    gap_summary:
      'Few Google reviews or weak Google Maps profile — harder to rank in top local searches.',
    deliverable_highlights: [
      'Proper setup of your Google Business services, timings, and search words',
      'Exact Google Map pin, phone number, and address check',
      'Simple steps to collect more genuine 5-star customer reviews',
    ],
  },
] as const;

export const AUDIT_PILLAR_IDS: readonly AuditPillarId[] = AUDIT_PILLARS.map(p => p.id);

export const AUDIT_PILLAR_BY_ID: Readonly<Record<AuditPillarId, AuditPillarDefinition>> =
  Object.fromEntries(AUDIT_PILLARS.map(p => [p.id, p])) as Record<
    AuditPillarId,
    AuditPillarDefinition
  >;

export const FLAGSHIP_SECTORS: readonly FlagshipSector[] = [
  {
    order: 1,
    slug: 'real-estate-and-property',
    title: 'Real Estate & Property',
    shortTitle: 'Real Estate',
    description:
      'Residential plots, apartments, commercial leasing, property valuation, PG stays, and verified real estate advisors.',
    icon: 'layers',
    heroImage: '/images/category-heroes/real-estate-and-property.webp',
    defaultSubcategorySlug: 'residential-and-commercial-real-estate',
    defaultTypeSlug: 'apartment-sales-and-resale',
    website_pattern: {
      pattern_id: 'project-showcase-plot-explorer',
      pattern_title: 'Property Photos, Plot Details & Site Visit Website',
      layout_archetype:
        'Shows your available plots, flats, and commercial spaces with photos, prices, approvals, map location, and a one-tap site visit button.',
      hero_headline_template:
        'Verified Plots, Homes & Commercial Spaces by {business_name} in {city}',
      key_sections: [
        'Available Plots, Flats & Shops (Size, Area & Price Range)',
        'Approval Details (RERA / Clear Title) & Nearby Facilities',
        'Google Map Pin & Main Road Connectivity',
        'One-Tap WhatsApp Brochure & Free Site Visit Booking',
      ],
      conversion_cta: 'Book a Free Site Visit',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Site Visits',
      summary:
        'Help serious property buyers see your plots and buildings clearly and message you directly on WhatsApp without middleman commission.',
      funnel_steps: [
        'List your business free on VISTRAH and post a short property walkthrough video on Free V Ads.',
        'Launch your Property & Site Visit website so buyers can check photos, approvals, and download brochures.',
        'Run local Instagram & Facebook ads to bring buyer calls and site-visit bookings straight to your WhatsApp.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'hyperlocal_v_ads',
        'visual_brand_media',
        'paid_ad_campaigns',
      ],
    },
  },
  {
    order: 2,
    slug: 'interior-design-and-exteriors',
    title: 'Interior Design & Exteriors',
    shortTitle: 'Interiors & Exteriors',
    description:
      'Modular kitchens, turnkey home & office interiors, exterior facades, painting, landscaping, carpentry, and home upkeep.',
    icon: 'home',
    heroImage: '/images/category-heroes/interior-design-and-exteriors.webp',
    defaultSubcategorySlug: 'interiors-and-woodwork-execution',
    defaultTypeSlug: 'full-home-interior-designers',
    website_pattern: {
      pattern_id: 'visual-lookbook-room-estimator',
      pattern_title: 'Room Photo Gallery & Home Budget Estimate Website',
      layout_archetype:
        'Shows your finished kitchens, wardrobes, living rooms, and exterior work with simple package rates and a free home visit button.',
      hero_headline_template: 'Beautiful Home Interiors & Exterior Work by {business_name} in {city}',
      key_sections: [
        'Before & After Photos (Kitchen, Hall, Bedroom & Elevation)',
        'Simple 1BHK, 2BHK, 3BHK & Independent House Price Guide',
        'Materials Used, Branded Fittings & Warranty Promise',
        'Book a Free Home Visit & Design Discussion',
      ],
      conversion_cta: 'Get a Free Room Estimate',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Home Owners',
      summary:
        'Homeowners trust interior designers whose finished rooms they can actually see. Show your real work and make it easy to ask for an estimate.',
      funnel_steps: [
        'Post short videos of your completed kitchens and rooms on Free V Ads.',
        'Share your Room Photo Gallery & Estimate website whenever customers ask for sample work.',
        'Post regular room makeover Reels on Instagram & Facebook so new flat and house owners call you first.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'hyperlocal_v_ads',
        'visual_brand_media',
        'social_media_reach',
      ],
    },
  },
  {
    order: 3,
    slug: 'civil-construction-and-contractors',
    title: 'Civil Construction & Contractors',
    shortTitle: 'Civil & Contractors',
    description:
      'Architects, civil engineers, turnkey building contractors, construction materials, heavy equipment, borewell, and rural land works.',
    icon: 'tool',
    heroImage: '/images/category-heroes/civil-construction-and-contractors.webp',
    defaultSubcategorySlug: 'building-contractors-and-turnkey',
    defaultTypeSlug: 'turnkey-home-construction-contractors',
    website_pattern: {
      pattern_id: 'turnkey-portfolio-milestone-tracker',
      pattern_title: 'Completed Buildings & Construction Rate Website',
      layout_archetype:
        'Shows houses and buildings you have built, clear per-sq.ft rates, materials used, and a button to request a free plot inspection.',
      hero_headline_template: 'Trusted House Construction & Civil Work by {business_name} in {city}',
      key_sections: [
        'Photos of Completed Houses, Commercial Buildings & Site Work',
        'Clear Per-Sq.Ft Construction Packages & Material List',
        'Step-by-Step Work Quality & On-Time Handover Promise',
        'Request a Free Plot Visit & Cost Quote on WhatsApp',
      ],
      conversion_cta: 'Ask for Construction Quote',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Win More Building Contracts',
      summary:
        'Plot owners choose contractors who show real site photos, clear per-sq.ft rates, and a strong local reputation.',
      funnel_steps: [
        'Get listed free on VISTRAH and rank higher on Google Maps across nearby towns.',
        'Show your completed buildings and per-sq.ft packages clearly on your own website.',
        'Share ongoing site progress videos on Free V Ads to reach plot owners within 25–50 km.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'hyperlocal_v_ads',
        'google_local_seo',
        'visual_brand_media',
      ],
    },
  },
  {
    order: 4,
    slug: 'healthconnect-and-clinics',
    title: 'HealthConnect & Clinics',
    shortTitle: 'HealthConnect',
    description:
      'Hospitals, specialist clinics, dental care, diagnostic labs, pharmacies, physiotherapy, fitness centres, and veterinary care.',
    icon: 'heart',
    heroImage: '/images/category-heroes/healthconnect-and-clinics.webp',
    defaultSubcategorySlug: 'hospitals-and-clinics',
    defaultTypeSlug: 'multi-specialty-hospitals',
    website_pattern: {
      pattern_id: 'patient-trust-slot-booking',
      pattern_title: 'Doctor Profile, Timings & Appointment Website',
      layout_archetype:
        'Shows your doctors, treatments, lab tests, clinic timings, map directions, and an easy appointment booking button.',
      hero_headline_template: 'Trusted Care & Specialist Treatment at {business_name}, {city}',
      key_sections: [
        'Doctors, Qualifications & Years of Experience',
        'Treatments, Health Checkups & Home Sample Pickup',
        'Clinic Timings, Emergency Number & Insurance Accepted',
        'Easy WhatsApp or Phone Appointment Booking',
      ],
      conversion_cta: 'Book an Appointment',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Patients',
      summary:
        'Families check clinic timings, doctor details, and Google reviews near home before visiting. Make your clinic easy to find and trust.',
      funnel_steps: [
        'List your clinic free on VISTRAH with clear timings and direct phone numbers.',
        'Launch your Doctor Profile & Appointment website so patients book directly without middleman apps.',
        'Improve your Google Maps profile and share short 60-second doctor health tips on Free V Ads.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'google_local_seo',
        'hyperlocal_v_ads',
        'social_media_reach',
      ],
    },
  },
  {
    order: 5,
    slug: 'hospitality-restaurants-and-cafes',
    title: 'Hospitality, Restaurants & Cafés',
    shortTitle: 'Hospitality & Dining',
    description:
      'Family restaurants, specialty cafés, bakeries, cloud kitchens, catering, hotels, resorts, homestays, and curated tours.',
    icon: 'coffee',
    heroImage: '/images/category-heroes/hospitality-restaurants-and-cafes.webp',
    defaultSubcategorySlug: 'restaurants-and-dining',
    defaultTypeSlug: 'restaurants',
    website_pattern: {
      pattern_id: 'visual-menu-direct-ordering',
      pattern_title: 'Photo Menu, Table Booking & Direct Order Website',
      layout_archetype:
        'Shows mouth-watering photos of your best dishes or rooms, full menu prices, party catering, and direct WhatsApp ordering with zero commission.',
      hero_headline_template: 'Fresh Taste & Warm Welcome at {business_name}, {city}',
      key_sections: [
        'Best-Selling Dishes or Rooms with Clear Photos & Prices',
        'Direct WhatsApp Food Order, Table Booking or Room Stay Inquiry',
        'Party Catering, Family Packs & Hall Booking Details',
        'Google Map Directions, Opening Hours & Hygiene Standards',
      ],
      conversion_cta: 'Order Direct / Book a Table',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Table & Direct Orders',
      summary:
        'Keep 100% of your food and room earnings by showing hungry nearby customers your best items on video and letting them order directly.',
      funnel_steps: [
        'Post short kitchen and food videos on Free V Ads to reach customers within 5–10 km.',
        'Use your Photo Menu & Direct Order website so regulars order on WhatsApp with zero commission.',
        'Share weekend specials, catering packs, and room offers on Instagram & Facebook every week.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'hyperlocal_v_ads',
        'dedicated_website',
        'visual_brand_media',
        'social_media_reach',
      ],
    },
  },
  {
    order: 6,
    slug: 'salons-bridal-and-wellness',
    title: 'Salons, Bridal & Wellness',
    shortTitle: 'Salons & Bridal',
    description:
      'Unisex salons, bridal makeup studios, skin & hair aesthetics, spas, designer boutiques, bespoke tailoring, and jewellery.',
    icon: 'scissors',
    heroImage: '/images/category-heroes/salons-bridal-and-wellness.webp',
    defaultSubcategorySlug: 'salons-and-haircare',
    defaultTypeSlug: 'unisex-salons',
    website_pattern: {
      pattern_id: 'transformation-gallery-package-booking',
      pattern_title: 'Makeover Photos, Price List & Slot Booking Website',
      layout_archetype:
        'Shows your bridal, hair, and skin makeover photos, clear service price list, combo offers, and a quick appointment button.',
      hero_headline_template: 'Hair, Beauty, Bridal Makeovers & Wellness at {business_name}',
      key_sections: [
        'Real Bridal, Haircut & Facial Makeover Photos',
        'Clear Service Price List & Festive Combo Offers',
        'Experienced Stylists, Genuine Products & Clean Salon Care',
        'One-Tap WhatsApp Appointment or Bridal Trial Booking',
      ],
      conversion_cta: 'Book Your Slot',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Salon & Bridal Bookings',
      summary:
        'Customers book salons and bridal studios after seeing real makeover photos and clear package rates on their phone.',
      funnel_steps: [
        'Share hair and bridal makeover videos on Free V Ads across your area.',
        'Show your full price list and makeover photo gallery on your own booking website.',
        'Run festive and wedding-season Instagram & Facebook ads to fill daily and bridal slots.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'hyperlocal_v_ads',
        'social_media_reach',
        'dedicated_website',
        'paid_ad_campaigns',
      ],
    },
  },
  {
    order: 7,
    slug: 'events-weddings-and-media',
    title: 'Events, Weddings & Media',
    shortTitle: 'Events & Media',
    description:
      'Convention halls, wedding planners, stage & floral decor, candid photography, commercial film production, branding, and sound/LED setups.',
    icon: 'camera',
    heroImage: '/images/category-heroes/events-weddings-and-media.webp',
    defaultSubcategorySlug: 'weddings',
    defaultTypeSlug: 'wedding-planners',
    website_pattern: {
      pattern_id: 'cinematic-showreel-date-checker',
      pattern_title: 'Event Highlight Videos, Packages & Date Check Website',
      layout_archetype:
        'Shows your best wedding and event photos/videos, decoration or hall packages, and a quick button to check if an event date is free.',
      hero_headline_template: 'Memorable Weddings, Events & Photography by {business_name}',
      key_sections: [
        'Best Wedding, Stage Decor & Event Photo/Video Highlights',
        'Clear Hall, Decor, Catering or Photography Packages',
        'Happy Family Reviews & Smooth Event Promise',
        'Check Wedding / Event Date Availability on WhatsApp',
      ],
      conversion_cta: 'Check If Your Date Is Free',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Book More Event Dates',
      summary:
        'Families book wedding halls, decorators, and photographers months early when they see great highlight videos and can quickly check free dates.',
      funnel_steps: [
        'Upload a 30-second highlight video of your best event on Free V Ads.',
        'Send families to your Event Highlights & Date Check website to view packages.',
        'Run wedding-season Instagram & Facebook ads so families call you first to lock dates.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'visual_brand_media',
        'dedicated_website',
        'hyperlocal_v_ads',
        'paid_ad_campaigns',
      ],
    },
  },
  {
    order: 8,
    slug: 'automobiles-and-garages',
    title: 'Automobiles & Garages',
    shortTitle: 'Automobiles',
    description:
      'Multi-brand car & bike garages, EV servicing, ceramic detailing, tyres & batteries, showrooms, rentals, and 24x7 roadside assistance.',
    icon: 'truck',
    heroImage: '/images/category-heroes/automobiles-and-garages.webp',
    defaultSubcategorySlug: 'vehicle-servicing-and-repairs',
    defaultTypeSlug: 'scheduled-servicing',
    website_pattern: {
      pattern_id: 'service-bay-detailing-configurator',
      pattern_title: 'Vehicle Service Rates, Detailing & Pickup Booking Website',
      layout_archetype:
        'Shows your car and bike service packages, washing/detailing photos, emergency breakdown phone button, and doorstep pickup booking.',
      hero_headline_template: 'Trusted Car, Bike & EV Servicing at {business_name}, {city}',
      key_sections: [
        'Service, Oil Change, AC, Tyre & Washing Rates by Vehicle',
        'Garage Photos, Genuine Spare Parts & Skilled Mechanics',
        'Emergency Breakdown Call Button & Exact Google Map Pin',
        'Book Garage Slot or Doorstep Vehicle Pickup',
      ],
      conversion_cta: 'Book Vehicle Service',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Garage & Service Vehicles',
      summary:
        'Vehicle owners search Google Maps during breakdowns and trust garages that show clean workshop bays and upfront service prices.',
      funnel_steps: [
        'Pin your garage on VISTRAH and boost your Google Maps profile for urgent nearby searches.',
        'Post short videos of servicing, denting/painting, or detailing on Free V Ads.',
        'Use your Vehicle Service & Pickup website so owners can check rates and book slots.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'google_local_seo',
        'dedicated_website',
        'hyperlocal_v_ads',
        'visual_brand_media',
      ],
    },
  },
  {
    order: 9,
    slug: 'legal-tax-and-business-compliance',
    title: 'Legal, Tax & Business Compliance',
    shortTitle: 'Legal & Tax',
    description:
      'Chartered accountants, GST & income tax filing, company registration, advocates, property documentation, insurance, and IT advisory.',
    icon: 'briefcase',
    heroImage: '/images/category-heroes/legal-tax-and-business-compliance.webp',
    defaultSubcategorySlug: 'accounting-and-taxation',
    defaultTypeSlug: 'chartered-accountants',
    website_pattern: {
      pattern_id: 'authority-advisory-compliance-hub',
      pattern_title: 'Tax, Legal Services & Consultation Booking Website',
      layout_archetype:
        'Shows the filings and legal matters you handle, simple document checklists for clients, your qualifications, and an appointment button.',
      hero_headline_template: 'Clear Tax, GST, Company & Legal Help — {business_name}, {city}',
      key_sections: [
        'Services Offered (GST, Income Tax, Shop/Company Registration, Legal)',
        'Simple List of Documents Needed & Important Due Dates',
        'Qualifications, Years of Practice & Privacy Assurance',
        'Book a Phone or Office Consultation',
      ],
      conversion_cta: 'Book a Consultation',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Get More Regular Clients',
      summary:
        'Shopkeepers, salaried families, and local companies stay for years with advisors who explain tax and legal steps simply.',
      funnel_steps: [
        'List your office free on VISTRAH and rank higher on Google Search & Maps.',
        'Share your Services & Document Checklist website so clients know what papers to bring.',
        'Post short 60-second GST and tax due-date reminders on Free V Ads and Instagram.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'google_local_seo',
        'hyperlocal_v_ads',
        'social_media_reach',
      ],
    },
  },
  {
    order: 10,
    slug: 'overseas-education-and-skill-academies',
    title: 'Overseas, Education & Skill Academies',
    shortTitle: 'Overseas & Education',
    description:
      'Study abroad & visa consultants, IELTS/PTE coaching, schools, competitive exam academies, coding & skill institutes, and career placement.',
    icon: 'book',
    heroImage: '/images/category-heroes/overseas-education-and-skill-academies.webp',
    defaultSubcategorySlug: 'overseas-study-and-immigration',
    defaultTypeSlug: 'study-abroad-consultants',
    website_pattern: {
      pattern_id: 'course-catalog-counseling-funnel',
      pattern_title: 'Courses, Student Results & Free Counseling Website',
      layout_archetype:
        'Shows your courses or study-abroad countries, batch timings, student results/visas, and a button to book a free demo class or counseling call.',
      hero_headline_template: 'Coaching, Skills & Study Abroad Guidance at {business_name}',
      key_sections: [
        'Courses, Study-Abroad Countries & Upcoming Batch Timings',
        'Student Visa Successes, Exam Toppers & Job Placements',
        'Fee Structure, Scholarships & Documents Needed',
        'Book a Free Demo Class or Parent Counseling Session',
      ],
      conversion_cta: 'Book Free Demo / Counseling',
    },
    vertical_strategy: {
      plan_heading: 'Simple 3-Step Plan to Fill Your Next Batch',
      summary:
        'Students and parents join institutes that show real student results, clear batch details, and an easy free counseling call.',
      funnel_steps: [
        'List your courses free on VISTRAH and post student success videos on Free V Ads.',
        'Share your Courses & Free Counseling website with parents and students.',
        'Run admission-season Instagram & Facebook ads to fill seats before batches start.',
      ],
      recommended_pillar_ids: [
        'vistrah_presence',
        'dedicated_website',
        'hyperlocal_v_ads',
        'paid_ad_campaigns',
        'social_media_reach',
      ],
    },
  },
] as const;

export const FLAGSHIP_SECTOR_SLUGS: readonly FlagshipSectorSlug[] = FLAGSHIP_SECTORS.map(
  s => s.slug,
);

const SECTOR_BY_SLUG = new Map<string, FlagshipSector>(
  FLAGSHIP_SECTORS.map(sector => [sector.slug, sector]),
);

export function getFlagshipSector(slug: string | null | undefined): FlagshipSector | undefined {
  if (!slug) return undefined;
  return SECTOR_BY_SLUG.get(slug.trim().toLowerCase());
}

export type BusinessAuditSignals = {
  is_vistrah_claimed?: boolean;
  has_website?: boolean;
  website_url?: string | null;
  has_active_v_ad?: boolean;
  has_social_presence?: boolean;
  instagram_url?: string | null;
  facebook_url?: string | null;
  has_paid_campaigns?: boolean;
  has_visual_media?: boolean;
  photo_url?: string | null;
  has_google_local_seo?: boolean;
  google_place_id?: string | null;
  phone?: string | null;
  has_coordinates?: boolean;
};

export type PillarBreakdownItem = {
  pillar_id: AuditPillarId;
  product_title: string;
  short_title: string;
  max_points: number;
  earned_points: number;
  status: 'active' | 'lacking';
  active_in_baseline: boolean;
  unit_price_inr: number;
  billing_type: AuditBillingType;
  billing_label: string;
  gap_code: string;
  description: string;
  summary: string;
  deliverable_highlights: readonly string[];
};

export type IdentifiedGapItem = {
  pillar_id: AuditPillarId;
  gap_code: string;
  product_title: string;
  missing_points: number;
  unit_price_inr: number;
  billing_type: AuditBillingType;
  billing_label: string;
  summary: string;
};

export type BusinessAuditScoreResult = {
  baseline_score: number;
  score_tier_label: ScoreTierLabel;
  max_score: 100;
  pillar_breakdown: PillarBreakdownItem[];
  identified_gaps: IdentifiedGapItem[];
  gap_codes: string[];
};

export type SimulatedTickedPlanResult = {
  baseline_score: number;
  projected_score: number;
  projected_tier_label: ScoreTierLabel;
  score_gain: number;
  ticked_pillar_ids: AuditPillarId[];
  newly_added_pillar_ids: AuditPillarId[];
  free_items_count: number;
  one_time_total_inr: number;
  monthly_total_inr: number;
  subtotal_before_gst_inr: number;
  gst_included: boolean;
  gst_rate_percent: 18;
  gst_amount_inr: number;
  one_time_gst_inr: number;
  monthly_gst_inr: number;
  grand_total_with_gst_inr: number;
};

function isNonEmptyString(val: string | null | undefined): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

export function evaluatePillarActiveMap(
  signals: BusinessAuditSignals,
): Record<AuditPillarId, boolean> {
  const hasWebsite = Boolean(signals.has_website || isNonEmptyString(signals.website_url));
  const hasSocial = Boolean(
    signals.has_social_presence ||
      isNonEmptyString(signals.instagram_url) ||
      isNonEmptyString(signals.facebook_url),
  );
  const hasMedia = Boolean(signals.has_visual_media || isNonEmptyString(signals.photo_url));
  const hasLocalSeo =
    signals.has_google_local_seo !== undefined
      ? Boolean(signals.has_google_local_seo)
      : Boolean(
          isNonEmptyString(signals.google_place_id) ||
            (isNonEmptyString(signals.phone) && signals.has_coordinates),
        );

  return {
    vistrah_presence: Boolean(signals.is_vistrah_claimed),
    dedicated_website: hasWebsite,
    hyperlocal_v_ads: Boolean(signals.has_active_v_ad),
    social_media_reach: hasSocial,
    paid_ad_campaigns: Boolean(signals.has_paid_campaigns),
    visual_brand_media: hasMedia,
    google_local_seo: hasLocalSeo,
  };
}

/**
 * Deterministically computes a business's 0-100 baseline score, plain-language tier, 7-item breakdown, and missing items.
 */
export function calculateBusinessAuditScore(
  signals: BusinessAuditSignals,
): BusinessAuditScoreResult {
  const activeMap = evaluatePillarActiveMap(signals);
  let baseline = 0;
  const breakdown: PillarBreakdownItem[] = [];
  const gaps: IdentifiedGapItem[] = [];

  for (const pillar of AUDIT_PILLARS) {
    const isActive = activeMap[pillar.id];
    const earned = isActive ? pillar.max_points : 0;
    baseline += earned;
    breakdown.push({
      pillar_id: pillar.id,
      product_title: pillar.product_title,
      short_title: pillar.short_title,
      max_points: pillar.max_points,
      earned_points: earned,
      status: isActive ? 'active' : 'lacking',
      active_in_baseline: isActive,
      unit_price_inr: pillar.unit_price_inr,
      billing_type: pillar.billing_type,
      billing_label: pillar.billing_label,
      gap_code: pillar.gap_code,
      description: pillar.description,
      summary: pillar.description,
      deliverable_highlights: pillar.deliverable_highlights,
    });

    if (!isActive) {
      gaps.push({
        pillar_id: pillar.id,
        gap_code: pillar.gap_code,
        product_title: pillar.product_title,
        missing_points: pillar.max_points,
        unit_price_inr: pillar.unit_price_inr,
        billing_type: pillar.billing_type,
        billing_label: pillar.billing_label,
        summary: pillar.gap_summary,
      });
    }
  }

  const clampedBaseline = Math.max(0, Math.min(TOTAL_AUDIT_POINTS, baseline));
  return {
    baseline_score: clampedBaseline,
    score_tier_label: getScoreTierLabel(clampedBaseline),
    max_score: TOTAL_AUDIT_POINTS,
    pillar_breakdown: breakdown,
    identified_gaps: gaps,
    gap_codes: gaps.map(g => g.gap_code),
  };
}

function isAuditScoreResult(
  val: BusinessAuditScoreResult | BusinessAuditSignals,
): val is BusinessAuditScoreResult {
  return 'pillar_breakdown' in val && Array.isArray((val as BusinessAuditScoreResult).pillar_breakdown);
}

export function simulateTickedPlan(
  auditOrSignals: BusinessAuditScoreResult | BusinessAuditSignals,
  tickedPillarIds: readonly string[],
  options?: { gstIncluded?: boolean },
): SimulatedTickedPlanResult {
  const audit = isAuditScoreResult(auditOrSignals)
    ? auditOrSignals
    : calculateBusinessAuditScore(auditOrSignals);

  const gstIncluded = options?.gstIncluded !== false;
  const seen = new Set<AuditPillarId>();
  const validTicked: AuditPillarId[] = [];
  for (const raw of tickedPillarIds) {
    if (raw in AUDIT_PILLAR_BY_ID) {
      const pid = raw as AuditPillarId;
      if (!seen.has(pid)) {
        seen.add(pid);
        validTicked.push(pid);
      }
    }
  }

  const activeSet = new Set<AuditPillarId>(
    audit.pillar_breakdown.filter(p => p.active_in_baseline).map(p => p.pillar_id),
  );

  let addedPoints = 0;
  let freeItemsCount = 0;
  let oneTimeTotalInr = 0;
  let monthlyTotalInr = 0;
  const newlyAdded: AuditPillarId[] = [];

  for (const pid of validTicked) {
    if (activeSet.has(pid)) {
      continue;
    }
    const def = AUDIT_PILLAR_BY_ID[pid];
    newlyAdded.push(pid);
    addedPoints += def.max_points;
    if (def.billing_type === 'free_forever') {
      freeItemsCount += 1;
    } else if (def.billing_type === 'one_time') {
      oneTimeTotalInr += def.unit_price_inr;
    } else if (def.billing_type === 'monthly') {
      monthlyTotalInr += def.unit_price_inr;
    }
  }

  const projectedScore = Math.min(TOTAL_AUDIT_POINTS, audit.baseline_score + addedPoints);
  const subtotalBeforeGstInr = oneTimeTotalInr + monthlyTotalInr;
  const oneTimeGstInr = gstIncluded ? Math.round((oneTimeTotalInr * GST_RATE_PERCENT) / 100) : 0;
  const monthlyGstInr = gstIncluded ? Math.round((monthlyTotalInr * GST_RATE_PERCENT) / 100) : 0;
  const gstAmountInr = gstIncluded
    ? Math.round((subtotalBeforeGstInr * GST_RATE_PERCENT) / 100)
    : 0;

  return {
    baseline_score: audit.baseline_score,
    projected_score: projectedScore,
    projected_tier_label: getScoreTierLabel(projectedScore),
    score_gain: projectedScore - audit.baseline_score,
    ticked_pillar_ids: validTicked,
    newly_added_pillar_ids: newlyAdded,
    free_items_count: freeItemsCount,
    one_time_total_inr: oneTimeTotalInr,
    monthly_total_inr: monthlyTotalInr,
    subtotal_before_gst_inr: subtotalBeforeGstInr,
    gst_included: gstIncluded,
    gst_rate_percent: GST_RATE_PERCENT,
    gst_amount_inr: gstAmountInr,
    one_time_gst_inr: oneTimeGstInr,
    monthly_gst_inr: monthlyGstInr,
    grand_total_with_gst_inr: subtotalBeforeGstInr + gstAmountInr,
  };
}
