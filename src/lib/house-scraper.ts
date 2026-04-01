import axios from 'axios';
import * as xml2js from 'xml2js';
import { parseAmountRange, normalizeTradeType, normalizeDate, sleep } from './scraper-utils';
import { createLogger } from './structured-logger';
import { parseHouseFilingPdf } from './house-pdf-scraper';

const log = createLogger('house-scraper');

// House Financial Disclosures — migrated to disclosures-clerk.house.gov
// Old: disclosures.house.gov (now redirects to lobbying disclosure site)
const HOUSE_FD_BASE = 'https://disclosures-clerk.house.gov';
const HOUSE_FD_SEARCH = `${HOUSE_FD_BASE}/FinancialDisclosure/Search`;
const HOUSE_FD_FILING = `${HOUSE_FD_BASE}/FinancialDisclosure/ViewMemberBrowseAssets`;

export interface RawHouseTransaction {
  filingId: string;
  prefix: string; // Ms., Mr., Dr., etc.
  lastName: string;
  firstName: string;
  suffix: string;
  filingYear: string;
  filingType: string;
  stateDst: string; // "WA08" = Washington district 8
  url: string; // relative path to XML filing
}

/**
 * Fetch list of House Periodic Transaction Reports (PTRs) for a given year.
 * House FD publishes an annual XML index at a predictable URL.
 */
export async function fetchHouseFilingIndex(year: number): Promise<RawHouseTransaction[]> {
  // House publishes XML index files for each year (new path as of 2026)
  const indexUrl = `${HOUSE_FD_BASE}/public_disc/financial-pdfs/${year}FD.xml`;

  try {
    const response = await axios.get(indexUrl, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
      timeout: 30000,
    });

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(response.data);

    // Root element changed from NewDataSet to FinancialDisclosure after migration
    const members = parsed?.FinancialDisclosure?.Member ?? parsed?.NewDataSet?.Member;
    if (!members) return [];

    const items = Array.isArray(members) ? members : [members];

    // Filter to Periodic Transaction Reports only
    return items
      .filter((m: Record<string, string>) =>
        m.FilingType === 'P' || (m.FilingType ?? '').toLowerCase().includes('periodic')
      )
      .map((m: Record<string, string>) => ({
        filingId: String(m.DocID ?? m.FilingID ?? ''),
        prefix: String(m.Prefix ?? ''),
        lastName: String(m.Last ?? ''),
        firstName: String(m.First ?? ''),
        suffix: String(m.Suffix ?? ''),
        filingYear: String(m.Year ?? year),
        filingType: String(m.FilingType ?? ''),
        stateDst: String(m.StateDst ?? ''),
        url: String(m.DocID ?? ''),
      }));
  } catch (err) {
    log.error('House filing index fetch failed', err, { year });
    return [];
  }
}

export interface ParsedHouseTrade {
  filingId: string;
  firstName: string;
  lastName: string;
  stateDst: string;
  ticker: string;
  assetName: string;
  transactionType: string;
  transactionDate: string;
  notificationDate: string;
  amount: string;
  comment: string;
  filingUrl: string;
}

/**
 * Parse individual House PTR filing to extract transactions.
 * House migrated to PDF-only filings in 2025/2026; XMLs are no longer available.
 * Delegates to house-pdf-scraper which requires pdftotext (poppler-utils).
 */
export async function parseHouseFilingXml(filing: RawHouseTransaction): Promise<ParsedHouseTrade[]> {
  if (!filing.url) return [];
  await sleep(200); // Polite rate limit
  return parseHouseFilingPdf(filing.url, filing.filingYear, filing.firstName, filing.lastName, filing.stateDst);
}

/**
 * Normalize raw House transactions for database insertion.
 * Each transaction gets a unique filingId combining filing ID + ticker + dates + type
 * to prevent duplicate inserts when multiple trades share the same filing.
 */
export function normalizeHouseTransactions(raw: ParsedHouseTrade[]) {
  return raw
    .filter((t) => t.ticker && t.ticker !== 'N/A' && t.ticker.trim() !== '')
    .map((t) => {
      const { min, max } = parseAmountRange(t.amount);
      const ticker = t.ticker.toUpperCase().trim();
      const txDate = normalizeDate(t.transactionDate) ?? t.transactionDate;
      const discDate = normalizeDate(t.notificationDate) ?? t.notificationDate;
      // Per-transaction unique ID: filing + ticker + date + type eliminates same-filing dupes
      const uniqueFilingId = `house-${t.filingId}-${ticker}-${txDate}-${t.transactionType}`;
      return {
        stockTicker: ticker,
        stockName: t.assetName,
        tradeType: normalizeTradeType(t.transactionType),
        amountRange: t.amount,
        amountMin: min?.toString() ?? null,
        amountMax: max?.toString() ?? null,
        tradeDate: txDate || null,
        disclosureDate: discDate,
        filingUrl: t.filingUrl,
        filingId: uniqueFilingId,
        comment: t.comment || null,
        // Politician lookup keys
        _firstName: t.firstName,
        _lastName: t.lastName,
        _chamber: 'house' as const,
        _stateDst: t.stateDst,
      };
    });
}
