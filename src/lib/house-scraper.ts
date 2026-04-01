import axios from 'axios';
import * as xml2js from 'xml2js';
import { parseAmountRange, normalizeTradeType, sleep } from './scraper-utils';
import { createLogger } from './structured-logger';

const log = createLogger('house-scraper');

// House Financial Disclosures search API
const HOUSE_FD_BASE = 'https://disclosures.house.gov';
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
  // House publishes XML index files for each year
  const indexUrl = `${HOUSE_FD_BASE}/assets/financialdisclosure/docs/${year}FD.xml`;

  try {
    const response = await axios.get(indexUrl, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
      timeout: 30000,
    });

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(response.data);

    const members = parsed?.NewDataSet?.Member;
    if (!members) return [];

    const items = Array.isArray(members) ? members : [members];

    // Filter to Periodic Transaction Reports only
    return items
      .filter((m: Record<string, string>) =>
        m.FilingType === 'P' || (m.FilingType ?? '').toLowerCase().includes('periodic')
      )
      .map((m: Record<string, string>) => ({
        filingId: String(m.FilingID ?? ''),
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
 * Parse individual House PTR XML filing to extract transactions.
 */
export async function parseHouseFilingXml(filing: RawHouseTransaction): Promise<ParsedHouseTrade[]> {
  if (!filing.url) return [];

  const fileUrl = `${HOUSE_FD_BASE}/ptr-pdfs/${filing.filingYear}/${filing.url}.xml`;

  try {
    await sleep(300); // Polite rate limit between XML fetches
    const response = await axios.get(fileUrl, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
      timeout: 30000,
    });

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(response.data);

    const transactions =
      parsed?.HouseStockWatcher?.Transactions?.Transaction ??
      parsed?.PeriodicTransactionReport?.Transactions?.Transaction;

    if (!transactions) return [];

    const items = Array.isArray(transactions) ? transactions : [transactions];

    return items.map((t: Record<string, string>) => ({
      filingId: filing.filingId,
      firstName: filing.firstName,
      lastName: filing.lastName,
      stateDst: filing.stateDst,
      ticker: String(t.Ticker ?? t.ticker ?? ''),
      assetName: String(t.AssetName ?? t.asset_description ?? ''),
      transactionType: String(t.Type ?? t.transaction_type ?? ''),
      transactionDate: String(t.TransactionDate ?? t.transaction_date ?? ''),
      notificationDate: String(t.NotificationDate ?? t.notification_date ?? filing.filingYear + '-01-01'),
      amount: String(t.Amount ?? t.amount ?? ''),
      comment: String(t.Comment ?? ''),
      filingUrl: fileUrl,
    }));
  } catch (err) {
    // Many filings are PDF-only (not XML) — expected 404s are fine
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return [];
    }
    log.warn('House filing XML parse failed (non-404)', { filingId: filing.filingId, year: filing.filingYear });
    return [];
  }
}

/**
 * Normalize raw House transactions for database insertion.
 */
export function normalizeHouseTransactions(raw: ParsedHouseTrade[]) {
  return raw
    .filter((t) => t.ticker && t.ticker !== 'N/A' && t.ticker.trim() !== '')
    .map((t) => {
      const { min, max } = parseAmountRange(t.amount);
      return {
        stockTicker: t.ticker.toUpperCase().trim(),
        stockName: t.assetName,
        tradeType: normalizeTradeType(t.transactionType),
        amountRange: t.amount,
        amountMin: min?.toString() ?? null,
        amountMax: max?.toString() ?? null,
        tradeDate: t.transactionDate || null,
        disclosureDate: t.notificationDate,
        filingUrl: t.filingUrl,
        filingId: `house-${t.filingId}`,
        comment: t.comment || null,
        // Politician lookup keys
        _firstName: t.firstName,
        _lastName: t.lastName,
        _chamber: 'house' as const,
        _stateDst: t.stateDst,
      };
    });
}
