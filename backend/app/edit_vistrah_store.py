"""Durable store for Edit Vistrah pages, sections, variations, and images."""
import json
import os
import copy
import tempfile
from threading import RLock
from urllib.parse import urlsplit
from datetime import datetime
from typing import Any
from pathlib import Path

LEGACY_DATA_FILE = os.path.join(os.path.dirname(__file__), 'edit_vistrah_data.json')
DATA_FILE = os.environ.get('EDIT_VISTRAH_DATA_FILE', '/data/edit_vistrah_data.json' if os.path.isdir('/data') else LEGACY_DATA_FILE)

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


APP_DEFAULTS_FILE = Path(__file__).resolve().parents[2] / 'shared' / 'edit-vistrah-page-defaults.json'

class EditVistrahStore:
    def __init__(self, data_file=None):
        self.data_file = data_file or DATA_FILE
        self._lock = RLock()
        self._pages = {}
        self._published = {}
        self._load()

    def _load(self):
        source = self.data_file
        if not os.path.exists(source) and self.data_file == DATA_FILE and os.path.exists(LEGACY_DATA_FILE):
            source = LEGACY_DATA_FILE
        if not os.path.exists(source):
            self._pages = {}
            return
        with open(source, 'r', encoding='utf-8') as stream:
            data = json.load(stream)
        if isinstance(data, list):
            if source != self.data_file:
                # Bundled sample layouts are not evidence of a runtime publication.
                templates = {p['slug']: p for p in DEFAULT_PAGES}
                custom = []
                for page in data:
                    template = templates.get(page['slug'])
                    if template and page.get('sections') == template.get('sections') and page.get('name') == template.get('name'):
                        continue
                    custom.append(dict(page, status='DRAFT', content_source='DRAFT', published_version=None, published_at=None))
                self._pages = {p['slug']: p for p in custom}
                self._published = {}
            else:
                self._pages = {p['slug']: p for p in data}
                self._published = {slug: copy.deepcopy(p) for slug, p in self._pages.items() if p.get('status') == 'LIVE'}
        elif isinstance(data, dict) and data.get('schema_version') == 1:
            self._pages = {p['slug']: p for p in data['pages']}
            self._published = data['published']
        else:
            raise ValueError('Invalid Edit Vistrah content file; existing data has not been overwritten')

    def _commit(self, pages, published):
        pages = {slug: page for slug, page in pages.items() if not (page.get('content_source') == 'APP' and page.get('revision') == 1 and not page.get('published_version'))}
        directory = os.path.dirname(os.path.abspath(self.data_file))
        os.makedirs(directory, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix='.edit-vistrah-', suffix='.json', dir=directory)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump({'schema_version': 1, 'pages': list(pages.values()), 'published': published}, stream, ensure_ascii=False, indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.data_file)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        self._pages, self._published = pages, published

    def _editor_pages(self):
        with APP_DEFAULTS_FILE.open(encoding='utf-8') as stream:
            defaults = {p['slug']: p for p in json.load(stream)}
        pages = {slug: dict(page, content_source='APP') for slug, page in defaults.items()}
        for slug, stored in self._pages.items():
            # Upgrade former empty placeholder entries, but never replace a saved draft.
            if slug in defaults and (not stored.get('sections') or stored.get('content_source') == 'APP') and stored.get('revision', 1) == 1 and not stored.get('published_version'):
                continue
            pages[slug] = dict(copy.deepcopy(stored), content_source='CMS' if slug in self._published else 'DRAFT')
        return pages

    def list_pages(self):
        with self._lock:
            return [dict(copy.deepcopy(p), section_count=len(p.get('sections', []))) for p in self._editor_pages().values()]

    def get_page(self, slug):
        with self._lock:
            return copy.deepcopy(self._editor_pages().get(slug))

    def get_live_page(self, slug):
        with self._lock:
            page = copy.deepcopy(self._published.get(slug))
            if page:
                page['sections'] = sorted([s for s in page.get('sections', []) if s.get('enabled', True)], key=lambda s: s.get('order', 0))
            return page

    def _validate(self, page):
        if page.get('target_platform') not in ('all', 'web', 'mobile'):
            raise ValueError('Choose all, web or mobile')
        path = page.get('path', '')
        if not path.startswith('/') or path.startswith('//') or any(c in path for c in ('\\', '?', '#')) or '..' in path:
            raise ValueError('Page path must be a local path without query parameters')
        if path.startswith(('/admin', '/api', '/seller', '/account', '/login', '/register')):
            raise ValueError('Account and administrative routes cannot be replaced with content pages')
        if path.startswith('/marketing-services/') and page['slug'] not in ('digital-marketing', 'branding-creative-production', 'outdoor-advertising-signage', 'mobility-billboard-advertising'):
            raise ValueError('Use /pages/' + page['slug'] + ' for a custom page')
        if path not in ('/', '/services', '/v-ads', '/v-essentials', '/marketing-solutions') and path not in ('/pages/' + page['slug'], '/marketing-services/' + page['slug']):
            raise ValueError('Use /pages/' + page['slug'] + ' for a custom page, or its existing marketing service path')
        if any(p['slug'] != page['slug'] and p['path'] == path for p in self._editor_pages().values()):
            raise ValueError('Another page already uses this path')
        canonical = {'home': '/', 'services': '/services', 'v-ads': '/v-ads', 'v-essentials': '/v-essentials', 'marketing-solutions': '/marketing-solutions'}
        if page['slug'] in canonical and path != canonical[page['slug']]:
            raise ValueError('This page must keep its existing app path: ' + canonical[page['slug']])
        sections = page.get('sections', [])
        if len(sections) > 30 or len(json.dumps(page)) > 900000:
            raise ValueError('Page exceeds the content limit; use hosted media URLs for larger images')
        ids = set()
        for section in sections:
            if not isinstance(section, dict) or not isinstance(section.get('id'), str) or section['id'] in ids:
                raise ValueError('Sections require unique IDs')
            ids.add(section['id'])
            if section.get('type') not in ('header', 'search_bar', 'hero_banner', 'services_for_you', 'editable_banner', 'big_widget', 'custom'):
                raise ValueError('Unsupported section type')
            if not isinstance(section.get('order'), int) or not isinstance(section.get('enabled'), bool):
                raise ValueError('Section order and visibility are required')
            if not isinstance(section.get('images', []), list) or len(section.get('images', [])) > 20:
                raise ValueError('A section can contain up to 20 images')
            if not isinstance(section.get('name'), str) or not section['name'].strip():
                raise ValueError('Each section requires a name')
            if not isinstance(section.get('variation'), str):
                raise ValueError('Each section requires a layout')
            for field in ('features', 'available_variations'):
                if not isinstance(section.get(field, []), list):
                    raise ValueError('Invalid section ' + field)
            if any(not isinstance(f, dict) or not isinstance(f.get('key'), str) or not isinstance(f.get('enabled'), bool) for f in section.get('features', [])):
                raise ValueError('Invalid feature definition')
            content = section.get('content', {})
            if not isinstance(content, dict):
                raise ValueError('Invalid section content')
            for locale, values in content.items():
                if locale not in ('en', 'kn', 'hi') or not isinstance(values, dict):
                    raise ValueError('Content must use English, Kannada or Hindi fields')
                if any(not isinstance(v, str) or len(v) > 5000 for v in values.values()):
                    raise ValueError('Section text must be shorter than 5000 characters')
            href = section.get('action_href', '')
            if not isinstance(href, str):
                raise ValueError('Invalid button destination')
            if href and not href.startswith('mailto:info@vistrah.in') and (not href.startswith('/') or href.startswith('//') or any(c in href for c in ('\\', '\n', '\r')) or '..' in href):
                raise ValueError('Button destinations must be local app paths')
            videos = section.get('video_urls', [])
            if not isinstance(videos, list) or len(videos) > 12:
                raise ValueError('A section can contain up to 12 videos')
            for video in videos:
                if not isinstance(video, str) or not ((video.startswith('/') and not video.startswith('//') and '..' not in video and '\\' not in video) or (urlsplit(video).scheme == 'https' and urlsplit(video).hostname and not urlsplit(video).username)):
                    raise ValueError('Use a local or HTTPS video URL')
            if any(c in href for c in ('\\', '\r', '\n')):
                raise ValueError('Invalid button destination')
            if href.startswith('mailto:') and (urlsplit(href).path != 'info@vistrah.in' or urlsplit(href).fragment):
                raise ValueError('Use the official VISTRAH contact email')
            for image in section.get('images', []):
                if not isinstance(image, dict) or not isinstance(image.get('url'), str):
                    raise ValueError('Each image requires a URL')
                url = image['url']
                local = url.startswith('/') and not url.startswith('//') and '..' not in url and '\\' not in url
                remote = urlsplit(url).scheme == 'https' and bool(urlsplit(url).hostname) and not urlsplit(url).username
                embedded = url.startswith(('data:image/png;base64,', 'data:image/jpeg;base64,', 'data:image/webp;base64,', 'data:image/gif;base64,'))
                if not (local or remote or embedded):
                    raise ValueError('Use a local image, HTTPS image URL, or PNG/JPEG/WebP/GIF upload')

    def create_page(self, slug, name, path='', description='', target_platform='all'):
        with self._lock:
            slug = slug.strip().lower()
            if not slug or not slug.replace('-', '').isalnum() or slug in self._editor_pages():
                raise ValueError('Use a unique alphanumeric or hyphenated slug')
            page = {'id': 'page-' + slug, 'slug': slug, 'name': name.strip() or slug, 'path': ('/pages/' + slug if not path.strip() or path.strip() == '/' + slug else path.strip()),
                    'description': description, 'target_platform': target_platform, 'status': 'DRAFT', 'revision': 1,
                    'published_version': None, 'published_at': None, 'sections': []}
            self._validate(page)
            pages = copy.deepcopy(self._pages)
            pages[slug] = page
            self._commit(pages, copy.deepcopy(self._published))
            return copy.deepcopy(page)

    def update_page(self, slug, patch):
        with self._lock:
            if slug not in self._editor_pages():
                raise KeyError(slug)
            pages = self._editor_pages()
            page = pages[slug]
            if patch.get('revision') is not None and patch['revision'] != page['revision']:
                raise ValueError('This page changed in another editor. Reload before saving')
            for field in ('name', 'description', 'path', 'target_platform', 'sections'):
                if field in patch and patch[field] is not None:
                    page[field] = copy.deepcopy(patch[field])
            self._validate(page)
            page['revision'] += 1
            page['status'] = 'DRAFT'
            page['content_source'] = 'CMS' if slug in self._published else 'DRAFT'
            self._commit(pages, copy.deepcopy(self._published))
            return copy.deepcopy(page)

    def publish_page(self, slug, revision=None):
        with self._lock:
            if slug not in self._editor_pages():
                raise KeyError(slug)
            pages, published = self._editor_pages(), copy.deepcopy(self._published)
            page = pages[slug]
            if revision is not None and revision != page['revision']:
                raise ValueError('This page changed in another editor. Reload before publishing')
            self._validate(page)
            if not any(section.get('enabled') and section.get('type') != 'header' for section in page['sections']):
                raise ValueError('Add an enabled content section before publishing')
            page.update(status='LIVE', content_source='CMS', published_version=(page.get('published_version') or 0) + 1, published_at=datetime.now().isoformat())
            published[slug] = copy.deepcopy(page)
            self._commit(pages, published)
            return copy.deepcopy(page)

    def delete_page(self, slug):
        with self._lock:
            if slug in ('home', 'services', 'v-ads', 'v-essentials', 'marketing-solutions', 'digital-marketing', 'branding-creative-production', 'outdoor-advertising-signage', 'mobility-billboard-advertising'):
                raise ValueError('Core pages cannot be deleted')
            if slug not in self._pages:
                return False
            pages, published = copy.deepcopy(self._pages), copy.deepcopy(self._published)
            del pages[slug]
            published.pop(slug, None)
            self._commit(pages, published)
            return True

    def get_library(self):
        return copy.deepcopy(DEFAULT_LIBRARY)


edit_vistrah_store = EditVistrahStore()
