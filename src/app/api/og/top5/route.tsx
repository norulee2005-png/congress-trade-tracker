import { ImageResponse } from '@vercel/og';
import { getTopBuyersByAmount } from '@/lib/queries/ranking-queries';
import { getTopReturnPoliticians } from '@/lib/queries/return-queries';
import { formatParty } from '@/lib/format-trade';

export const runtime = 'edge';

// Revalidate every 6 hours (matches trade sync cron)
export const revalidate = 21600;

function partyColor(party: string | null | undefined): string {
  if (party === 'Democrat') return '#3b82f6';
  if (party === 'Republican') return '#ef4444';
  return '#71717a';
}

function formatAmountShort(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

// Return % map keyed by nameEn for OG overlay
type ReturnMap = Map<string, number>;

export async function GET() {
  let top5: Array<{
    politicianNameKr: string | null;
    politicianNameEn: string;
    politicianParty: string | null;
    totalAmountMin: string;
    tradeCount: number;
  }> = [];
  const returnMap: ReturnMap = new Map();

  try {
    const [rows, returnRows] = await Promise.all([
      getTopBuyersByAmount(5),
      getTopReturnPoliticians(365, 20),
    ]);
    top5 = rows.map((r) => ({
      politicianNameKr: r.politicianNameKr,
      politicianNameEn: r.politicianNameEn ?? '',
      politicianParty: r.politicianParty,
      totalAmountMin: r.totalAmountMin,
      tradeCount: Number(r.tradeCount),
    }));
    for (const r of returnRows) {
      if (r.politicianNameEn) returnMap.set(r.politicianNameEn, r.avgReturnPct);
    }
  } catch {
    // fallback — render placeholder card
  }

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const imgResponse = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          fontFamily: 'sans-serif',
          padding: '50px 60px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '6px' }}>
              의회 주식 추적기
            </div>
            <div style={{ color: '#f8fafc', fontSize: '38px', fontWeight: 800 }}>
              이번 달 TOP 5 매수 의원
            </div>
          </div>
          <div
            style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px',
              padding: '8px 18px',
              color: '#f59e0b',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            {monthLabel}
          </div>
        </div>

        {/* TOP 5 list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {top5.length === 0
            ? (
              <div style={{ color: '#475569', fontSize: '24px', marginTop: '40px' }}>
                데이터를 불러오는 중입니다...
              </div>
            )
            : top5.map((p, i) => {
              const name = p.politicianNameKr ?? p.politicianNameEn;
              const amount = Number(p.totalAmountMin);
              const pColor = partyColor(p.politicianParty);
              const retPct = returnMap.get(p.politicianNameEn) ?? null;
              const retColor = retPct === null ? '#64748b' : retPct >= 0 ? '#22c55e' : '#ef4444';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                    padding: '12px 18px',
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                      color: i <= 2 ? '#0f172a' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  {/* Party dot */}
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: pColor,
                      flexShrink: 0,
                    }}
                  />
                  {/* Name */}
                  <div style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 700, flex: 1 }}>
                    {name}
                  </div>
                  {/* Party label */}
                  <div style={{ color: pColor, fontSize: '15px', fontWeight: 600, minWidth: '50px', textAlign: 'right' }}>
                    {formatParty(p.politicianParty)}
                  </div>
                  {/* Estimated return */}
                  <div style={{ color: retColor, fontSize: '18px', fontWeight: 700, minWidth: '80px', textAlign: 'right' }}>
                    {retPct !== null ? `${retPct >= 0 ? '+' : ''}${retPct.toFixed(1)}%` : '-'}
                  </div>
                  {/* Amount */}
                  <div
                    style={{
                      color: '#22c55e',
                      fontSize: '22px',
                      fontWeight: 700,
                      minWidth: '90px',
                      textAlign: 'right',
                    }}
                  >
                    {amount > 0 ? formatAmountShort(amount) : '-'}
                  </div>
                  {/* Trade count */}
                  <div style={{ color: '#64748b', fontSize: '14px', minWidth: '55px', textAlign: 'right' }}>
                    {p.tradeCount}건
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ color: '#475569', fontSize: '13px' }}>
            STOCK Act 공시 데이터 기반 · 투자 조언 아님
          </div>
          <div style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 700 }}>
            의회 주식 추적기
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  imgResponse.headers.set('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  return imgResponse;
}
