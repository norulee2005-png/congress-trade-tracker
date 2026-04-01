import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Disallow user-specific and API routes
        disallow: ['/account', '/alerts', '/login', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: new URL(SITE_URL).host,
  };
}
