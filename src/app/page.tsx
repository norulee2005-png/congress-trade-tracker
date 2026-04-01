import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecentTrades, getTradeStats, getTopBoughtStocks, getKrwRate } from '@/lib/queries/dashboard-queries';
import {
  formatTradeType,
  tradeTypeBadgeClass,
  formatParty,
  partyBadgeClass,
  formatAmountUsd,
  formatDate,
} from '@/lib/format-trade';

// Always render at runtime so DB data is live; revalidate every 30 minutes
export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function DashboardPage() {
  const [recentTrades, stats7d, stats30d, topStocks, krwRate] = await Promise.all([
    getRecentTrades(7, 30),
    getTradeStats(7),
    getTradeStats(30),
    getTopBoughtStocks(10),
    getKrwRate(),
  ]);

  const statsSummary = (stats: Awaited<ReturnType<typeof getTradeStats>>) => {
    let buys = 0, sells = 0;
    for (const row of stats) {
      if (row.tradeType === 'buy') buys = Number(row.tradeCount);
      if (row.tradeType === 'sell') sells = Number(row.tradeCount);
    }
    return { buys, sells, total: buys + sells };
  };

  const s7 = statsSummary(stats7d);
  const s30 = statsSummary(stats30d);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      {/* Header */}
      <section>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">대시보드</h1>
            <p className="mt-1 text-sm text-zinc-500">미국 의원들의 최신 주식 거래를 한국어로 확인하세요</p>
          </div>
          {krwRate && (
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-zinc-500">USD/KRW</span>
              <span className="ml-2 font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                ₩{krwRate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Stats cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="7일 매수" value={s7.buys} accent="green" />
        <StatCard label="7일 매도" value={s7.sells} accent="red" />
        <StatCard label="30일 매수" value={s30.buys} accent="green" />
        <StatCard label="30일 매도" value={s30.sells} accent="red" />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent trades */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">최근 7일 거래 내역</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {recentTrades.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">거래 내역이 없습니다</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className={`mt-0.5 inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${tradeTypeBadgeClass(trade.tradeType)}`}>
                      {formatTradeType(trade.tradeType)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/stocks/${trade.stockTicker}`} className="font-mono font-semibold text-sm text-blue-600 hover:underline dark:text-blue-400">
                          {trade.stockTicker}
                        </Link>
                        <span className="text-xs text-zinc-500 truncate">{trade.stockName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        {trade.politicianSlug ? (
                          <Link href={`/politicians/${trade.politicianSlug}`} className="text-xs text-zinc-700 hover:underline dark:text-zinc-300">
                            {trade.politicianNameKr ?? trade.politicianNameEn}
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-500">{trade.politicianNameKr ?? trade.politicianNameEn}</span>
                        )}
                        <span className={`inline-flex rounded px-1 py-0.5 text-xs ${partyBadgeClass(trade.politicianParty)}`}>
                          {formatParty(trade.politicianParty)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{trade.amountRange ?? formatAmountUsd(trade.amountMin)}</p>
                      <p className="text-xs text-zinc-400">{formatDate(trade.disclosureDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/search" className="block text-center text-sm text-blue-600 hover:underline dark:text-blue-400">
            전체 거래 내역 보기 →
          </Link>
        </section>

        {/* Top bought stocks */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            지금 의원들이 가장 많이 사는 종목 (30일)
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {topStocks.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</p>
            ) : (
              <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {topStocks.map((stock, i) => (
                  <li key={stock.stockTicker} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-zinc-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/stocks/${stock.stockTicker}`} className="font-mono font-semibold text-sm text-blue-600 hover:underline dark:text-blue-400">
                        {stock.stockTicker}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate">{stock.stockName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      {stock.buyCount}건
                    </span>
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

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'green' | 'red' }) {
  const colorClass = accent === 'green'
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}
