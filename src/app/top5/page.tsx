import type { Metadata } from 'next';
import Link from 'next/link';
import { getTopBuyersByAmount } from '@/lib/queries/ranking-queries';
import { formatParty, partyBadgeClass, formatChamber, formatAmountUsd } from '@/lib/format-trade';
import SnsShareButtons from '@/components/sns-share-buttons';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
export const revalidate = 21600; // 6 hours

export const metadata: Metadata = {
  title: '이번 달 TOP 5 매수 의원',
  description: '이번 달 미국 의회에서 가장 많이 매수한 의원 TOP 5 — STOCK Act 공시 기반 한국어 분석',
  alternates: {
    canonical: '/top5',
  },
  openGraph: {
    title: '이번 달 TOP 5 매수 의원 | 의회 주식 추적기',
    description: '이번 달 미국 의회에서 가장 많이 매수한 의원 TOP 5',
    url: '/top5',
    images: [{ url: '/api/og/top5', width: 1200, height: 630 }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이번 달 TOP 5 매수 의원',
    description: '이번 달 미국 의회에서 가장 많이 매수한 의원 TOP 5',
    images: ['/api/og/top5'],
  },
};

export default async function Top5Page() {
  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  let top5: Awaited<ReturnType<typeof getTopBuyersByAmount>> = [];
  try {
    top5 = await getTopBuyersByAmount(5);
  } catch {
    // DB unavailable
  }

  const rankColors = [
    'text-yellow-500 dark:text-yellow-400',
    'text-zinc-400 dark:text-zinc-300',
    'text-amber-700 dark:text-amber-500',
    'text-zinc-500 dark:text-zinc-400',
    'text-zinc-500 dark:text-zinc-400',
  ];

  const rankBg = [
    'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-700/30',
    'bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700',
    'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/30',
    'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800',
    'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800',
  ];

  const shareText = `${monthLabel} 미국 의회 TOP 5 매수 의원 — 의회 주식 추적기`;
  const shareUrl = `${SITE_URL}/top5`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${monthLabel} TOP 5 매수 의원`,
    url: absoluteUrl('/top5'),
    numberOfItems: top5.length,
    itemListElement: top5.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.politicianNameKr ?? p.politicianNameEn,
      url: absoluteUrl(`/politicians/${p.politicianSlug}`),
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <section className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
              {monthLabel}
            </p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              TOP 5 매수 의원
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            🏆 이번 달 랭킹
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          STOCK Act 공시 기준 — 총 매수 추정액 상위 5인
        </p>
      </section>

      {/* TOP 5 list */}
      <section className="space-y-3">
        {top5.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            데이터를 불러오는 중입니다. 잠시 후 다시 시도하세요.
          </div>
        ) : (
          top5.map((politician, i) => {
            const name = politician.politicianNameKr ?? politician.politicianNameEn ?? '';
            const amount = Number(politician.totalAmountMin);
            return (
              <div
                key={politician.politicianSlug ?? i}
                className={`flex items-center gap-4 rounded-xl border px-5 py-4 ${rankBg[i] ?? rankBg[4]}`}
              >
                {/* Rank number */}
                <div className={`text-3xl font-black tabular-nums ${rankColors[i] ?? rankColors[4]}`}>
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/politicians/${politician.politicianSlug}`}
                    className="font-bold text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${partyBadgeClass(politician.politicianParty)}`}>
                      {formatParty(politician.politicianParty)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatChamber(politician.politicianChamber)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {Number(politician.tradeCount)}건
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {amount > 0 ? formatAmountUsd(amount) : '-'}
                  </p>
                  <p className="text-xs text-zinc-400">매수 추정액</p>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Share card section */}
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50 space-y-3">
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">이 카드 공유하기</p>
          <p className="text-xs text-zinc-400 mt-0.5">SNS에 공유하면 바이럴 카드 이미지가 자동으로 표시됩니다.</p>
        </div>
        <SnsShareButtons url={shareUrl} text={shareText} />
        {/* OG image preview link */}
        <Link
          href="/api/og/top5"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
        >
          카드 이미지 미리보기 →
        </Link>
      </section>

      {/* CTA to full rankings */}
      <section className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">더 많은 랭킹 보기</p>
          <p className="text-xs text-zinc-400">거래 빈도, 정당별 매수/매도 비율 포함</p>
        </div>
        <Link
          href="/rankings"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          전체 랭킹 →
        </Link>
      </section>
    </div>
  );
}
