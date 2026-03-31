import type { MetadataRoute } from 'next';
import { getAllPoliticianSlugs } from '@/lib/queries/politician-queries';
import { getAllTradedTickers } from '@/lib/queries/stock-queries';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://congress-trade-tracker.vercel.app';

export const revalidate = 86400; // regenerate daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${BASE_URL}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/top5`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  // Dynamic politician pages
  let politicianRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllPoliticianSlugs();
    politicianRoutes = slugs.map((s) => ({
      url: `${BASE_URL}/politicians/${s.slug}`,
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
      url: `${BASE_URL}/stocks/${t.stockTicker}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time
  }

  return [...staticRoutes, ...politicianRoutes, ...stockRoutes];
}
