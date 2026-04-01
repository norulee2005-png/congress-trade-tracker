import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import SnsShareButtons from '@/components/sns-share-buttons';
import {
  getStockByTicker,
  getAllTradedTickers,
  getStockTrades,
  getStockTradeTrend,
  getStockStats,
} from '@/lib/queries/stock-queries';
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
// = true ensures runtime rendering still works for all tickers.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const tickers = await getAllTradedTickers();
    return tickers.map((t) => ({ ticker: t.stockTicker }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  const stock = await getStockByTicker(upper);
  const name = stock?.nameKr ?? stock?.nameEn ?? upper;
  const description = `${name}(${upper}) 종목의 미국 의회 의원 거래 현황 및 트렌드 — STOCK Act 공시 한국어`;
  const ogImageUrl = `/api/og/stock/${upper}`;
  return {
    title: `${upper} - ${name} 의원 거래`,
    description,
    alternates: {
      canonical: `/stocks/${upper}`,
    },
    openGraph: {
      title: `${upper} ${name} — 의원 거래 현황`,
      description,
      url: `/stocks/${upper}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${upper} ${name} — 의원 거래`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  const [stock, tradesData, trend, statsData] = await Promise.all([
    getStockByTicker(upper),
    getStockTrades(upper, 100),
    getStockTradeTrend(upper),
    getStockStats(upper),
  ]);

  // Stock may not be in our stocks table (only in trades) — that's OK
  if (tradesData.length === 0 && !stock) notFound();

  const buyStats = statsData.find((s) => s.tradeType === 'buy');
  const sellStats = statsData.find((s) => s.tradeType === 'sell');
  const totalBuys = Number(buyStats?.tradeCount ?? 0);
  const totalSells = Number(sellStats?.tradeCount ?? 0);
  const uniqueBuyers = Number(buyStats?.uniquePoliticians ?? 0);
  const uniqueSellers = Number(sellStats?.uniquePoliticians ?? 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: stock?.nameEn ?? upper,
    alternateName: stock?.nameKr ?? undefined,
    tickerSymbol: upper,
    url: absoluteUrl(`/stocks/${upper}`),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: upper, item: absoluteUrl(`/stocks/${upper}`) },
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
        <span>종목</span>
      </nav>

      {/* Stock header */}
      <section>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-lg font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {upper.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              <span className="font-mono">{upper}</span>
              {stock?.nameKr && <span className="ml-3 text-lg font-normal text-zinc-500">{stock.nameKr}</span>}
            </h1>
            {stock?.nameEn && (
              <p className="text-sm text-zinc-500">{stock.nameEn}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-2">
              {stock?.sector && (
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {stock.sector}
                </span>
              )}
              {stock?.industry && (
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                  {stock.industry}
                </span>
              )}
            </div>
            <div className="mt-3">
              <SnsShareButtons
                url={absoluteUrl(`/stocks/${upper}`)}
                text={`${upper} ${stock?.nameKr ?? stock?.nameEn ?? ''} 의원 거래 현황 — 의회 주식 추적기`}
              />
            </div>
          </div>
          {stock?.currentPrice && (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-right dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-400">현재가</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                ${Number(stock.currentPrice).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SEO intro — keyword-rich context for crawlers */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {stock?.nameKr ?? stock?.nameEn ?? upper}({upper}) 종목에 대한 미국 의회 의원들의
        STOCK Act 공시 주식 거래 현황입니다. 매수·매도 의원 목록과 월별 트렌드를 한국어로 확인하세요.
      </p>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="총 매수" value={totalBuys} colorClass="text-green-600 dark:text-green-400" />
        <StatCard label="총 매도" value={totalSells} colorClass="text-red-600 dark:text-red-400" />
        <StatCard label="매수 의원 수" value={uniqueBuyers} colorClass="text-blue-600 dark:text-blue-400" />
        <StatCard label="매도 의원 수" value={uniqueSellers} colorClass="text-orange-600 dark:text-orange-400" />
      </section>

      {/* Monthly trend */}
      {trend.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">월별 거래 트렌드</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 min-w-max">
                {trend.map((row) => {
                  const buys = Number(row.buyCount);
                  const sells = Number(row.sellCount);
                  const max = Math.max(...trend.map((r) => Number(r.buyCount) + Number(r.sellCount)), 1);
                  const height = Math.round(((buys + sells) / max) * 80);
                  return (
                    <div key={row.month} className="flex flex-col items-center gap-1">
                      <div className="flex flex-col-reverse items-stretch" style={{ height: 88 }}>
                        <div
                          className="w-8 rounded-t bg-red-300 dark:bg-red-700"
                          style={{ height: `${Math.round((sells / max) * 80)}px` }}
                        />
                        <div
                          className="w-8 bg-green-400 dark:bg-green-600"
                          style={{ height: `${Math.round((buys / max) * 80)}px` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 rotate-45 origin-left" style={{ fontSize: 9 }}>
                        {row.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400 dark:bg-green-600" />매수</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300 dark:bg-red-700" />매도</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trade history */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">의원 거래 내역</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {tradesData.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">거래 내역이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">의원</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">정당</th>
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
                        {trade.politicianSlug ? (
                          <Link href={`/politicians/${trade.politicianSlug}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                            {trade.politicianNameKr ?? trade.politicianNameEn}
                          </Link>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {trade.politicianNameKr ?? trade.politicianNameEn}
                          </span>
                        )}
                        <p className="text-xs text-zinc-400">{formatChamber(trade.politicianChamber)}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${partyBadgeClass(trade.politicianParty)}`}>
                          {formatParty(trade.politicianParty)}
                        </span>
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
