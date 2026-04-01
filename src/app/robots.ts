import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        // Disallow user-specific, private, and API routes (OG image endpoints are accessible
        // to social media crawlers via og:image tags but don't need search-bot indexing)
        disallow: ['/account', '/alerts', '/login', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: new URL(SITE_URL).host,
  };
}
