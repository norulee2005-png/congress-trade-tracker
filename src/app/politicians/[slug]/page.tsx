import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import SnsShareButtons from '@/components/sns-share-buttons';
import {
  getPoliticianBySlug,
  getAllPoliticianSlugs,
  getPoliticianTrades,
  getPoliticianStats,
  getPoliticianTopStocks,
} from '@/lib/queries/politician-queries';
import {
  formatTradeType,
  tradeTypeBadgeClass,
  formatParty,
  partyBadgeClass,
  formatChamber,
  formatAmountUsd,
  formatDate,
} from '@/lib/format-trade';
import { absoluteUrl } from '@/lib/site-url';

// Fall back to empty list at build time when DB is unavailable; dynamicParams
// = true ensures runtime rendering still works for all slugs.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPoliticianSlugs();
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const politician = await getPoliticianBySlug(slug);
  if (!politician) return {};
  const name = politician.nameKr ?? politician.nameEn;
  const description = `${name} 의원의 전체 주식 거래 내역, 포트폴리오 분석 — STOCK Act 공시 데이터 한국어 서비스`;
  const ogImageUrl = `/api/og/politician/${slug}`;
  return {
    title: `${name} 의원 주식 거래`,
    description,
    alternates: {
      canonical: `/politicians/${slug}`,
    },
    openGraph: {
      title: `${name} 의원 주식 거래`,
      description,
      url: `/politicians/${slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      locale: 'ko_KR',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} 의원 주식 거래`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PoliticianProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const politician = await getPoliticianBySlug(slug);
  if (!politician) notFound();

  const [tradesData, statsData, topStocksData] = await Promise.all([
    getPoliticianTrades(politician.id, 100),
    getPoliticianStats(politician.id),
    getPoliticianTopStocks(politician.id, 5),
  ]);

  const buyStats = statsData.find((s) => s.tradeType === 'buy');
  const sellStats = statsData.find((s) => s.tradeType === 'sell');
  const totalBuys = Number(buyStats?.tradeCount ?? 0);
  const totalSells = Number(sellStats?.tradeCount ?? 0);
  const netPositionMin = Number(buyStats?.totalAmountMin ?? 0) - Number(sellStats?.totalAmountMin ?? 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: politician.nameEn,
    alternateName: politician.nameKr ?? undefined,
    jobTitle: politician.chamber === 'senate' ? 'United States Senator' : 'United States Representative',
    memberOf: { '@type': 'Organization', name: politician.party ?? undefined },
    url: absoluteUrl(`/politicians/${politician.slug}`),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '의원 프로필', item: absoluteUrl(`/politicians/${politician.slug}`) },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:underline">대시보드</Link>
        <span className="mx-2">/</span>
        <span>의원 프로필</span>
      </nav>

      {/* Profile header */}
      <section className="flex items-start gap-6 flex-wrap">
        {politician.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={politician.photoUrl}
            alt={`${politician.nameKr ?? politician.nameEn} 미국 의회 의원 프로필 사진`}
            className="h-24 w-24 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {politician.nameKr ?? politician.nameEn}
          </h1>
          {politician.nameKr && (
            <p className="text-sm text-zinc-500">{politician.nameEn}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${partyBadgeClass(politician.party)}`}>
              {formatParty(politician.party)}
            </span>

            <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {formatChamber(politician.chamber)}
            </span>
            {politician.state && (
              <span className="text-sm text-zinc-500">{politician.state}</span>
            )}
            {politician.committee && (
              <span className="text-xs text-zinc-400 max-w-xs truncate" title={politician.committee}>
                {politician.committee}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SnsShareButtons
              url={absoluteUrl(`/politicians/${slug}`)}
              text={`${politician.nameKr ?? politician.nameEn} 의원 주식 거래 현황 — 의회 주식 추적기`}
            />
            <Link
              href={`/alerts?type=politician&id=${politician.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
            >
              <BellIcon />
              알림 설정
            </Link>
          </div>
        </div>
      </section>

      {/* SEO intro — keyword-rich context for crawlers */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {politician.nameKr ?? politician.nameEn} 의원의 미국 STOCK Act 공시 주식 거래 내역입니다.
        매수·매도 이력, 거래 종목, 금액 범위를 한국어로 확인하세요.
      </p>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="총 매수" value={totalBuys} colorClass="text-green-600 dark:text-green-400" />
        <StatCard label="총 매도" value={totalSells} colorClass="text-red-600 dark:text-red-400" />
        <StatCard label="총 거래" value={totalBuys + totalSells} colorClass="text-zinc-700 dark:text-zinc-300" />
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">순 매수 추정액</p>
          <p className={`mt-1 text-lg font-bold ${netPositionMin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatAmountUsd(netPositionMin)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Trade history table */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">전체 거래 내역</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {tradesData.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">거래 내역이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">종목</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">유형</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">금액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">거래일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">공시일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {tradesData.map((trade) => (
                      <tr key={trade.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-2.5">
                          <Link href={`/stocks/${trade.stockTicker}`} className="font-mono font-semibold text-blue-600 hover:underline dark:text-blue-400">
                            {trade.stockTicker}
                          </Link>
                          <p className="text-xs text-zinc-400 max-w-[120px] truncate">{trade.stockName}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${tradeTypeBadgeClass(trade.tradeType)}`}>
                            {formatTradeType(trade.tradeType)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {trade.amountRange ?? formatAmountUsd(trade.amountMin)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(trade.tradeDate)}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-400">{formatDate(trade.disclosureDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Top stocks sidebar */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">주요 거래 종목</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {topStocksData.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">없음</p>
            ) : (
              <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {topStocksData.map((stock, i) => (
                  <li key={stock.stockTicker} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-zinc-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/stocks/${stock.stockTicker}`} className="font-mono font-semibold text-sm text-blue-600 hover:underline dark:text-blue-400">
                        {stock.stockTicker}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate">{stock.stockName}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <span className="text-green-600 dark:text-green-400">매수 {stock.buyCount}</span>
                      <span className="mx-1 text-zinc-300">/</span>
                      <span className="text-red-600 dark:text-red-400">매도 {stock.sellCount}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
