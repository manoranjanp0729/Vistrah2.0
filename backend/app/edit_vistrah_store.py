"""Durable store for Edit Vistrah pages, sections, variations, and images."""
import json
import os
import copy
from datetime import datetime
from typing import Any

DATA_FILE = os.path.join(os.path.dirname(__file__), 'edit_vistrah_data.json')

DEFAULT_LIBRARY = [
    {
        'type': 'header',
        'default_name': 'Primary Header',
        'description': 'Top page navigation, brand lockup, account and quick tools.',
        'recommended_resolution': '600 × 160 px',
        'variations': [
            {'key': 'sticky_standard', 'name': 'Standard Sticky Header', 'description': 'Fixed top bar with logo, category navigation & profile actions.', 'badge': 'Most Popular'},
            {'key': 'minimal_transparent', 'name': 'Minimal Transparent Scrim', 'description': 'Blends seamlessly into hero banner with subtle dark contrast gradient.'},
            {'key': 'centered_brand', 'name': 'Centered Brand Lockup', 'description': 'Prominent central Vistrah insignia with split utility menus.'},
            {'key': 'elevated_segmented', 'name': 'Elevated with Service Tabs', 'description': 'Includes 3 service pathway quick-selector tabs.'},
        ],
        'default_features': [
            {'key': 'show_location_pill', 'label': 'Customer Location Pill', 'description': 'Displays currently selected GPS city or pin.', 'enabled': True},
            {'key': 'show_membership_badge', 'label': 'Member Badge', 'description': 'Highlights active Vistrah Gold or Business member status.', 'enabled': True},
            {'key': 'show_quick_cart', 'label': 'Quick Cart / Orders', 'description': 'Direct access to cart and active purchase orders.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/brand/lockup-dark.png',
                'title': 'Vistrah Primary Brand Lockup',
                'width': 600,
                'height': 160,
                'resolution': '600 × 160 px',
                'aspect_ratio': '15:4',
                'recommended_resolution': '600 × 160 px',
                'alt_text': 'Vistrah Marketplace Lockup',
            }
        ],
    },
    {
        'type': 'search_bar',
        'default_name': 'Discovery Search Bar',
        'description': 'Interactive search input with GPS location filtering and trending categories.',
        'recommended_resolution': '120 × 120 px',
        'variations': [
            {'key': 'hero_centered', 'name': 'Hero Centered with GPS Chips', 'description': 'Prominent large input with auto-detect GPS chips and voice assistant.', 'badge': 'Recommended'},
            {'key': 'header_compact', 'name': 'Header Compact Bar', 'description': 'Streamlined input embedded in the top app navigation bar.'},
            {'key': 'floating_pills', 'name': 'Floating with Trending Pills', 'description': 'Includes trending keyword chips directly underneath search.'},
            {'key': 'predictive_filter', 'name': 'Predictive Filter Bar', 'description': 'Shows real-time dropdown suggestions with category and provider badges.'},
        ],
        'default_features': [
            {'key': 'enable_gps_detection', 'label': 'GPS Use My Location', 'description': 'Requires explicit button tap for privacy compliance.', 'enabled': True},
            {'key': 'enable_voice_search', 'label': 'Voice Search Assistant', 'description': 'Allows microphone input for localized service searches.', 'enabled': True},
            {'key': 'show_recent_queries', 'label': 'Recent Search History', 'description': 'Displays previous search suggestions for faster repeat lookup.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/brand/vistrah-v.png',
                'title': 'Search Lens Insignia',
                'width': 120,
                'height': 120,
                'resolution': '120 × 120 px',
                'aspect_ratio': '1:1',
                'recommended_resolution': '120 × 120 px',
                'alt_text': 'Search Brand Mark',
            }
        ],
    },
    {
        'type': 'hero_banner',
        'default_name': 'Hero Banner Section',
        'description': 'High-impact visual banner showcasing headline, primary offers and key calls to action.',
        'recommended_resolution': '1920 × 1080 px (16:9)',
        'variations': [
            {'key': 'cinematic_carousel', 'name': 'Cinematic Rotating Carousel', 'description': 'Full-bleed slides with automatic smooth rotation and dots navigation.', 'badge': '16:9 / 21:9'},
            {'key': 'split_hero', 'name': 'Split Hero with CTA', 'description': 'Left text copy with headline and right high-res image showcase.'},
            {'key': 'gradient_spotlight', 'name': 'Gradient Scrim Spotlight', 'description': 'Cinematic brand gradient with floating highlighted service cards.'},
            {'key': 'video_backdrop', 'name': 'Dynamic Video Backdrop', 'description': 'Background looping video with sound toggle and overlay text.'},
        ],
        'default_features': [
            {'key': 'enable_auto_rotation', 'label': 'Auto-rotate Slides', 'description': 'Slides automatically every 5 seconds when idle.', 'enabled': True},
            {'key': 'show_promo_badge', 'label': 'Seasonal Promotional Badge', 'description': 'Highlights festive deals (e.g. "Diwali Special: Up to 40% Off").', 'enabled': True},
            {'key': 'show_direct_cta', 'label': 'Primary CTA Button', 'description': 'Displays high-visibility button navigating to services or offers.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/images/marketplace/application-desk.webp',
                'title': 'Professional Service Desk Hero',
                'width': 1920,
                'height': 1080,
                'resolution': '1920 × 1080 px',
                'aspect_ratio': '16:9',
                'recommended_resolution': '1920 × 1080 px',
                'alt_text': 'Vistrah Professional Business Services',
            },
            {
                'url': '/images/marketplace/billboard.webp',
                'title': 'Citywide Marketing & Advertising Hero',
                'width': 1920,
                'height': 1080,
                'resolution': '1920 × 1080 px',
                'aspect_ratio': '16:9',
                'recommended_resolution': '1920 × 1080 px',
                'alt_text': 'Citywide Billboard Showcase',
            },
        ],
    },
    {
        'type': 'services_for_you',
        'default_name': 'Services For You',
        'description': 'Personalized service recommendations, category rails, and fixed-price packages.',
        'recommended_resolution': '800 × 600 px (4:3) or 800 × 800 px (1:1)',
        'variations': [
            {'key': 'adaptive_grid', 'name': 'Adaptive 4x2 Responsive Grid', 'description': 'Smart responsive grid adjusting from 2 columns on mobile to 4 on desktop.', 'badge': 'Standard'},
            {'key': 'horizontal_cards', 'name': 'Horizontal Swipeable Rail', 'description': 'Smooth sideways scrolling photo card rail for mobile and phone view.'},
            {'key': 'category_icon_rail', 'name': 'Circular Category Icon Rail', 'description': 'Compact category icons with live service count badges.'},
            {'key': 'package_tiles', 'name': 'Fixed-Price Commerce Tiles', 'description': 'Displays fixed rupee pricing and instant Add to Cart buttons.'},
        ],
        'default_features': [
            {'key': 'show_ratings_reviews', 'label': 'Star Ratings & Review Count', 'description': 'Shows verified customer review score on each card.', 'enabled': True},
            {'key': 'show_price_tag', 'label': 'Price Tag / Estimate', 'description': 'Displays Starting at ₹X or Fixed Price per unit.', 'enabled': True},
            {'key': 'show_verified_tick', 'label': 'Verified Provider Badge', 'description': 'Green verification badge for approved local businesses.', 'enabled': True},
            {'key': 'enable_direct_inquiry', 'label': 'Direct Enquiry Action', 'description': 'Allows requesting a quick quote directly from the card.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/images/marketplace/business-launch.webp',
                'title': 'Business Launch & Consulting',
                'width': 800,
                'height': 600,
                'resolution': '800 × 600 px',
                'aspect_ratio': '4:3',
                'recommended_resolution': '800 × 600 px',
                'alt_text': 'Business Launch Service Card',
            },
            {
                'url': '/images/marketplace/building-inspection.webp',
                'title': 'Building & Property Inspection',
                'width': 800,
                'height': 600,
                'resolution': '800 × 600 px',
                'aspect_ratio': '4:3',
                'recommended_resolution': '800 × 600 px',
                'alt_text': 'Property Inspection Service Card',
            },
        ],
    },
    {
        'type': 'editable_banner',
        'default_name': 'Editable Promotional Banner',
        'description': 'Customizable marketing banner with editable photo, headline, coupon code, and destination link.',
        'recommended_resolution': '1200 × 400 px (3:1) or 1600 × 500 px',
        'variations': [
            {'key': 'full_promotional', 'name': 'Full-bleed Promotional Billboard', 'description': 'Edge-to-edge promotional banner with contrast background and coupon code badge.', 'badge': 'High Conversion'},
            {'key': 'twin_banners', 'name': 'Twin Half-width Banners', 'description': 'Two complementary banners side-by-side.'},
            {'key': 'countdown_ribbon', 'name': 'Flash Sale Countdown Ribbon', 'description': 'Thin high-visibility banner with active countdown timer.'},
            {'key': 'spotlight_callout', 'name': 'Accent Spotlight Callout', 'description': 'Curved card container with gradient border and verified guarantee seal.'},
        ],
        'default_features': [
            {'key': 'show_coupon_code', 'label': 'Coupon Code Pill', 'description': 'Copyable voucher code (e.g. "VISTRAH100").', 'enabled': True},
            {'key': 'show_expiry_countdown', 'label': 'Offer Expiry Countdown', 'description': 'Displays remaining hours/days for urgency.', 'enabled': False},
            {'key': 'clickable_whole_banner', 'label': 'Clickable Entire Banner', 'description': 'Entire banner area acts as direct link.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/images/marketplace/site-contractors.webp',
                'title': 'Verified Contractors Promotional Banner',
                'width': 1200,
                'height': 400,
                'resolution': '1200 × 400 px',
                'aspect_ratio': '3:1',
                'recommended_resolution': '1200 × 400 px',
                'alt_text': 'Verified Contractors Offer Banner',
            }
        ],
    },
    {
        'type': 'big_widget',
        'default_name': 'Big Widget (Vistrah Ads & Marketing)',
        'description': 'Rich media showcase widget featuring vertical video ads, interactive marketing reels and creator spotlight.',
        'recommended_resolution': '1080 × 1920 px (9:16) or 1920 × 1080 px (16:9)',
        'variations': [
            {'key': 'reels_teaser', 'name': 'Vertical 9:16 Video Reels Teaser', 'description': 'Embedded vertical reels feed with sound control and Explore Product / Brand buttons.', 'badge': '9:16 Reel'},
            {'key': 'showcase_card', 'name': '16:9 Video Showcase Card', 'description': 'Full-frame video demonstration card with engagement metrics.', 'badge': '16:9 Full'},
            {'key': 'creator_studio_cta', 'name': 'Creator Studio Onboarding Widget', 'description': 'Promotes free seller video advertising and creator tools.', 'badge': 'Creator Studio'},
            {'key': 'multivideo_slider', 'name': 'Multi-video Interactive Slider', 'description': 'Horizontal carousel of multiple trending community ads.', 'badge': 'Multi-Reel'},
        ],
        'default_features': [
            {'key': 'enable_autoplay_on_view', 'label': 'Autoplay When in View', 'description': 'Autoplays video taking the largest visible screen area.', 'enabled': True},
            {'key': 'show_explore_button', 'label': 'Explore Product / Brand Button', 'description': 'Opens product details sheet or navigates to brand profile.', 'enabled': True},
            {'key': 'show_engagement_stats', 'label': 'Engagement Stats (Likes & Views)', 'description': 'Displays live community metrics.', 'enabled': True},
            {'key': 'show_sound_toggle', 'label': 'Interactive Sound Control', 'description': 'Allows one-tap mute / unmute.', 'enabled': True},
        ],
        'default_images': [
            {
                'url': '/images/marketplace/digital-analytics.webp',
                'title': 'V Ads Analytics & Marketing Widget Banner',
                'width': 1080,
                'height': 1920,
                'resolution': '1080 × 1920 px',
                'aspect_ratio': '9:16',
                'recommended_resolution': '1080 × 1920 px',
                'alt_text': 'Vistrah Video Advertising Widget',
            }
        ],
    },
]

DEFAULT_PAGES = [
    {
        'id': 'page-home',
        'slug': 'home',
        'name': 'Home Page',
        'path': '/',
        'description': 'Vistrah primary landing page featuring header, search, hero carousel, curated services, promotional banners and V Ads spotlight.',
        'target_platform': 'all',
        'status': 'LIVE',
        'revision': 3,
        'published_version': 3,
        'published_at': datetime.now().isoformat(),
        'sections': [
            {
                'id': 'sec-home-header',
                'type': 'header',
                'name': 'Main Sticky Header',
                'variation': 'sticky_standard',
                'available_variations': DEFAULT_LIBRARY[0]['variations'],
                'features': DEFAULT_LIBRARY[0]['default_features'],
                'images': DEFAULT_LIBRARY[0]['default_images'],
                'order': 1,
                'enabled': True,
            },
            {
                'id': 'sec-home-search',
                'type': 'search_bar',
                'name': 'GPS Discovery Search Bar',
                'variation': 'hero_centered',
                'available_variations': DEFAULT_LIBRARY[1]['variations'],
                'features': DEFAULT_LIBRARY[1]['default_features'],
                'images': DEFAULT_LIBRARY[1]['default_images'],
                'order': 2,
                'enabled': True,
            },
            {
                'id': 'sec-home-hero',
                'type': 'hero_banner',
                'name': 'Festive Hero Carousel',
                'variation': 'cinematic_carousel',
                'available_variations': DEFAULT_LIBRARY[2]['variations'],
                'features': DEFAULT_LIBRARY[2]['default_features'],
                'images': DEFAULT_LIBRARY[2]['default_images'],
                'order': 3,
                'enabled': True,
            },
            {
                'id': 'sec-home-services',
                'type': 'services_for_you',
                'name': 'Curated Services For You',
                'variation': 'adaptive_grid',
                'available_variations': DEFAULT_LIBRARY[3]['variations'],
                'features': DEFAULT_LIBRARY[3]['default_features'],
                'images': DEFAULT_LIBRARY[3]['default_images'],
                'order': 4,
                'enabled': True,
            },
            {
                'id': 'sec-home-banner',
                'type': 'editable_banner',
                'name': 'Seasonal Promo Billboard',
                'variation': 'full_promotional',
                'available_variations': DEFAULT_LIBRARY[4]['variations'],
                'features': DEFAULT_LIBRARY[4]['default_features'],
                'images': DEFAULT_LIBRARY[4]['default_images'],
                'order': 5,
                'enabled': True,
            },
            {
                'id': 'sec-home-widget',
                'type': 'big_widget',
                'name': 'Vistrah Ads & Marketing Big Widget',
                'variation': 'reels_teaser',
                'available_variations': DEFAULT_LIBRARY[5]['variations'],
                'features': DEFAULT_LIBRARY[5]['default_features'],
                'images': DEFAULT_LIBRARY[5]['default_images'],
                'order': 6,
                'enabled': True,
            },
        ],
    },
    {
        'id': 'page-services',
        'slug': 'services',
        'name': 'Services & Categories',
        'path': '/services',
        'description': 'Master service discovery directory with taxonomy filters, subcategories, and verified providers.',
        'target_platform': 'all',
        'status': 'LIVE',
        'revision': 1,
        'published_version': 1,
        'published_at': datetime.now().isoformat(),
        'sections': [
            {
                'id': 'sec-services-header',
                'type': 'header',
                'name': 'Compact Services Header',
                'variation': 'sticky_standard',
                'available_variations': DEFAULT_LIBRARY[0]['variations'],
                'features': DEFAULT_LIBRARY[0]['default_features'],
                'images': DEFAULT_LIBRARY[0]['default_images'],
                'order': 1,
                'enabled': True,
            },
            {
                'id': 'sec-services-search',
                'type': 'search_bar',
                'name': 'Category Predictive Search',
                'variation': 'predictive_filter',
                'available_variations': DEFAULT_LIBRARY[1]['variations'],
                'features': DEFAULT_LIBRARY[1]['default_features'],
                'images': DEFAULT_LIBRARY[1]['default_images'],
                'order': 2,
                'enabled': True,
            },
            {
                'id': 'sec-services-list',
                'type': 'services_for_you',
                'name': 'All Categories & Services Directory',
                'variation': 'adaptive_grid',
                'available_variations': DEFAULT_LIBRARY[3]['variations'],
                'features': DEFAULT_LIBRARY[3]['default_features'],
                'images': DEFAULT_LIBRARY[3]['default_images'],
                'order': 3,
                'enabled': True,
            },
        ],
    },
    {
        'id': 'page-v-ads',
        'slug': 'v-ads',
        'name': 'V Ads Studio & Reels',
        'path': '/v-ads',
        'description': 'Video advertising reels feed, community spotlight, and creator studio tools.',
        'target_platform': 'all',
        'status': 'LIVE',
        'revision': 2,
        'published_version': 2,
        'published_at': datetime.now().isoformat(),
        'sections': [
            {
                'id': 'sec-vads-header',
                'type': 'header',
                'name': 'Cinematic V Ads Top Bar',
                'variation': 'minimal_transparent',
                'available_variations': DEFAULT_LIBRARY[0]['variations'],
                'features': DEFAULT_LIBRARY[0]['default_features'],
                'images': DEFAULT_LIBRARY[0]['default_images'],
                'order': 1,
                'enabled': True,
            },
            {
                'id': 'sec-vads-widget',
                'type': 'big_widget',
                'name': 'Vertical 9:16 Reels Full Experience',
                'variation': 'reels_teaser',
                'available_variations': DEFAULT_LIBRARY[5]['variations'],
                'features': DEFAULT_LIBRARY[5]['default_features'],
                'images': DEFAULT_LIBRARY[5]['default_images'],
                'order': 2,
                'enabled': True,
            },
        ],
    },
    {
        'id': 'page-v-essentials',
        'slug': 'v-essentials',
        'name': 'V Essentials',
        'path': '/v-essentials',
        'description': 'Curated everyday essentials, home necessities, and verified fast local fulfillment.',
        'target_platform': 'all',
        'status': 'LIVE',
        'revision': 1,
        'published_version': 1,
        'published_at': datetime.now().isoformat(),
        'sections': [
            {
                'id': 'sec-vess-header',
                'type': 'header',
                'name': 'V Essentials Header',
                'variation': 'sticky_standard',
                'available_variations': DEFAULT_LIBRARY[0]['variations'],
                'features': DEFAULT_LIBRARY[0]['default_features'],
                'images': DEFAULT_LIBRARY[0]['default_images'],
                'order': 1,
                'enabled': True,
            },
            {
                'id': 'sec-vess-banner',
                'type': 'editable_banner',
                'name': 'Daily Essentials Flash Banner',
                'variation': 'full_promotional',
                'available_variations': DEFAULT_LIBRARY[4]['variations'],
                'features': DEFAULT_LIBRARY[4]['default_features'],
                'images': DEFAULT_LIBRARY[4]['default_images'],
                'order': 2,
                'enabled': True,
            },
            {
                'id': 'sec-vess-grid',
                'type': 'services_for_you',
                'name': 'Essential Goods Catalog',
                'variation': 'package_tiles',
                'available_variations': DEFAULT_LIBRARY[3]['variations'],
                'features': DEFAULT_LIBRARY[3]['default_features'],
                'images': DEFAULT_LIBRARY[3]['default_images'],
                'order': 3,
                'enabled': True,
            },
        ],
    },
]


class EditVistrahStore:
    def __init__(self):
        self._pages: dict[str, dict[str, Any]] = {}
        self._load()

    def _load(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self._pages = {p['slug']: p for p in data if 'slug' in p}
                        return
            except Exception:
                pass
        # Fallback to default pages
        self._pages = {p['slug']: copy.deepcopy(p) for p in DEFAULT_PAGES}
        self._save()

    def _save(self):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(list(self._pages.values()), f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def list_pages(self) -> list[dict[str, Any]]:
        return [
            {
                'id': p['id'],
                'slug': p['slug'],
                'name': p['name'],
                'path': p['path'],
                'description': p['description'],
                'target_platform': p['target_platform'],
                'status': p.get('status', 'DRAFT'),
                'revision': p.get('revision', 1),
                'published_version': p.get('published_version'),
                'published_at': p.get('published_at'),
                'section_count': len(p.get('sections', [])),
                'sections': copy.deepcopy(p.get('sections', [])),
            }
            for p in self._pages.values()
        ]

    def get_page(self, slug: str) -> dict[str, Any] | None:
        p = self._pages.get(slug)
        if not p:
            return None
        return copy.deepcopy(p)

    def create_page(self, slug: str, name: str, path: str, description: str, target_platform: str = 'all') -> dict[str, Any]:
        slug = slug.strip().lower()
        if not slug or not slug.replace('-', '').isalnum():
            raise ValueError('Invalid slug: must be alphanumeric or hyphenated')
        if slug in self._pages:
            raise ValueError(f'Page with slug "{slug}" already exists')

        new_page = {
            'id': f'page-{slug}',
            'slug': slug,
            'name': name.strip() or slug.capitalize(),
            'path': path.strip() or f'/{slug}',
            'description': description.strip(),
            'target_platform': target_platform if target_platform in ['all', 'web', 'mobile'] else 'all',
            'status': 'DRAFT',
            'revision': 1,
            'published_version': None,
            'published_at': None,
            'sections': [],
        }
        self._pages[slug] = new_page
        self._save()
        return copy.deepcopy(new_page)

    def update_page(self, slug: str, patch: dict[str, Any]) -> dict[str, Any]:
        page = self._pages.get(slug)
        if not page:
            raise KeyError(f'Page "{slug}" not found')

        if 'name' in patch and patch['name']:
            page['name'] = str(patch['name']).strip()
        if 'description' in patch:
            page['description'] = str(patch['description']).strip()
        if 'path' in patch and patch['path']:
            page['path'] = str(patch['path']).strip()
        if 'target_platform' in patch and patch['target_platform'] in ['all', 'web', 'mobile']:
            page['target_platform'] = patch['target_platform']
        if 'sections' in patch and isinstance(patch['sections'], list):
            page['sections'] = patch['sections']

        page['revision'] = page.get('revision', 0) + 1
        page['status'] = 'DRAFT'
        self._save()
        return copy.deepcopy(page)

    def publish_page(self, slug: str) -> dict[str, Any]:
        page = self._pages.get(slug)
        if not page:
            raise KeyError(f'Page "{slug}" not found')

        page['status'] = 'LIVE'
        next_ver = (page.get('published_version') or 0) + 1
        page['published_version'] = next_ver
        page['published_at'] = datetime.now().isoformat()
        self._save()
        return copy.deepcopy(page)

    def delete_page(self, slug: str) -> bool:
        if slug in ['home', 'services']:
            raise ValueError('Core pages cannot be deleted')
        if slug in self._pages:
            del self._pages[slug]
            self._save()
            return True
        return False

    def get_library(self) -> list[dict[str, Any]]:
        return copy.deepcopy(DEFAULT_LIBRARY)


edit_vistrah_store = EditVistrahStore()
