import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getMostActiveTraders,
  getMostTradedStocks,
  getPartyBuySellRatio,
  getTopBuyersByAmount,
} from '@/lib/queries/ranking-queries';
import {
  formatParty,
  partyBadgeClass,
  formatChamber,
  formatAmountUsd,
} from '@/lib/format-trade';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: '랭킹',
  description: '가장 활발한 의원, 가장 많이 거래된 종목, 정당별 매수/매도 비율',
  alternates: {
    canonical: '/rankings',
  },
  openGraph: {
    title: '의원 주식 거래 랭킹 | 의회 주식 추적기',
    description: '가장 활발한 의원, 가장 많이 거래된 종목, 정당별 매수/매도 비율',
    url: '/rankings',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '의원 주식 거래 랭킹 | 의회 주식 추적기',
    description: '가장 활발한 의원, 가장 많이 거래된 종목, 정당별 매수/매도 비율',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // revalidate hourly

export default async function RankingsPage() {
  const [activeTraders, topStocks, partyRatio, topBuyers] = await Promise.all([
    getMostActiveTraders(30, 10),
    getMostTradedStocks(20),
    getPartyBuySellRatio(),
    getTopBuyersByAmount(10),
  ]);

  // JSON-LD: BreadcrumbList for this page
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '랭킹', item: absoluteUrl('/rankings') },
    ],
  };

  // JSON-LD: ItemList for top active traders
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '거래 빈도 TOP 10 미국 의원 (최근 30일)',
    description: '최근 30일간 가장 활발하게 주식을 거래한 미국 의회 의원 순위',
    url: absoluteUrl('/rankings'),
    itemListElement: activeTraders.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.politicianNameKr ?? p.politicianNameEn ?? '',
      url: p.politicianSlug ? absoluteUrl(`/politicians/${p.politicianSlug}`) : absoluteUrl('/rankings'),
    })),
  };

  // Compute party buy/sell totals for the ratio display
  const partyMap: Record<string, { buys: number; sells: number }> = {};
  for (const row of partyRatio) {
    const party = row.party ?? '기타';
    if (!partyMap[party]) partyMap[party] = { buys: 0, sells: 0 };
    if (row.tradeType === 'buy') partyMap[party].buys = Number(row.tradeCount);
    if (row.tradeType === 'sell') partyMap[party].sells = Number(row.tradeCount);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">미국 의원 주식 거래 랭킹</h1>
        <p className="mt-1 text-sm text-zinc-500">최근 30일 기준 — 거래 빈도, 매수 금액, 가장 많이 거래된 종목</p>
      </section>

      {/* Party buy/sell ratio */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">정당별 매수/매도 비율</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Object.entries(partyMap).map(([party, { buys, sells }]) => {
            const total = buys + sells;
            const buyPct = total > 0 ? Math.round((buys / total) * 100) : 50;
            return (
              <div key={party} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${partyBadgeClass(party)}`}>
                    {formatParty(party)}
                  </span>
                  <span className="text-xs text-zinc-400">{total}건</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900">
                  <div className="h-full rounded-full bg-green-500 dark:bg-green-600" style={{ width: `${buyPct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">매수 {buys}</span>
                  <span className="text-red-600 dark:text-red-400">매도 {sells}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Most active traders */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">거래 빈도 TOP 10 의원 (30일)</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {activeTraders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</p>
            ) : (
              <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {activeTraders.map((p, i) => (
                  <li key={p.politicianSlug ?? i} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className={`w-6 shrink-0 text-center text-sm font-bold ${i < 3 ? 'text-yellow-500' : 'text-zinc-400'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      {p.politicianSlug ? (
                        <Link href={`/politicians/${p.politicianSlug}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400 truncate block">
                          {p.politicianNameKr ?? p.politicianNameEn}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{p.politicianNameKr ?? p.politicianNameEn}</span>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${partyBadgeClass(p.politicianParty)}`}>
                          {formatParty(p.politicianParty)}
                        </span>
                        <span className="text-xs text-zinc-400">{formatChamber(p.politicianChamber)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {p.tradeCount}건
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Top buyers by amount */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">총 매수 금액 TOP 10 의원</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {topBuyers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</p>
            ) : (
              <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {topBuyers.map((p, i) => (
                  <li key={p.politicianSlug ?? i} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className={`w-6 shrink-0 text-center text-sm font-bold ${i < 3 ? 'text-yellow-500' : 'text-zinc-400'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      {p.politicianSlug ? (
                        <Link href={`/politicians/${p.politicianSlug}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400 truncate block">
                          {p.politicianNameKr ?? p.politicianNameEn}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{p.politicianNameKr ?? p.politicianNameEn}</span>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${partyBadgeClass(p.politicianParty)}`}>
                          {formatParty(p.politicianParty)}
                        </span>
                        <span className="text-xs text-zinc-400">{formatChamber(p.politicianChamber)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatAmountUsd(p.totalAmountMin)}
                      </p>
                      <p className="text-xs text-zinc-400">{p.tradeCount}건</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {/* Most traded stocks */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">가장 많이 거래된 종목 TOP 20</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {topStocks.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">종목</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">총 거래</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">매수</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">매도</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {topStocks.map((stock, i) => {
                    const buys = Number(stock.buyCount);
                    const sells = Number(stock.sellCount);
                    const total = Number(stock.tradeCount);
                    const buyPct = total > 0 ? Math.round((buys / total) * 100) : 50;
                    return (
                      <tr key={stock.stockTicker} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-2.5 text-sm text-zinc-400">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/stocks/${stock.stockTicker}`} className="font-mono font-semibold text-blue-600 hover:underline dark:text-blue-400">
                            {stock.stockTicker}
                          </Link>
                          <p className="text-xs text-zinc-400 truncate max-w-[160px]">{stock.stockName}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">{total}</td>
                        <td className="px-4 py-2.5 text-right text-sm text-green-600 dark:text-green-400">{buys}</td>
                        <td className="px-4 py-2.5 text-right text-sm text-red-600 dark:text-red-400">{sells}</td>
                        <td className="px-4 py-2.5">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-red-200 dark:bg-red-900">
                            <div className="h-full rounded-full bg-green-500 dark:bg-green-600" style={{ width: `${buyPct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
