import { eq, and, gte, isNotNull } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { alerts, trades, politicians, users } from '@/db/schema';
import { getResend } from './resend-client';

const LARGE_TRADE_THRESHOLD = 100_000;
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'no-reply@congresstrade.kr';

interface TradeWithPolitician {
  id: string;
  politicianId: string;
  stockTicker: string;
  stockName: string | null;
  tradeType: string;
  amountMin: string | null;
  disclosureDate: string;
  politicianSlug: string;
  politicianName: string;
}

// Fetch trades disclosed since the given date
async function fetchRecentTrades(since: Date): Promise<TradeWithPolitician[]> {
  const sinceDate = since.toISOString().split('T')[0]; // YYYY-MM-DD
  const rows = await db
    .select({
      id: trades.id,
      politicianId: trades.politicianId,
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeType: trades.tradeType,
      amountMin: trades.amountMin,
      disclosureDate: trades.disclosureDate,
      politicianSlug: politicians.slug,
      politicianName: politicians.nameEn,
    })
    .from(trades)
    .innerJoin(politicians, eq(trades.politicianId, politicians.id))
    .where(gte(trades.disclosureDate, sinceDate));
  return rows;
}

function isLargeTrade(trade: TradeWithPolitician): boolean {
  return parseFloat(trade.amountMin ?? '0') >= LARGE_TRADE_THRESHOLD;
}

function buildEmailHtml(trade: TradeWithPolitician, baseUrl: string): string {
  const type = trade.tradeType === 'buy' ? '매수' : trade.tradeType === 'sell' ? '매도' : '교환';
  const amount = trade.amountMin ? `$${Number(trade.amountMin).toLocaleString()}+` : '미공개';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">의회 주식 알림</h2>
      <p><strong>${trade.politicianName}</strong>이(가) 새 거래를 공시했습니다.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px;color:#6b7280">종목</td><td style="padding:6px;font-weight:600">${trade.stockTicker}${trade.stockName ? ` · ${trade.stockName}` : ''}</td></tr>
        <tr><td style="padding:6px;color:#6b7280">유형</td><td style="padding:6px">${type}</td></tr>
        <tr><td style="padding:6px;color:#6b7280">금액</td><td style="padding:6px">${amount}</td></tr>
        <tr><td style="padding:6px;color:#6b7280">공시일</td><td style="padding:6px">${trade.disclosureDate}</td></tr>
      </table>
      <a href="${baseUrl}/politicians/${trade.politicianSlug}"
        style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
        의원 프로필 보기
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:12px;color:#9ca3af">의회 주식 추적기 · 알림 설정 변경: ${baseUrl}/alerts</p>
    </div>`;
}

async function sendDiscordWebhook(webhookUrl: string, trade: TradeWithPolitician, baseUrl: string) {
  const type = trade.tradeType === 'buy' ? '📈 매수' : trade.tradeType === 'sell' ? '📉 매도' : '🔄 교환';
  const amount = trade.amountMin ? `$${Number(trade.amountMin).toLocaleString()}+` : '미공개';
  const body = JSON.stringify({
    content: null,
    embeds: [{
      title: `🏛 ${trade.politicianName} — ${trade.stockTicker} ${type}`,
      url: `${baseUrl}/politicians/${trade.politicianSlug}`,
      color: trade.tradeType === 'buy' ? 0x16a34a : 0xdc2626,
      fields: [
        { name: '종목', value: `${trade.stockTicker}${trade.stockName ? ` (${trade.stockName})` : ''}`, inline: true },
        { name: '금액', value: amount, inline: true },
        { name: '공시일', value: trade.disclosureDate, inline: true },
      ],
    }],
  });
  await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

// Main entry: find matching alerts for recent trades and send notifications
export async function processAlerts(since: Date): Promise<{ sent: number; errors: number }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const resend = getResend();

  const recentTrades = await fetchRecentTrades(since);
  if (recentTrades.length === 0) return { sent: 0, errors: 0 };

  const activeAlerts = await db
    .select({ id: alerts.id, userId: alerts.userId, alertType: alerts.alertType, targetId: alerts.targetId, channel: alerts.channel, channelConfig: alerts.channelConfig, email: users.email })
    .from(alerts)
    .innerJoin(users, eq(alerts.userId, users.id))
    .where(eq(alerts.isActive, true));

  let sent = 0;
  let errors = 0;

  for (const trade of recentTrades) {
    for (const alert of activeAlerts) {
      const matches =
        (alert.alertType === 'politician' && alert.targetId === trade.politicianSlug) ||
        (alert.alertType === 'stock' && alert.targetId === trade.stockTicker.toUpperCase()) ||
        (alert.alertType === 'large_trade' && isLargeTrade(trade));

      if (!matches) continue;

      try {
        if (alert.channel === 'email') {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: alert.email,
            subject: `[의회 주식 알림] ${trade.politicianName} — ${trade.stockTicker} ${trade.tradeType === 'buy' ? '매수' : '매도'}`,
            html: buildEmailHtml(trade, baseUrl),
          });
        } else if (alert.channel === 'discord' && alert.channelConfig) {
          const config = JSON.parse(alert.channelConfig) as { webhookUrl: string };
          await sendDiscordWebhook(config.webhookUrl, trade, baseUrl);
        }
        sent++;
      } catch (err) {
        console.error(`[AlertProcessor] failed to send alert ${alert.id} for trade ${trade.id}:`, err);
        errors++;
      }
    }
  }

  return { sent, errors };
}
