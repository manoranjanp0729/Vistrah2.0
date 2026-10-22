/**
 * Shared Marketing Ad Templates and video creation schemas for V Ads Studio.
 * Designed to be open and easily extensible for new templates, stickers, and audio moods.
 */

export type MarketingTemplateId =
  | 'offer-sale'
  | 'service-showcase'
  | 'brand-launch'
  | 'customer-review';

export type MusicMoodId = 'upbeat' | 'festive' | 'corporate' | 'ambient';

export interface MarketingTemplate {
  id: MarketingTemplateId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  icon: 'tag' | 'award' | 'zap' | 'star';
  themeColor: string;
  gradient: [string, string, string];
  defaultHeadline: string;
  defaultBadge: string;
  defaultHighlights: string[];
  defaultCta: string;
  ctaOptions: string[];
}

export const MARKETING_TEMPLATES: readonly MarketingTemplate[] = [
  {
    id: 'offer-sale',
    name: 'Special Offer & Sale',
    badge: '🔥 SPECIAL OFFER',
    tagline: 'High-energy discount & seasonal promo',
    description: 'Perfect for retail stores, seasonal discounts, flash sales, and festival offers.',
    icon: 'tag',
    themeColor: '#E11D48',
    gradient: ['#9F1239', '#E11D48', '#FB7185'],
    defaultHeadline: 'Special Festive Discount Sale!',
    defaultBadge: 'FLAT 40% OFF',
    defaultHighlights: [
      'Huge savings on all items',
      'Limited period festive deal',
      'Free local delivery available',
    ],
    defaultCta: 'Call Now',
    ctaOptions: ['Call Now', 'Order Now', 'Visit Shop', 'WhatsApp Us'],
  },
  {
    id: 'service-showcase',
    name: 'Service Spotlight',
    badge: '⭐ SERVICE SPOTLIGHT',
    tagline: 'Professional service benefits & trust',
    description: 'Showcase home services, salon treatments, repairs, healthcare, and professional services.',
    icon: 'award',
    themeColor: '#2563EB',
    gradient: ['#1E3A8A', '#2563EB', '#60A5FA'],
    defaultHeadline: 'Professional Service You Can Trust',
    defaultBadge: 'VERIFIED EXPERTS',
    defaultHighlights: [
      'Experienced & certified staff',
      'Transparent upfront pricing',
      'Satisfaction guaranteed',
    ],
    defaultCta: 'Book Service',
    ctaOptions: ['Book Service', 'Call for Estimate', 'Book Appointment', 'Inquire Today'],
  },
  {
    id: 'brand-launch',
    name: 'Grand Opening & Launch',
    badge: '🎉 NOW OPEN',
    tagline: 'Storefront opening & brand introduction',
    description: 'Celebrate new shop openings, restaurants, branch expansions, and new service launches.',
    icon: 'zap',
    themeColor: '#7C3AED',
    gradient: ['#4C1D95', '#7C3AED', '#A78BFA'],
    defaultHeadline: 'Grand Opening — We Are Now Open!',
    defaultBadge: 'NEW IN TOWN',
    defaultHighlights: [
      'Exciting launch day surprises',
      'Visit us with family and friends',
      'Prime location & ample parking',
    ],
    defaultCta: 'Visit Us',
    ctaOptions: ['Visit Us', 'Get Directions', 'Check Menu', 'Explore Today'],
  },
  {
    id: 'customer-review',
    name: 'Customer Trust & Review',
    badge: '⭐ 5-STAR RATED',
    tagline: 'Testimonial quote & verified quality',
    description: 'Highlight customer satisfaction ratings, authentic feedback, and reliable work samples.',
    icon: 'star',
    themeColor: '#059669',
    gradient: ['#065F46', '#059669', '#34D399'],
    defaultHeadline: 'Loved by Hundreds of Local Customers',
    defaultBadge: '5-STAR SERVICE',
    defaultHighlights: [
      'Trusted quality & prompt service',
      '100% genuine parts & materials',
      'Recommended by top local clients',
    ],
    defaultCta: 'Contact Us',
    ctaOptions: ['Contact Us', 'Read Reviews', 'Call Now', 'Get Estimate'],
  },
];

export interface MusicMood {
  id: MusicMoodId;
  name: string;
  icon: string;
  description: string;
}

export const MUSIC_MOODS: readonly MusicMood[] = [
  { id: 'upbeat', name: 'Upbeat Energy', icon: 'zap', description: 'Energetic rhythm for retail and offers' },
  { id: 'festive', name: 'Festive Joy', icon: 'sun', description: 'Celebratory harmony for events & sales' },
  { id: 'corporate', name: 'Modern Pro', icon: 'briefcase', description: 'Clean polished sound for professionals' },
  { id: 'ambient', name: 'Smooth Ambient', icon: 'music', description: 'Gentle and elegant background vibe' },
];

export interface CreateVideoInput {
  template_id: MarketingTemplateId;
  title: string;
  headline: string;
  subtitle?: string;
  offer_badge?: string;
  highlights: string[];
  call_to_action: string;
  contact_info: string;
  music_mood?: MusicMoodId;
  images: string[]; // Base64 data URLs or standard image URLs
}

export interface CreatedVideoResult {
  upload_id: string;
  video_url: string;
  status: 'VALIDATED';
  size_bytes: number;
}

