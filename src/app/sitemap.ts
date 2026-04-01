import type { MetadataRoute } from 'next';
import { getAllPoliticianSlugs } from '@/lib/queries/politician-queries';
import { getAllTradedTickers } from '@/lib/queries/stock-queries';
import { getAllBlogSlugs } from '@/lib/blog-posts';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const revalidate = 86400; // regenerate daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: absoluteUrl('/rankings'), lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/search'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/top5'), lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/methodology'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/blog'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Static blog post pages
  const blogSlugs = getAllBlogSlugs();
  const blogRoutes: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Dynamic politician pages
  let politicianRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllPoliticianSlugs();
    politicianRoutes = slugs.map((s) => ({
      url: absoluteUrl(`/politicians/${s.slug}`),
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — static fallback is empty
  }

  // Dynamic stock pages
  let stockRoutes: MetadataRoute.Sitemap = [];
  try {
    const tickers = await getAllTradedTickers();
    stockRoutes = tickers.map((t) => ({
      url: absoluteUrl(`/stocks/${t.stockTicker}`),
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time
  }

  return [...staticRoutes, ...blogRoutes, ...politicianRoutes, ...stockRoutes];
}
