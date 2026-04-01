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

  // Plus pattern: "50000+" (number followed by +)
  const plusMatch = cleaned.match(/^(\d+)\+$/);
  if (plusMatch) return { min: parseInt(plusMatch[1], 10), max: null };

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
  if (lower.includes('purchase') || lower === 'buy' || lower.includes('bought') || lower === 'p' || lower.startsWith('p ') || lower.includes('purchase_partial')) return 'buy';
  if (lower.includes('sale') || lower === 'sell' || lower.includes('sold') || lower === 's' || lower.startsWith('s ') || lower.includes('sale_partial')) return 'sell';
  if (lower !== 'exchange' && lower !== '') {
    console.warn(`[scraper-utils] Unknown trade type: "${raw}"`);
  }
  return 'exchange';
}

/**
 * Normalize date strings to YYYY-MM-DD format.
 * Handles MM/DD/YYYY input from House/Senate filings.
 */
export function normalizeDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  // MM/DD/YYYY → YYYY-MM-DD
  const mmddyyyy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, mm, dd, yyyy] = mmddyyyy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
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
