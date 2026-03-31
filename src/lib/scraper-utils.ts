// Utility helpers shared across scrapers

/**
 * Parse STOCK Act amount range strings into numeric bounds.
 * e.g. "$1,001 - $15,000" → { min: 1001, max: 15000 }
 */
export function parseAmountRange(raw: string): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };

  // Strip dollar signs, commas, whitespace
  const cleaned = raw.replace(/[$,\s]/g, '');

  // Range pattern: "1001-15000"
  const rangeMatch = cleaned.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  // Over pattern: "Over$1,000,000" or "1000000+"
  const overMatch = raw.match(/over\s*\$?([\d,]+)/i);
  if (overMatch) {
    const val = parseInt(overMatch[1].replace(/,/g, ''), 10);
    return { min: val, max: null };
  }

  // Single value fallback
  const singleMatch = cleaned.match(/^(\d+)$/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

/**
 * Normalize trade type strings from disclosure filings to canonical values.
 */
export function normalizeTradeType(raw: string): 'buy' | 'sell' | 'exchange' {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('purchase') || lower === 'buy' || lower.includes('bought')) return 'buy';
  if (lower.includes('sale') || lower === 'sell' || lower.includes('sold')) return 'sell';
  return 'exchange';
}

/**
 * Generate a URL-safe slug from a politician's full name.
 * e.g. "Nancy Pelosi" → "nancy-pelosi"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Sleep for ms milliseconds (used for rate limiting scrapers).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
