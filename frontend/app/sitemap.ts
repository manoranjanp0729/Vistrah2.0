import type { MetadataRoute } from 'next';

const PUBLIC_PATHS = [
  '',
  '/services',
  '/v-ads',
  '/v-essentials',
  '/pricing',
  '/membership',
  '/jobs',
  '/for-users',
  '/for-businesses',
  '/ads-and-marketing',
  '/agri-connect',
  '/health-connect',
  '/about-us',
  '/contact-us',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/shipping-policy',
  '/grievance-officer',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-11-16T00:00:00Z');
  return PUBLIC_PATHS.map((path) => ({
    url: `https://vistrah.in${path}`,
    lastModified,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));
}
