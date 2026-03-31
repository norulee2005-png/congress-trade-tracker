import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { searchTrades, getAllSectors } from '@/lib/queries/search-queries';
import SearchFilterForm from '@/components/search-filter-form';
import {
  formatTradeType,
  tradeTypeBadgeClass,
  formatParty,
  partyBadgeClass,
  formatChamber,
  formatAmountUsd,
  formatDate,
} from '@/lib/format-trade';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '검색',
  description: '의원 이름, 종목, 정당, 거래 유형으로 미국 의회 주식 거래를 검색하세요',
};

const PAGE_SIZE = 50;

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  const str = (key: string) => {
    const v = sp[key];
    return typeof v === 'string' ? v : undefined;
  };

  const filters = {
    q: str('q'),
    party: str('party'),
    chamber: str('chamber'),
    tradeType: str('tradeType'),
    sector: str('sector'),
    dateFrom: str('dateFrom'),
    dateTo: str('dateTo'),
    amountMin: str('amountMin') ? Number(str('amountMin')) : undefined,
    amountMax: str('amountMax') ? Number(str('amountMax')) : undefined,
    limit: PAGE_SIZE,
    offset: str('offset') ? Number(str('offset')) : 0,
  };

  const [results, sectors] = await Promise.all([
    searchTrades(filters),
    getAllSectors(),
  ]);

  const hasFilters = Object.entries(filters).some(
    ([k, v]) => !['limit', 'offset'].includes(k) && v != null && v !== ''
  );

  const currentOffset = filters.offset;
  const prevOffset = Math.max(0, currentOffset - PAGE_SIZE);
  const nextOffset = currentOffset + PAGE_SIZE;

  const buildPageUrl = (offset: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.party) params.set('party', filters.party);
    if (filters.chamber) params.set('chamber', filters.chamber);
    if (filters.tradeType) params.set('tradeType', filters.tradeType);
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.amountMin != null) params.set('amountMin', String(filters.amountMin));
    if (filters.amountMax != null) params.set('amountMax', String(filters.amountMax));
    params.set('offset', String(offset));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">검색 &amp; 필터</h1>
        <p className="mt-1 text-sm text-zinc-500">의원, 종목, 정당, 기간으로 거래를 검색하세요</p>
      </section>

      {/* Filter form (client component) */}
      <Suspense>
        <SearchFilterForm sectors={sectors} />
      </Suspense>

      {/* Results */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {hasFilters ? `검색 결과` : '전체 거래 내역'}
            <span className="ml-2 text-sm font-normal text-zinc-400">
              {results.length < PAGE_SIZE
                ? `${currentOffset + results.length}건`
                : `${currentOffset + 1}–${currentOffset + results.length}건`}
            </span>
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {results.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-zinc-400">
              {hasFilters ? '조건에 맞는 거래가 없습니다. 필터를 조정해 보세요.' : '거래 데이터가 없습니다.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">의원</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">종목</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">유형</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">금액</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">섹터</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">거래일</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">공시일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {results.map((trade) => (
                    <tr key={trade.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-2.5">
                        {trade.politicianSlug ? (
                          <Link href={`/politicians/${trade.politicianSlug}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                            {trade.politicianNameKr ?? trade.politicianNameEn}
                          </Link>
                        ) : (
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {trade.politicianNameKr ?? trade.politicianNameEn ?? '-'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-flex rounded px-1 py-0.5 text-xs ${partyBadgeClass(trade.politicianParty)}`}>
                            {formatParty(trade.politicianParty)}
                          </span>
                          <span className="text-xs text-zinc-400">{formatChamber(trade.politicianChamber)}</span>
                        </div>
                      </td>
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
                        {trade.amountRange ?? formatAmountUsd(undefined)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">{trade.stockSector ?? '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(trade.tradeDate)}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-400">{formatDate(trade.disclosureDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {(currentOffset > 0 || results.length === PAGE_SIZE) && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {currentOffset > 0 && (
              <Link
                href={buildPageUrl(prevOffset)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ← 이전
              </Link>
            )}
            {results.length === PAGE_SIZE && (
              <Link
                href={buildPageUrl(nextOffset)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                다음 →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
