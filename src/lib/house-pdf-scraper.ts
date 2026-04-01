import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import { createLogger } from './structured-logger';
import type { ParsedHouseTrade } from './house-scraper';

const log = createLogger('house-pdf-scraper');

const HOUSE_FD_BASE = 'https://disclosures-clerk.house.gov';

// Matches a transaction line: contains a type letter then two MM/DD/YYYY dates
// Type may be followed by " (partial)" — handle that too
const TX_LINE_RE = /\b(P|S|E|X)\b(?:\s*\(partial\))?\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/;

// Extracts ticker from "(TICKER) [ST]" — stocks only
const TICKER_RE = /\(([A-Z][A-Z0-9.]{0,9})\)\s*\[ST\]/;

// Extracts the amount range from a string, handling both "$X - $Y" and "$X $Y" with line breaks
const AMOUNT_RE = /(\$[\d,]+(?:\s*-\s*|\s*–\s*)?\$[\d,]+|\$[\d,]+\s*-\s*$|\$[\d,]+)/;

function extractAmount(txLine: string, nextLine: string): string {
  // Try to match complete range on same line first
  const sameLineRange = txLine.match(/(\$[\d,]+\s*[-–]\s*\$[\d,]+)/);
  if (sameLineRange) return sameLineRange[1].trim();

  // Amount starts on this line, dollar continues on next
  const startMatch = txLine.match(/(\$[\d,]+)\s*[-–]?\s*$/);
  if (startMatch) {
    // The continuation dollar value may appear anywhere in the next line (tabular layout)
    const allDollars = nextLine?.match(/\$[\d,]+/g);
    const endVal = allDollars?.[allDollars.length - 1];
    if (endVal) return `${startMatch[1]} - ${endVal}`.trim();
    return startMatch[1];
  }

  // Amount entirely on current line (just one value, e.g. partial)
  const single = txLine.match(/(\$[\d,]+)/);
  return single ? single[1] : '';
}

/**
 * Parse a House PTR PDF using pdftotext -layout (poppler-utils required).
 * Returns an empty array when pdftotext is unavailable (Vercel) — GitHub Actions provides it.
 */
export async function parseHouseFilingPdf(
  docId: string,
  year: string | number,
  firstName: string,
  lastName: string,
  stateDst: string,
): Promise<ParsedHouseTrade[]> {
  const pdfUrl = `${HOUSE_FD_BASE}/public_disc/ptr-pdfs/${year}/${docId}.pdf`;
  const tmpFile = path.join(os.tmpdir(), `house-${docId}-${Date.now()}.pdf`);

  try {
    const response = await axios.get(pdfUrl, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (educational project)' },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    fs.writeFileSync(tmpFile, Buffer.from(response.data as ArrayBuffer));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    log.warn('House PDF download failed', { docId, year });
    return [];
  }

  let text: string;
  try {
    text = execSync(`pdftotext -layout "${tmpFile}" -`, { encoding: 'utf8', timeout: 15000 });
  } catch {
    // pdftotext not installed (Vercel env) — silently skip
    return [];
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }

  return parsePdfLayoutText(text, docId, firstName, lastName, stateDst, pdfUrl);
}

function parsePdfLayoutText(
  text: string,
  docId: string,
  firstName: string,
  lastName: string,
  stateDst: string,
  pdfUrl: string,
): ParsedHouseTrade[] {
  const lines = text.split('\n');
  const trades: ParsedHouseTrade[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const txMatch = line.match(TX_LINE_RE);
    if (!txMatch) continue;

    const [, txType, tradeDate, notifDate] = txMatch;

    // Asset text is everything before the transaction type on this line
    const typeIdx = line.indexOf(txMatch[0]);
    const assetOnThisLine = line.slice(0, typeIdx).replace(/^\s+/, '').replace(/\s+$/, '');

    // Combine with next line(s) to get full asset + ticker
    const nextLine = lines[i + 1] ?? '';
    const nextNextLine = lines[i + 2] ?? '';
    const assetContinuation = nextLine.trim();

    // Full asset text across lines
    const fullAsset = assetOnThisLine
      ? `${assetOnThisLine} ${assetContinuation}`.trim()
      : assetContinuation;

    // Check several lines ahead for ticker (in case of multi-line asset names)
    const lookAhead = [nextLine, nextNextLine].join(' ');
    const tickerMatch = fullAsset.match(TICKER_RE) ?? lookAhead.match(TICKER_RE);
    const ticker = tickerMatch ? tickerMatch[1] : '';

    // Only stock trades have tickers — skip non-stock assets unless we want them
    if (!ticker) continue;

    // Strip ticker/type suffix from asset name for clean display
    const assetName = fullAsset
      .replace(/\s*\([A-Z][A-Z0-9.]{0,9}\)\s*\[ST\].*/, '')
      .replace(/\[ST\].*/, '')
      .replace(/\s*\(partial\).*/, '')
      .trim();

    // Amount: check current line and next line for continuation
    const amountLine = line.slice(typeIdx + txMatch[0].length);
    const amount = extractAmount(amountLine, lookAhead);

    // Normalize transaction type
    const normalizedType = txType === 'P' ? 'Purchase' : txType === 'S' ? 'Sale' : txType;

    trades.push({
      filingId: docId,
      firstName,
      lastName,
      stateDst,
      ticker: ticker.toUpperCase(),
      assetName,
      transactionType: normalizedType,
      transactionDate: convertDate(tradeDate),
      notificationDate: convertDate(notifDate),
      amount,
      comment: '',
      filingUrl: pdfUrl,
    });
  }

  return trades;
}

/** Convert MM/DD/YYYY → YYYY-MM-DD */
function convertDate(mmddyyyy: string): string {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
}
