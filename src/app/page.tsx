import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecentTrades, getTradeStats, getTopBoughtStocks, getKrwRate } from '@/lib/queries/dashboard-queries';
import { absoluteUrl } from '@/lib/site-url';
import {
  formatTradeType,
  tradeTypeBadgeClass,
  formatParty,
  partyBadgeClass,
  formatAmountUsd,
  formatDate,
} from '@/lib/format-trade';

// ISR: revalidate every 30 minutes
export const revalidate = 1800;

export const metadata: Metadata = {
  title: {
    absolute: '의회 주식 추적기 - 미국 의원 주식 거래 한국어 분석',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '의회 주식 추적기 - 미국 의원 주식 거래 한국어 분석',
    description:
      '미국 STOCK Act 공시 데이터를 한국어로 — 의원 주식 거래를 실시간 추적하세요. 의원 프로필, 종목별 거래 현황, 랭킹을 한국어로 확인하세요.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '의회 주식 추적기 - 미국 의원 주식 거래 한국어 분석',
    description:
      '미국 STOCK Act 공시 데이터를 한국어로 — 의원 주식 거래를 실시간 추적하세요.',
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

  // BreadcrumbList for homepage (home is the root — single item)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'STOCK Act이 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'STOCK Act(Stop Trading on Congressional Knowledge Act)는 미국 의원과 그 가족이 직무상 알게 된 비공개 정보를 이용한 주식 거래를 금지하고, 모든 주식 거래를 45일 이내에 공시하도록 의무화한 법입니다. 2012년 제정됐습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '의원 주식 거래 데이터는 어디서 수집하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '미국 하원 공식 웹사이트(disclosures.house.gov)에서 공개하는 PTR(정기 거래 보고서)를 자동 수집합니다. 의원들은 주식을 매수·매도한 날로부터 최대 45일 이내에 공시해야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '가장 활발하게 주식을 거래하는 의원은 누구인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전체 공시 데이터 기준 Josh Gottheimer(민주, NJ)가 2,000건 이상으로 가장 많은 거래를 공시했습니다. Lisa McClain(공화, MI), Gilbert Cisneros(민주, CA) 등이 그 뒤를 잇습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '낸시 펠로시는 어떤 주식을 거래하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '낸시 펠로시 전 하원의장은 주로 NVDA(엔비디아), AMZN(아마존), GOOGL(알파벳), AAPL(애플) 등 빅테크 종목을 거래합니다. 2026년 1월에는 AMZN·GOOGL을 각각 $50만~$100만 규모로 매수했습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '의원 주식 거래를 투자에 활용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '의원들의 공시 거래는 참고 자료로 활용할 수 있으나, 공시 지연(최대 45일)이 있어 실시간 투자 신호로 사용하기는 어렵습니다. 의원 거래가 직접적인 정책 정보를 반영한다고 단정할 수 없으며, 투자 판단은 본인의 책임하에 이루어져야 합니다.',
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
