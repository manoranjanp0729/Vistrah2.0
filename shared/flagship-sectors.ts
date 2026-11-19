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

export type AuditPillarDefinition = {
  readonly id: AuditPillarId;
  readonly product_title: string;
  readonly short_title: string;
  readonly max_points: number;
  readonly unit_price_inr: number;
  readonly billing_type: AuditBillingType;
  readonly billing_label: string;
  readonly gap_code: string;
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
 * 7-Pillar = 7-Product Scoring & Pricing Matrix (Total = 100 Points).
 * Business Listing (`vistrah_presence`) and Any-Radius V Ads (`hyperlocal_v_ads`) are ₹0 Free Forever.
 */
export const AUDIT_PILLARS: readonly AuditPillarDefinition[] = [
  {
    id: 'vistrah_presence',
    product_title: 'VISTRAH Verified Business Listing',
    short_title: 'VISTRAH Listing',
    max_points: 20,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 Free Forever',
    gap_code: 'unclaimed_vistrah',
    active_summary: 'Verified on VISTRAH with direct owner Call, WhatsApp & zero-commission discovery.',
    gap_summary: 'Not yet claimed as a verified VISTRAH business owner — missing direct zero-broker inquiries.',
    deliverable_highlights: [
      'Verified owner badge across your sector & child service types',
      'Direct Call, WhatsApp & map pin with 0% lead commission',
      'Instant access to My Business Growth & Audit dashboard',
    ],
  },
  {
    id: 'dedicated_website',
    product_title: 'Vertical Custom Website Build',
    short_title: 'Custom Website',
    max_points: 20,
    unit_price_inr: 4999,
    billing_type: 'one_time',
    billing_label: '₹4,999 One-Time',
    gap_code: 'missing_website',
    active_summary: 'Dedicated business website linked for high-intent customer trust & conversions.',
    gap_summary: 'No dedicated business website detected — losing high-intent searchers comparing credibility.',
    deliverable_highlights: [
      'Mobile-first sector blueprint tailored to your exact industry',
      'WhatsApp & tap-to-call lead capture + Google Maps embed',
      'SEO-ready pages with fast SSL hosting setup',
    ],
  },
  {
    id: 'hyperlocal_v_ads',
    product_title: 'Any-Radius Hyperlocal V Ad (9:16)',
    short_title: 'Free Hyperlocal V Ad',
    max_points: 15,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 Free Forever',
    gap_code: 'no_v_ad',
    active_summary: 'Active 9:16 hyperlocal V Ad broadcasting to nearby customers on VISTRAH.',
    gap_summary: 'No active 9:16 V Ad running — missing free any-radius video discovery inside VISTRAH.',
    deliverable_highlights: [
      '9:16 vertical video Reel placement in VISTRAH V Ads feed',
      'Target 2 km, 10 km, 25 km, 50 km+ or any radius at ₹0 forever',
      'Direct profile & call CTA right below your video ad',
    ],
  },
  {
    id: 'social_media_reach',
    product_title: 'Social Media Marketing & Reels Production',
    short_title: 'Social & Reels Studio',
    max_points: 15,
    unit_price_inr: 4999,
    billing_type: 'monthly',
    billing_label: '₹4,999/month',
    gap_code: 'missing_social_media',
    active_summary: 'Active Instagram/Facebook brand presence engaging local followers.',
    gap_summary: 'Weak or unlinked Instagram/Facebook Reels presence — missing recurring local recall.',
    deliverable_highlights: [
      'Monthly calendar of branded Reels, carousels & festival creatives',
      'Scriptwriting, editing & local hashtag optimization',
      'Consistent Instagram & Facebook page management',
    ],
  },
  {
    id: 'paid_ad_campaigns',
    product_title: 'Instagram & Facebook Paid Lead Ads',
    short_title: 'Paid Meta Lead Ads',
    max_points: 10,
    unit_price_inr: 3999,
    billing_type: 'monthly',
    billing_label: '₹3,999/month',
    gap_code: 'no_paid_campaigns',
    active_summary: 'Managed paid Meta/digital lead-generation campaigns driving targeted inquiries.',
    gap_summary: 'No structured hyperlocal Meta paid lead funnel — relying only on walk-in or word-of-mouth.',
    deliverable_highlights: [
      'Geo-fenced Instagram & Facebook lead generation campaigns',
      'Audience targeting, ad creative A/B testing & WhatsApp click-to-chat',
      'Zero markup on external Meta ad spend (paid at actuals)',
    ],
  },
  {
    id: 'visual_brand_media',
    product_title: 'Commercial Photo & Video Brand Shoot',
    short_title: 'Commercial Brand Shoot',
    max_points: 10,
    unit_price_inr: 2999,
    billing_type: 'one_time',
    billing_label: '₹2,999 One-Time',
    gap_code: 'missing_visual_media',
    active_summary: 'Verified storefront/work showcase photography published on listing.',
    gap_summary: 'Missing crisp storefront, team, or portfolio visuals — reducing first-impression trust.',
    deliverable_highlights: [
      'High-conversion storefront, product/service & founder showcase visuals',
      'Edited 9:16 commercial Reel cut ready for V Ads & Instagram',
      'Web-optimized gallery assets for listing, GBP & website',
    ],
  },
  {
    id: 'google_local_seo',
    product_title: 'Google Business Profile & Local SEO Boost',
    short_title: 'Google Local SEO',
    max_points: 10,
    unit_price_inr: 2499,
    billing_type: 'one_time',
    billing_label: '₹2,499 One-Time',
    gap_code: 'weak_local_seo',
    active_summary: 'Complete local map coordinates, contact phone & searchable address indexing.',
    gap_summary: 'Incomplete local map SEO signals (missing verified phone, pin accuracy, or keyword optimization).',
    deliverable_highlights: [
      'Google Business Profile category, service & keyword optimization',
      'NAP (Name, Address, Phone) & map pin accuracy alignment',
      'Review response playbook & local citation cleanup',
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
      pattern_title: 'Project Showcase & Plot Explorer',
      layout_archetype: 'Interactive inventory grid with RERA badges, plot/unit availability, location map & site-visit scheduler',
      hero_headline_template: 'Verified Plots, Homes & Commercial Spaces by {business_name} in {city}',
      key_sections: [
        'Featured Projects & Plot/Unit Filter (BHK, Sq.ft, Budget)',
        'RERA / Title Approvals & Amenities Highlights',
        'Interactive Neighbourhood Connectivity Map',
        '1-Click WhatsApp Brochure Download & Site Visit Booking',
      ],
      conversion_cta: 'Schedule a Free Site Visit',
    },
    vertical_strategy: {
      summary:
        'Capture serious property buyers directly without portal broker leakage using drone/walkthrough V Ads, a RERA-ready project microsite, and geo-targeted Meta lead forms.',
      funnel_steps: [
        'Claim free VISTRAH listing + upload 9:16 plot/apartment walkthrough V Ad',
        'Launch Project Showcase & Plot Explorer website with instant brochure capture',
        'Run NRI + city-investor Meta Lead Ads directly to your sales WhatsApp',
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
      pattern_title: 'Visual Lookbook & Room Cost Estimator',
      layout_archetype: 'Before/after room gallery with modular finish tiers, 2BHK/3BHK budget estimator & consultation booking',
      hero_headline_template: 'Bespoke Modular Interiors & Exterior Finishes by {business_name}',
      key_sections: [
        'Room-by-Room Lookbook (Kitchen, Living, Wardrobe, Facade)',
        'Interactive 1BHK / 2BHK / 3BHK / Villa Estimate Calculator',
        'Material & Hardware Brand Partners + Warranty Promise',
        'Book Free 3D Design Consultation CTA',
      ],
      conversion_cta: 'Calculate Room Estimate',
    },
    vertical_strategy: {
      summary:
        'Win high-ticket homeowners with before/after transformation Reels, an interactive room budget estimator website, and newly-handed-over apartment targeting.',
      funnel_steps: [
        'Publish completed handover walkthroughs as free 9:16 V Ads',
        'Convert curious homeowners via the Room Cost Estimator website',
        'Retarget local apartment corridors with Instagram transformation Reels',
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
      pattern_title: 'Turnkey Portfolio & Milestone Tracker',
      layout_archetype: 'Completed structure showcase with per-sq.ft package specs, BOQ transparency & site inspection booking',
      hero_headline_template: 'Trusted Civil Construction & Engineering by {business_name} in {city}',
      key_sections: [
        'Completed Residential, Commercial & Land Projects Portfolio',
        'Transparent Per-Sq.ft Package Comparison (Standard / Premium / Turnkey)',
        'Stage-Wise Quality & Structural Engineering Checklist',
        'Request Free Plot Assessment & BOQ Quotation',
      ],
      conversion_cta: 'Request BOQ Estimate',
    },
    vertical_strategy: {
      summary:
        'Build engineering authority and win turnkey contracts by showcasing live site quality, transparent per-sq.ft specs, and strong local map visibility.',
      funnel_steps: [
        'Verify your contractor/supplier listing + coverage radius on VISTRAH',
        'Showcase completed structures & per-sq.ft packages on your website',
        'Capture plot owners searching Google & VISTRAH within 25–50 km',
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
      pattern_title: 'Patient Trust & Slot Booking Portal',
      layout_archetype: 'Doctor credentials, treatment/test directory, clinic timings & instant WhatsApp/call appointment slot booking',
      hero_headline_template: 'Compassionate Specialist Care at {business_name}, {city}',
      key_sections: [
        'Specialist Doctors, Qualifications & Registration Credentials',
        'Treatments, Preventive Health Packages & Home Sample Collection',
        'OPD Timings, Emergency Contact & Insurance / Cashless Info',
        'Instant Appointment / Home Lab Slot Booking',
      ],
      conversion_cta: 'Book Clinic Appointment',
    },
    vertical_strategy: {
      summary:
        'Establish patient trust in your 5–15 km catchment with doctor-led educational V Ads, a credentialed appointment portal, and top Google Maps clinic visibility.',
      funnel_steps: [
        'Claim verified VISTRAH HealthConnect profile with OPD timings',
        'Launch Patient Trust & Slot Booking website for zero-aggregator bookings',
        'Share 60-second doctor health tips on V Ads & Google Business Profile',
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
      pattern_title: 'Visual Menu & Direct Zero-Commission Ordering',
      layout_archetype: 'Appetising signature dishes/rooms showcase with digital QR menu, table/stay booking & direct WhatsApp ordering',
      hero_headline_template: 'Signature Flavours & Warm Hospitality at {business_name}',
      key_sections: [
        'Bestseller Dishes / Stay Suites with Crisp Photography & Pricing',
        'Zero-Commission Direct Order / Table Reservation / Room Inquiry',
        'Party Catering, Bulk Orders & Banquet Packages',
        'Live Map Directions, Opening Hours & Hygiene Promise',
      ],
      conversion_cta: 'Order Direct / Reserve Table',
    },
    vertical_strategy: {
      summary:
        'Keep 100% of your food and stay margins by pairing mouth-watering 9:16 Reels & V Ads with a direct digital menu/reservation website.',
      funnel_steps: [
        'Upload sizzling kitchen/ambience V Ads for 5–10 km diners at ₹0',
        'Launch Visual Menu & Direct Zero-Commission Ordering website',
        'Run weekend dining, catering & staycation Reels across Instagram',
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
      pattern_title: 'Transformation Gallery & Package Booking',
      layout_archetype: 'Editorial bridal/makeover lookbook, transparent service menu cards, combo offers & stylist appointment booking',
      hero_headline_template: 'Luxury Styling, Bridal Makeovers & Wellness at {business_name}',
      key_sections: [
        'Bridal, Hair & Skin Transformation Lookbook',
        'Service Rate Card & Seasonal Grooming / Spa Packages',
        'Lead Stylists, Genuine Product Brands & Hygiene Standards',
        '1-Tap Stylist / Bridal Trial Slot Booking',
      ],
      conversion_cta: 'Book Appointment / Bridal Trial',
    },
    vertical_strategy: {
      summary:
        'Turn local beauty browsers into loyal repeat clients and high-value bridal bookings through makeover Reels, combo packages, and instant slot booking.',
      funnel_steps: [
        'Broadcast bridal & hair makeover 9:16 V Ads across your city at ₹0',
        'Publish service menu & Transformation Gallery booking website',
        'Run seasonal bridal & festive glow paid Instagram Lead Ads',
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
      pattern_title: 'Cinematic Showreel & Date Availability Checker',
      layout_archetype: 'Widescreen highlight reel, wedding/corporate event packages, capacity specs & muhurtham/event date availability form',
      hero_headline_template: 'Unforgettable Weddings, Events & Visual Stories by {business_name}',
      key_sections: [
        'Cinematic Showreel & Real Wedding / Corporate Event Albums',
        'Curated Decor, Photography, Venue or Production Packages',
        'Client Testimonials & Event Execution Timeline',
        'Check Muhurtham / Event Date Availability & Get Custom Quote',
      ],
      conversion_cta: 'Check Date Availability',
    },
    vertical_strategy: {
      summary:
        'Lock in wedding and corporate event dates months in advance with emotional highlight V Ads, a cinematic portfolio site, and targeted engagement-season ads.',
      funnel_steps: [
        'Feature your best 30-second event highlight Reel on VISTRAH V Ads',
        'Capture date-check inquiries on your Cinematic Showreel website',
        'Run wedding-season Instagram & Facebook Lead Ads across nearby districts',
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
      pattern_title: 'Service Bay & Detailing Package Configurator',
      layout_archetype: 'Hatchback/Sedan/SUV/Bike service matrix, ceramic/PPF detailing showcase, pickup-drop booking & 24x7 SOS button',
      hero_headline_template: 'Expert Multi-Brand Car, Bike & EV Care at {business_name}, {city}',
      key_sections: [
        'Periodic Service, Detailing, Tyre & AC Packages by Vehicle Type',
        'Workshop Bay Photos, Genuine OEM Parts & Diagnostic Tools',
        '24x7 Breakdown / Towing Emergency Call & Live Map Pin',
        'Book Doorstep Pickup & Service Slot',
      ],
      conversion_cta: 'Book Service Bay Slot',
    },
    vertical_strategy: {
      summary:
        'Dominate urgent breakdown searches and high-margin detailing/periodic service bookings with strong Google Local SEO, bay-tour V Ads, and clear package pricing.',
      funnel_steps: [
        'Pin your garage & emergency contact on VISTRAH + Google Maps SEO',
        'Show live ceramic coating / service bay quality via free 9:16 V Ads',
        'Convert vehicle owners via your Service Bay Configurator website',
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
      pattern_title: 'Authority Advisory & Compliance Checklist Hub',
      layout_archetype: 'Structured practice areas, document checklists (GST, ITR, Pvt Ltd, Property), partner credentials & consultation scheduler',
      hero_headline_template: 'Trusted Tax, Legal & Business Compliance Advisory — {business_name}',
      key_sections: [
        'Core Practice Areas (GST, Income Tax, Company Setup, Legal, Audit)',
        'Downloadable Client Document Checklists & Compliance Deadlines',
        'Advisor Credentials, Experience & Confidentiality Commitment',
        'Book Confidential Phone / Office Consultation',
      ],
      conversion_cta: 'Schedule Advisory Call',
    },
    vertical_strategy: {
      summary:
        'Attract high-LTV business retainers and compliance filings by projecting institutional credibility through an Authority Advisory website and deadline-driven explainer Reels.',
      funnel_steps: [
        'Verify professional credentials on VISTRAH for zero-middleman B2B leads',
        'Launch Authority Advisory & Compliance Checklist Hub website',
        'Publish 60-second GST/ITR/compliance deadline updates on V Ads & Social',
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
      pattern_title: 'Course Catalog & Admission Counseling Funnel',
      layout_archetype: 'Country/course explorer, batch schedules, student visa/exam success stories & 1-on-1 counseling registration',
      hero_headline_template: 'Global Admissions, Coaching & Career Pathways with {business_name}',
      key_sections: [
        'Study Abroad Countries / Coaching Programs & Batch Calendar',
        'Student Visa Approvals, Topper Scores & Placement Track Record',
        'Scholarship, Eligibility & Document Readiness Guide',
        'Book Free 1-on-1 Profile Evaluation / Demo Class',
      ],
      conversion_cta: 'Book Free Counseling Session',
    },
    vertical_strategy: {
      summary:
        'Fill upcoming intake batches and study-abroad pipelines with student success Reels, a structured Course & Counseling website, and intake-season Meta Lead Ads.',
      funnel_steps: [
        'List courses & visa specialties free on VISTRAH + upload student story V Ads',
        'Capture student & parent inquiries on your Course & Counseling Funnel site',
        'Scale batch enrollments with targeted Instagram & Facebook Lead Ads',
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
  max_score: 100;
  pillar_breakdown: PillarBreakdownItem[];
  identified_gaps: IdentifiedGapItem[];
  gap_codes: string[];
};

export type SimulatedTickedPlanResult = {
  baseline_score: number;
  projected_score: number;
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
 * Deterministically computes a business's 0-100 baseline score, 7-pillar breakdown, and identified gaps.
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
      summary: isActive ? pillar.active_summary : pillar.gap_summary,
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
    max_score: TOTAL_AUDIT_POINTS,
    pillar_breakdown: breakdown,
    identified_gaps: gaps,
    gap_codes: gaps.map(g => g.gap_code),
  };
}

/**
 * Deterministically simulates projected score (`<= 100`) and INR pricing totals
 * (`free_items_count`, `one_time_total_inr`, `monthly_total_inr`, and 18% `gst_amount_inr`)
 * for a set of ticked pillar IDs. Pillars already active in baseline are never double-counted
 * or double-billed.
 */
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
