export type ImageDetails = {
  url: string;
  title?: string;
  width?: number;
  height?: number;
  resolution?: string; // e.g. "1920 × 1080 px"
  aspect_ratio?: string; // e.g. "16:9"
  recommended_resolution?: string;
  alt_text?: string;
};

export type SectionVariation = {
  key: string;
  name: string;
  description: string;
  badge?: string;
};

export type SectionFeatureInclusion = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type SectionCopy = {title?:string;description?:string;action?:string};
export type LiveVistrahPage = Pick<VistrahPage,'slug'|'name'|'path'|'description'|'target_platform'|'published_version'|'published_at'|'sections'>;

export type PageSection = {
  content?: Partial<Record<'en'|'kn'|'hi',SectionCopy>>;
  action_href?: string;
  video_urls?: string[];
  id: string;
  type: string; // 'header' | 'search_bar' | 'hero_banner' | 'services_for_you' | 'editable_banner' | 'big_widget' | 'custom'
  name: string; // Unique section name (e.g. "Festive Gold Banner")
  variation: string; // Active variation key
  available_variations: SectionVariation[];
  features: SectionFeatureInclusion[];
  images: ImageDetails[];
  order: number;
  enabled: boolean;
  notes?: string;
};

export type VistrahPage = {
  content_source?: 'APP'|'CMS'|'DRAFT';
  id: string;
  slug: string; // e.g. 'home', 'services', 'v-ads', 'festive-deals'
  name: string; // e.g. "Home Page", "V Essentials"
  path: string; // e.g. '/', '/services', '/v-ads'
  description: string;
  target_platform: 'all' | 'web' | 'mobile';
  status: 'DRAFT' | 'LIVE';
  revision: number;
  published_version?: number;
  published_at?: string;
  sections: PageSection[];
};

export type SectionLibraryItem = {
  type: string;
  default_name: string;
  description: string;
  recommended_resolution: string;
  variations: SectionVariation[];
  default_features: SectionFeatureInclusion[];
  default_images: ImageDetails[];
};

export const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    type: 'header',
    default_name: 'Primary Header',
    description: 'Top page navigation, brand lockup, account and quick tools.',
    recommended_resolution: '800 × 200 px (Brand Lockup)',
    variations: [
      { key: 'sticky_standard', name: 'Standard Sticky Header', description: 'Fixed top bar with logo, category navigation & profile actions.', badge: 'Most Popular' },
      { key: 'minimal_transparent', name: 'Minimal Transparent Scrim', description: 'Blends seamlessly into hero banner with subtle dark contrast gradient.' },
      { key: 'centered_brand', name: 'Centered Brand Lockup', description: 'Prominent central Vistrah insignia with split utility menus.' },
      { key: 'elevated_segmented', name: 'Elevated with Service Tabs', description: 'Includes 3 service pathway quick-selector tabs.' },
    ],
    default_features: [
      { key: 'show_location_pill', label: 'Customer Location Pill', description: 'Displays currently selected GPS city or pin.', enabled: true },
      { key: 'show_membership_badge', label: 'Member Badge', description: 'Highlights active Vistrah Gold or Business member status.', enabled: true },
      { key: 'show_quick_cart', label: 'Quick Cart / Orders', description: 'Direct access to cart and active purchase orders.', enabled: true },
    ],
    default_images: [
      {
        url: '/brand/lockup-dark.png',
        title: 'Vistrah Primary Brand Lockup',
        width: 600,
        height: 160,
        resolution: '600 × 160 px',
        aspect_ratio: '15:4',
        recommended_resolution: '600 × 160 px',
        alt_text: 'Vistrah Marketplace Lockup',
      },
    ],
  },
  {
    type: 'search_bar',
    default_name: 'Discovery Search Bar',
    description: 'Interactive search input with GPS location filtering and trending categories.',
    recommended_resolution: '120 × 120 px (Icon Assets)',
    variations: [
      { key: 'hero_centered', name: 'Hero Centered with GPS Chips', description: 'Prominent large input with auto-detect GPS chips and voice assistant.', badge: 'Recommended' },
      { key: 'header_compact', name: 'Header Compact Bar', description: 'Streamlined input embedded in the top app navigation bar.' },
      { key: 'floating_pills', name: 'Floating with Trending Pills', description: 'Includes trending keyword chips directly underneath search.' },
      { key: 'predictive_filter', name: 'Predictive Filter Bar', description: 'Shows real-time dropdown suggestions with category and provider badges.' },
    ],
    default_features: [
      { key: 'enable_gps_detection', label: 'GPS Use My Location', description: 'Requires explicit button tap for privacy compliance.', enabled: true },
      { key: 'enable_voice_search', label: 'Voice Search Assistant', description: 'Allows microphone input for localized service searches.', enabled: true },
      { key: 'show_recent_queries', label: 'Recent Search History', description: 'Displays previous search suggestions for faster repeat lookup.', enabled: true },
    ],
    default_images: [
      {
        url: '/brand/vistrah-v.png',
        title: 'Search Lens Insignia',
        width: 120,
        height: 120,
        resolution: '120 × 120 px',
        aspect_ratio: '1:1',
        recommended_resolution: '120 × 120 px',
        alt_text: 'Search Brand Mark',
      },
    ],
  },
  {
    type: 'hero_banner',
    default_name: 'Hero Banner Section',
    description: 'High-impact visual banner showcasing headline, primary offers and key calls to action.',
    recommended_resolution: '1920 × 1080 px (16:9)',
    variations: [
      { key: 'cinematic_carousel', name: 'Cinematic Rotating Carousel', description: 'Full-bleed slides with automatic smooth rotation and dots navigation.', badge: '16:9 / 21:9' },
      { key: 'split_hero', name: 'Split Hero with CTA', description: 'Left text copy with headline and right high-res image showcase.' },
      { key: 'gradient_spotlight', name: 'Gradient Scrim Spotlight', description: 'Cinematic brand gradient with floating highlighted service cards.' },
      { key: 'video_backdrop', name: 'Dynamic Video Backdrop', description: 'Background looping video with sound toggle and overlay text.' },
    ],
    default_features: [
      { key: 'enable_auto_rotation', label: 'Auto-rotate Slides', description: 'Slides automatically every 5 seconds when idle.', enabled: true },
      { key: 'show_promo_badge', label: 'Seasonal Promotional Badge', description: 'Highlights festive deals (e.g. "Diwali Special: Up to 40% Off").', enabled: true },
      { key: 'show_direct_cta', label: 'Primary CTA Button', description: 'Displays high-visibility button navigating to services or offers.', enabled: true },
    ],
    default_images: [
      {
        url: '/images/marketplace/application-desk.webp',
        title: 'Professional Service Desk Hero',
        width: 1920,
        height: 1080,
        resolution: '1920 × 1080 px',
        aspect_ratio: '16:9',
        recommended_resolution: '1920 × 1080 px',
        alt_text: 'Vistrah Professional Business Services',
      },
      {
        url: '/images/marketplace/billboard.webp',
        title: 'Citywide Marketing & Advertising Hero',
        width: 1920,
        height: 1080,
        resolution: '1920 × 1080 px',
        aspect_ratio: '16:9',
        recommended_resolution: '1920 × 1080 px',
        alt_text: 'Citywide Billboard Showcase',
      },
    ],
  },
  {
    type: 'services_for_you',
    default_name: 'Services For You',
    description: 'Personalized service recommendations, category rails, and fixed-price packages.',
    recommended_resolution: '800 × 600 px (4:3) or 800 × 800 px (1:1)',
    variations: [
      { key: 'adaptive_grid', name: 'Adaptive 4x2 Responsive Grid', description: 'Smart responsive grid adjusting from 2 columns on mobile to 4 on desktop.', badge: 'Standard' },
      { key: 'horizontal_cards', name: 'Horizontal Swipeable Rail', description: 'Smooth sideways scrolling photo card rail for mobile and phone view.' },
      { key: 'category_icon_rail', name: 'Circular Category Icon Rail', description: 'Compact category icons with live service count badges.' },
      { key: 'package_tiles', name: 'Fixed-Price Commerce Tiles', description: 'Displays fixed rupee pricing and instant Add to Cart buttons.' },
    ],
    default_features: [
      { key: 'show_ratings_reviews', label: 'Star Ratings & Review Count', description: 'Shows verified customer review score on each card.', enabled: true },
      { key: 'show_price_tag', label: 'Price Tag / Estimate', description: 'Displays Starting at ₹X or Fixed Price per unit.', enabled: true },
      { key: 'show_verified_tick', label: 'Verified Provider Badge', description: 'Green verification badge for approved local businesses.', enabled: true },
      { key: 'enable_direct_inquiry', label: 'Direct Enquiry Action', description: 'Allows requesting a quick quote directly from the card.', enabled: true },
    ],
    default_images: [
      {
        url: '/images/marketplace/business-launch.webp',
        title: 'Business Launch & Consulting',
        width: 800,
        height: 600,
        resolution: '800 × 600 px',
        aspect_ratio: '4:3',
        recommended_resolution: '800 × 600 px',
        alt_text: 'Business Launch Service Card',
      },
      {
        url: '/images/marketplace/building-inspection.webp',
        title: 'Building & Property Inspection',
        width: 800,
        height: 600,
        resolution: '800 × 600 px',
        aspect_ratio: '4:3',
        recommended_resolution: '800 × 600 px',
        alt_text: 'Property Inspection Service Card',
      },
    ],
  },
  {
    type: 'editable_banner',
    default_name: 'Editable Promotional Banner',
    description: 'Customizable marketing banner with editable photo, headline, coupon code, and destination link.',
    recommended_resolution: '1200 × 400 px (3:1) or 1600 × 500 px',
    variations: [
      { key: 'full_promotional', name: 'Full-bleed Promotional Billboard', description: 'Edge-to-edge promotional banner with contrast background and coupon code badge.', badge: 'High Conversion' },
      { key: 'twin_banners', name: 'Twin Half-width Banners', description: 'Two complementary banners side-by-side (e.g. Seller Onboarding + Customer Discount).' },
      { key: 'countdown_ribbon', name: 'Flash Sale Countdown Ribbon', description: 'Thin high-visibility banner with active countdown timer.' },
      { key: 'spotlight_callout', name: 'Accent Spotlight Callout', description: 'Curved card container with gradient border and verified guarantee seal.' },
    ],
    default_features: [
      { key: 'show_coupon_code', label: 'Coupon Code Pill', description: 'Copyable voucher code (e.g. "VISTRAH100").', enabled: true },
      { key: 'show_expiry_countdown', label: 'Offer Expiry Countdown', description: 'Displays remaining hours/days for urgency.', enabled: false },
      { key: 'clickable_whole_banner', label: 'Clickable Entire Banner', description: 'Entire banner area acts as direct link.', enabled: true },
    ],
    default_images: [
      {
        url: '/images/marketplace/site-contractors.webp',
        title: 'Verified Contractors Promotional Banner',
        width: 1200,
        height: 400,
        resolution: '1200 × 400 px',
        aspect_ratio: '3:1',
        recommended_resolution: '1200 × 400 px',
        alt_text: 'Verified Contractors Offer Banner',
      },
    ],
  },
  {
    type: 'big_widget',
    default_name: 'Big Widget (Vistrah Ads & Marketing)',
    description: 'Rich media showcase widget featuring vertical video ads, interactive marketing reels and creator spotlight.',
    recommended_resolution: '1080 × 1920 px (9:16 Vertical) or 1920 × 1080 px (16:9)',
    variations: [
      { key: 'reels_teaser', name: 'Vertical 9:16 Video Reels Teaser', description: 'Embedded vertical reels feed with sound control and Explore Product / Brand buttons.', badge: '9:16 Reel' },
      { key: 'showcase_card', name: '16:9 Video Showcase Card', description: 'Full-frame video demonstration card with engagement metrics.', badge: '16:9 Full' },
      { key: 'creator_studio_cta', name: 'Creator Studio Onboarding Widget', description: 'Promotes free seller video advertising and creator tools.', badge: 'Creator Studio' },
      { key: 'multivideo_slider', name: 'Multi-video Interactive Slider', description: 'Horizontal carousel of multiple trending community ads.', badge: 'Multi-Reel' },
    ],
    default_features: [
      { key: 'enable_autoplay_on_view', label: 'Autoplay When in View', description: 'Autoplays video taking the largest visible screen area.', enabled: true },
      { key: 'show_explore_button', label: 'Explore Product / Brand Button', description: 'Opens product details sheet or navigates to brand profile.', enabled: true },
      { key: 'show_engagement_stats', label: 'Engagement Stats (Likes & Views)', description: 'Displays live community metrics.', enabled: true },
      { key: 'show_sound_toggle', label: 'Interactive Sound Control', description: 'Allows one-tap mute / unmute.', enabled: true },
    ],
    default_images: [
      {
        url: '/images/marketplace/digital-analytics.webp',
        title: 'V Ads Analytics & Marketing Widget Banner',
        width: 1080,
        height: 1920,
        resolution: '1080 × 1920 px',
        aspect_ratio: '9:16',
        recommended_resolution: '1080 × 1920 px',
        alt_text: 'Vistrah Video Advertising Widget',
      },
    ],
  },
];

export const INITIAL_EDIT_VISTRAH_PAGES: VistrahPage[] = [
  {
    id: 'page-home',
    slug: 'home',
    name: 'Home Page',
    path: '/',
    description: 'Vistrah primary landing page featuring header, search, hero carousel, curated services, promotional banners and V Ads spotlight.',
    target_platform: 'all',
    status: 'LIVE',
    revision: 3,
    published_version: 3,
    published_at: new Date().toISOString(),
    sections: [
      {
        id: 'sec-home-header',
        type: 'header',
        name: 'Main Sticky Header',
        variation: 'sticky_standard',
        available_variations: SECTION_LIBRARY[0].variations,
        features: SECTION_LIBRARY[0].default_features,
        images: SECTION_LIBRARY[0].default_images,
        order: 1,
        enabled: true,
      },
      {
        id: 'sec-home-search',
        type: 'search_bar',
        name: 'GPS Discovery Search Bar',
        variation: 'hero_centered',
        available_variations: SECTION_LIBRARY[1].variations,
        features: SECTION_LIBRARY[1].default_features,
        images: SECTION_LIBRARY[1].default_images,
        order: 2,
        enabled: true,
      },
      {
        id: 'sec-home-hero',
        type: 'hero_banner',
        name: 'Festive Hero Carousel',
        variation: 'cinematic_carousel',
        available_variations: SECTION_LIBRARY[2].variations,
        features: SECTION_LIBRARY[2].default_features,
        images: SECTION_LIBRARY[2].default_images,
        order: 3,
        enabled: true,
      },
      {
        id: 'sec-home-services',
        type: 'services_for_you',
        name: 'Curated Services For You',
        variation: 'adaptive_grid',
        available_variations: SECTION_LIBRARY[3].variations,
        features: SECTION_LIBRARY[3].default_features,
        images: SECTION_LIBRARY[3].default_images,
        order: 4,
        enabled: true,
      },
      {
        id: 'sec-home-banner',
        type: 'editable_banner',
        name: 'Seasonal Promo Billboard',
        variation: 'full_promotional',
        available_variations: SECTION_LIBRARY[4].variations,
        features: SECTION_LIBRARY[4].default_features,
        images: SECTION_LIBRARY[4].default_images,
        order: 5,
        enabled: true,
      },
      {
        id: 'sec-home-widget',
        type: 'big_widget',
        name: 'Vistrah Ads & Marketing Big Widget',
        variation: 'reels_teaser',
        available_variations: SECTION_LIBRARY[5].variations,
        features: SECTION_LIBRARY[5].default_features,
        images: SECTION_LIBRARY[5].default_images,
        order: 6,
        enabled: true,
      },
    ],
  },
  {
    id: 'page-services',
    slug: 'services',
    name: 'Services & Categories',
    path: '/services',
    description: 'Master service discovery directory with taxonomy filters, subcategories, and verified providers.',
    target_platform: 'all',
    status: 'LIVE',
    revision: 1,
    published_version: 1,
    published_at: new Date().toISOString(),
    sections: [
      {
        id: 'sec-services-header',
        type: 'header',
        name: 'Compact Services Header',
        variation: 'sticky_standard',
        available_variations: SECTION_LIBRARY[0].variations,
        features: SECTION_LIBRARY[0].default_features,
        images: SECTION_LIBRARY[0].default_images,
        order: 1,
        enabled: true,
      },
      {
        id: 'sec-services-search',
        type: 'search_bar',
        name: 'Category Predictive Search',
        variation: 'predictive_filter',
        available_variations: SECTION_LIBRARY[1].variations,
        features: SECTION_LIBRARY[1].default_features,
        images: SECTION_LIBRARY[1].default_images,
        order: 2,
        enabled: true,
      },
      {
        id: 'sec-services-list',
        type: 'services_for_you',
        name: 'All Categories & Services Directory',
        variation: 'adaptive_grid',
        available_variations: SECTION_LIBRARY[3].variations,
        features: SECTION_LIBRARY[3].default_features,
        images: SECTION_LIBRARY[3].default_images,
        order: 3,
        enabled: true,
      },
    ],
  },
  {
    id: 'page-v-ads',
    slug: 'v-ads',
    name: 'V Ads Studio & Reels',
    path: '/v-ads',
    description: 'Video advertising reels feed, community spotlight, and creator studio tools.',
    target_platform: 'all',
    status: 'LIVE',
    revision: 2,
    published_version: 2,
    published_at: new Date().toISOString(),
    sections: [
      {
        id: 'sec-vads-header',
        type: 'header',
        name: 'Cinematic V Ads Top Bar',
        variation: 'minimal_transparent',
        available_variations: SECTION_LIBRARY[0].variations,
        features: SECTION_LIBRARY[0].default_features,
        images: SECTION_LIBRARY[0].default_images,
        order: 1,
        enabled: true,
      },
      {
        id: 'sec-vads-widget',
        type: 'big_widget',
        name: 'Vertical 9:16 Reels Full Experience',
        variation: 'reels_teaser',
        available_variations: SECTION_LIBRARY[5].variations,
        features: SECTION_LIBRARY[5].default_features,
        images: SECTION_LIBRARY[5].default_images,
        order: 2,
        enabled: true,
      },
    ],
  },
  {
    id: 'page-v-essentials',
    slug: 'v-essentials',
    name: 'V Essentials',
    path: '/v-essentials',
    description: 'Curated everyday essentials, home necessities, and verified fast local fulfillment.',
    target_platform: 'all',
    status: 'LIVE',
    revision: 1,
    published_version: 1,
    published_at: new Date().toISOString(),
    sections: [
      {
        id: 'sec-vess-header',
        type: 'header',
        name: 'V Essentials Header',
        variation: 'sticky_standard',
        available_variations: SECTION_LIBRARY[0].variations,
        features: SECTION_LIBRARY[0].default_features,
        images: SECTION_LIBRARY[0].default_images,
        order: 1,
        enabled: true,
      },
      {
        id: 'sec-vess-banner',
        type: 'editable_banner',
        name: 'Daily Essentials Flash Banner',
        variation: 'full_promotional',
        available_variations: SECTION_LIBRARY[4].variations,
        features: SECTION_LIBRARY[4].default_features,
        images: SECTION_LIBRARY[4].default_images,
        order: 2,
        enabled: true,
      },
      {
        id: 'sec-vess-grid',
        type: 'services_for_you',
        name: 'Essential Goods Catalog',
        variation: 'package_tiles',
        available_variations: SECTION_LIBRARY[3].variations,
        features: SECTION_LIBRARY[3].default_features,
        images: SECTION_LIBRARY[3].default_images,
        order: 3,
        enabled: true,
      },
    ],
  },
];


export function calculateAspectRatio(w: number, h: number): string {
  if (!w || !h || w <= 0 || h <= 0) return 'Custom';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(w, h);
  const rw = w / divisor;
  const rh = h / divisor;
  if (rw > 50 || rh > 50) {
    return `${(w / h).toFixed(2)}:1`;
  }
  return `${rw}:${rh}`;
}

export function editVistrahClient(fetcher: <T>(path: string, options?: RequestInit) => Promise<T>) {
  const revisions=new Map<string,number>();
  const remember=(page:VistrahPage)=>{revisions.set(page.slug,page.revision);return page;};
  return {
    listPages: () => fetcher<VistrahPage[]>('/admin/edit-vistrah/pages'),
    getPage: (slug: string) => fetcher<VistrahPage>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}`).then(remember),
    createPage: (payload: { slug: string; name: string; path?: string; description?: string; target_platform?: string }) =>
      fetcher<VistrahPage>('/admin/edit-vistrah/pages', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then(remember),
    updatePage: (slug: string, payload: Partial<VistrahPage>) =>
      fetcher<VistrahPage>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify({...payload,sections:payload.sections?.map(section=>({...section,video_urls:section.video_urls?.map(url=>url.trim()).filter(Boolean)})),revision:payload.revision??revisions.get(slug)}),
      }).then(remember),
    publishPage: (slug: string) =>
      fetcher<VistrahPage>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}/publish`, {
        method: 'POST',
        body: JSON.stringify({revision:revisions.get(slug)}),
      }).then(remember),
    deletePage: (slug: string) =>
      fetcher<{ deleted: boolean; slug: string }>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      }),
    getLibrary: () => fetcher<SectionLibraryItem[]>('/admin/edit-vistrah/library'),
    getPublishedPage: (slug:string) => fetcher<LiveVistrahPage>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}/published`),
    unpublishPage: (slug:string,revision:number) => fetcher<VistrahPage>(`/admin/edit-vistrah/pages/${encodeURIComponent(slug)}/unpublish`,{method:'POST',body:JSON.stringify({revision})}).then(remember),
    getLivePage: (slug: string) => fetcher<LiveVistrahPage>(`/edit-vistrah/pages/${encodeURIComponent(slug)}`),
  };
}


export async function loadVistrahEditor(client:ReturnType<typeof editVistrahClient>,preferredSlug='home'){
 let pages:VistrahPage[];
 try{pages=await client.listPages();}catch(error){
  if((error as {status?:number})?.status===404)throw new Error('Edit Vistrah is unavailable in the running API (404). Existing pages cannot load until the local API is updated.');
  throw error;
 }
 if(!Array.isArray(pages))throw new Error('The page list response is invalid. Retry loading existing pages.');
 const target=pages.find(page=>page.slug===preferredSlug)??pages[0];
 const [details,library]=await Promise.allSettled([target?client.getPage(target.slug):Promise.resolve(null),client.getLibrary()]);
 const page=details.status==='fulfilled'?details.value:target??null;
 const warnings:string[]=[];
 if(details.status==='rejected'){
  if(!target||!Array.isArray(target.sections))throw new Error('Page details could not load. Retry before editing.');
  warnings.push('Showing saved details from the page list. Reload to confirm the latest revision.');
 }
 if(page&&!Array.isArray(page.sections))throw new Error('Page sections are missing from the API response. Retry loading existing pages.');
 if(library.status==='rejected')warnings.push('The section library could not load. Existing page details are available; retry to refresh the library.');
 return {pages,page,library:library.status==='fulfilled'?library.value:[],warning:warnings.join(' ')};
}

export function editorPageStatus(page:VistrahPage){
 if(page.content_source==='APP')return 'App content';
 if(page.content_source==='DRAFT')return page.published_version?'Unpublished (previous v'+page.published_version+')':'Draft';
 if(page.published_version)return 'Live v'+page.published_version+(page.status==='DRAFT'?' + draft':'');
 return 'Draft';
}
