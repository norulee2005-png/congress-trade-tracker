import axios from 'axios';
import * as xml2js from 'xml2js';
import { parseAmountRange, normalizeTradeType, sleep } from './scraper-utils';
import { createLogger } from './structured-logger';

const log = createLogger('senate-scraper');

// Senate eFDS (Electronic Financial Disclosure System) base URL
const SENATE_EFDS_BASE = 'https://efts.senate.gov/LATEST/search-index';
const SENATE_FILING_BASE = 'https://efds.senate.gov/index.cfm/fa/home.form/reportType/PT';

export interface RawSenateTransaction {
  filingId: string;
  firstName: string;
  lastName: string;
  ticker: string;
  assetName: string;
  transactionType: string;
  transactionDate: string;
  notificationDate: string; // disclosure date
  amount: string;
  comment: string;
  filingUrl: string;
}

/**
 * Fetch Senate periodic transaction reports from the eFTS search API.
 * The Senate provides an Elasticsearch-backed JSON search endpoint.
 */
export async function fetchSenateTransactions(
  fromDate: string, // YYYY-MM-DD
  toDate: string,   // YYYY-MM-DD
  pageSize = 100
): Promise<RawSenateTransaction[]> {
  const results: RawSenateTransaction[] = [];
  let from = 0;

  while (true) {
    const url = `${SENATE_EFDS_BASE}?q=%22periodic+transaction%22&dateRange=custom&fromDate=${fromDate}&toDate=${toDate}&results_count=${pageSize}&start=${from}`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
        timeout: 30000,
      });

      const hits: Array<Record<string, unknown>> = response.data?.hits?.hits ?? [];
      if (hits.length === 0) break;

      for (const hit of hits) {
        const src = hit._source as Record<string, unknown>;
        results.push({
          filingId: String(hit._id ?? ''),
          firstName: String(src.first_name ?? ''),
          lastName: String(src.last_name ?? ''),
          ticker: String(src.ticker ?? ''),
          assetName: String(src.asset_description ?? ''),
          transactionType: String(src.type ?? ''),
          transactionDate: String(src.transaction_date ?? ''),
          notificationDate: String(src.notification_date ?? ''),
          amount: String(src.amount ?? ''),
          comment: String(src.comment ?? ''),
          filingUrl: `https://efds.senate.gov/index.cfm/fa/home.form/reportId/${hit._id}`,
        });
      }

      if (hits.length < pageSize) break;
      from += pageSize;
      await sleep(500); // Polite rate limiting
    } catch (err) {
      log.error('Senate eFTS fetch failed', err, { offset: from, fromDate, toDate });
      break;
    }
  }

  return results;
}

/**
 * Parse a Senate PTR XML filing directly from its URL.
 * Used as fallback when the search API lacks detail.
 */
export async function parseSenateXmlFiling(
  filingUrl: string
): Promise<RawSenateTransaction[]> {
  try {
    const response = await axios.get(filingUrl, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
      timeout: 30000,
    });

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(response.data);

    const transactions = parsed?.PublicDisclosure?.Transactions?.Transaction;
    if (!transactions) return [];

    const items = Array.isArray(transactions) ? transactions : [transactions];

    return items.map((t: Record<string, string>) => ({
      filingId: String(t.FilingID ?? ''),
      firstName: String(t.FirstName ?? ''),
      lastName: String(t.LastName ?? ''),
      ticker: String(t.Ticker ?? ''),
      assetName: String(t.AssetName ?? ''),
      transactionType: String(t.Type ?? ''),
      transactionDate: String(t.TransactionDate ?? ''),
      notificationDate: String(t.NotificationDate ?? ''),
      amount: String(t.Amount ?? ''),
      comment: String(t.Comment ?? ''),
      filingUrl,
    }));
  } catch (err) {
    log.error('Senate XML parse failed', err, { filingUrl });
    return [];
  }
}

/**
 * Normalize raw senate transactions for database insertion.
 */
export function normalizeSenateTransactions(raw: RawSenateTransaction[]) {
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
        filingId: `senate-${t.filingId}`,
        comment: t.comment || null,
        // Politician lookup key
        _firstName: t.firstName,
        _lastName: t.lastName,
        _chamber: 'senate' as const,
      };
    });
}
