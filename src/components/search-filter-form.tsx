'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface SearchFilterFormProps {
  sectors: string[];
}

export default function SearchFilterForm({ sectors }: SearchFilterFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (key: string) => searchParams.get(key) ?? '';

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset offset on filter change
      params.delete('offset');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const inputClass =
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

  const selectClass =
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

  return (
    <div
      role="search"
      aria-label="거래 검색 필터"
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Free-text search */}
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="sf-q" className="mb-1 block text-xs font-medium text-zinc-500">검색 (의원 이름 / 종목 티커)</label>
          <input
            id="sf-q"
            type="text"
            className={inputClass}
            placeholder="예: 펠로시, NVDA, Nancy Pelosi..."
            defaultValue={get('q')}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>

        {/* Party */}
        <div>
          <label htmlFor="sf-party" className="mb-1 block text-xs font-medium text-zinc-500">정당</label>
          <select id="sf-party" className={selectClass} value={get('party')} onChange={(e) => update('party', e.target.value)}>
            <option value="">전체</option>
            <option value="Democrat">민주당</option>
            <option value="Republican">공화당</option>
            <option value="Independent">무소속</option>
          </select>
        </div>

        {/* Chamber */}
        <div>
          <label htmlFor="sf-chamber" className="mb-1 block text-xs font-medium text-zinc-500">원</label>
          <select id="sf-chamber" className={selectClass} value={get('chamber')} onChange={(e) => update('chamber', e.target.value)}>
            <option value="">전체</option>
            <option value="senate">상원</option>
            <option value="house">하원</option>
          </select>
        </div>

        {/* Trade type */}
        <div>
          <label htmlFor="sf-trade-type" className="mb-1 block text-xs font-medium text-zinc-500">거래 유형</label>
          <select id="sf-trade-type" className={selectClass} value={get('tradeType')} onChange={(e) => update('tradeType', e.target.value)}>
            <option value="">전체</option>
            <option value="buy">매수</option>
            <option value="sell">매도</option>
            <option value="exchange">교환</option>
          </select>
        </div>

        {/* Sector */}
        <div>
          <label htmlFor="sf-sector" className="mb-1 block text-xs font-medium text-zinc-500">섹터</label>
          <select id="sf-sector" className={selectClass} value={get('sector')} onChange={(e) => update('sector', e.target.value)}>
            <option value="">전체</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label htmlFor="sf-date-from" className="mb-1 block text-xs font-medium text-zinc-500">시작일</label>
          <input id="sf-date-from" type="date" className={inputClass} value={get('dateFrom')} onChange={(e) => update('dateFrom', e.target.value)} />
        </div>
        <div>
          <label htmlFor="sf-date-to" className="mb-1 block text-xs font-medium text-zinc-500">종료일</label>
          <input id="sf-date-to" type="date" className={inputClass} value={get('dateTo')} onChange={(e) => update('dateTo', e.target.value)} />
        </div>

        {/* Amount range */}
        <div>
          <label htmlFor="sf-amount-min" className="mb-1 block text-xs font-medium text-zinc-500">최소 금액 (USD)</label>
          <input
            id="sf-amount-min"
            type="number"
            className={inputClass}
            placeholder="예: 15000"
            defaultValue={get('amountMin')}
            onBlur={(e) => update('amountMin', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sf-amount-max" className="mb-1 block text-xs font-medium text-zinc-500">최대 금액 (USD)</label>
          <input
            id="sf-amount-max"
            type="number"
            className={inputClass}
            placeholder="예: 250000"
            defaultValue={get('amountMax')}
            onBlur={(e) => update('amountMax', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
