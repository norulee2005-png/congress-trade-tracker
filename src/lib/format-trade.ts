// Shared formatting utilities for trade display across pages

export function formatTradeType(type: string): string {
  const map: Record<string, string> = {
    buy: '매수',
    sell: '매도',
    exchange: '교환',
  };
  return map[type.toLowerCase()] ?? type;
}

export function tradeTypeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'buy') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (t === 'sell') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
}

export function partyBadgeClass(party: string | null | undefined): string {
  if (party === 'Republican') return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  if (party === 'Democrat') return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
}

export function formatParty(party: string | null | undefined): string {
  if (party === 'Republican') return '공화당';
  if (party === 'Democrat') return '민주당';
  if (party === 'Independent') return '무소속';
  return party ?? '미상';
}

export function formatChamber(chamber: string | null | undefined): string {
  if (chamber === 'senate') return '상원';
  if (chamber === 'house') return '하원';
  return chamber ?? '';
}

export function formatAmountKrw(usd: string | number | null | undefined, krwRate: number | null): string {
  const val = usd == null ? null : Number(usd);
  if (!val || !krwRate) return '-';
  const krw = val * krwRate;
  if (krw >= 1_000_000_000) return `₩${(krw / 1_000_000_000).toFixed(1)}B`;
  if (krw >= 1_000_000) return `₩${(krw / 1_000_000).toFixed(0)}M`;
  return `₩${krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

export function formatAmountUsd(usd: string | number | null | undefined): string {
  const val = usd == null ? null : Number(usd);
  if (!val) return '-';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // dateStr may be a date-only string "YYYY-MM-DD" or full ISO
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
}
