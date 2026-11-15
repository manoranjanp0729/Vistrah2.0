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
    badge: 'SPECIAL OFFER',
    tagline: 'Seasonal retail & festival pricing promo',
    description: 'Structured template for retail stores, seasonal discounts, and local delivery offers.',
    icon: 'tag',
    themeColor: '#E11D48',
    gradient: ['#9F1239', '#E11D48', '#FB7185'],
    defaultHeadline: 'Festive Retail Offer',
    defaultBadge: 'FLAT 25% OFF',
    defaultHighlights: [
      'Direct store & catalogue pricing',
      'Valid across listed stock items',
      'Local delivery & pickup available',
    ],
    defaultCta: 'Call Now',
    ctaOptions: ['Call Now', 'Order Now', 'Visit Shop', 'WhatsApp Us'],
  },
  {
    id: 'service-showcase',
    name: 'Service Spotlight',
    badge: 'SERVICE SPOTLIGHT',
    tagline: 'Verified service scope & upfront rates',
    description: 'Present home maintenance, compliance, clinics, and professional service packages.',
    icon: 'award',
    themeColor: '#2563EB',
    gradient: ['#1E3A8A', '#2563EB', '#60A5FA'],
    defaultHeadline: 'Verified Local Service Provider',
    defaultBadge: 'VERIFIED PROVIDER',
    defaultHighlights: [
      'Experienced & verified technicians',
      'Itemized upfront service pricing',
      'On-site inspection & support',
    ],
    defaultCta: 'Book Service',
    ctaOptions: ['Book Service', 'Call for Estimate', 'Book Appointment', 'Inquire Today'],
  },
  {
    id: 'brand-launch',
    name: 'Storefront & Branch Launch',
    badge: 'NOW OPEN',
    tagline: 'New branch & locality announcement',
    description: 'Announce new retail outlets, clinics, restaurants, and regional branch expansions.',
    icon: 'zap',
    themeColor: '#7C3AED',
    gradient: ['#4C1D95', '#7C3AED', '#A78BFA'],
    defaultHeadline: 'Now Serving Your Locality',
    defaultBadge: 'NEW BRANCH',
    defaultHighlights: [
      'Introductory store launch rates',
      'Walk-in consultations available',
      'Accessible main-road location',
    ],
    defaultCta: 'Visit Us',
    ctaOptions: ['Visit Us', 'Get Directions', 'Check Menu', 'Explore Today'],
  },
  {
    id: 'customer-review',
    name: 'Completed Work & Credentials',
    badge: '5-STAR RATED',
    tagline: 'Project walkthrough & client feedback',
    description: 'Document completed installations, verified credentials, and local client outcomes.',
    icon: 'star',
    themeColor: '#059669',
    gradient: ['#065F46', '#059669', '#34D399'],
    defaultHeadline: 'Trusted by Local Households & Businesses',
    defaultBadge: 'VERIFIED WORK',
    defaultHighlights: [
      'Documented project handover',
      'Standardized materials & warranty',
      'Reviewed by local customers',
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

