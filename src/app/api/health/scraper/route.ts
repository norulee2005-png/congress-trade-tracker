import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Scraper health check — tests whether upstream data sources are reachable.
 * GET /api/health/scraper
 */
export async function GET() {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const results: Record<string, { status: number | string; detail: string }> = {};

  // Test Senate eFTS
  try {
    const url = `https://efts.senate.gov/LATEST/search-index?q=%22periodic+transaction%22&dateRange=custom&fromDate=${fmt(fromDate)}&toDate=${fmt(new Date())}&results_count=1&start=0`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (health check)' },
      timeout: 10000,
    });
    const total = res.data?.hits?.total?.value ?? 'unknown';
    results.senate_efts = { status: res.status, detail: `hits.total.value=${total}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.senate_efts = { status: 'error', detail: msg };
  }

  // Test House FD index
  try {
    const year = new Date().getFullYear();
    const url = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.xml`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'congress-trade-tracker/1.0 (health check)' },
      timeout: 10000,
      responseType: 'text',
    });
    const byteLen = (res.data as string).length;
    results.house_fd_index = { status: res.status, detail: `${byteLen} bytes` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.house_fd_index = { status: 'error', detail: msg };
  }

  const allOk = Object.values(results).every((r) => typeof r.status === 'number' && r.status < 400);
  return NextResponse.json({ ok: allOk, checkedAt: new Date().toISOString(), results });
}
