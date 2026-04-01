import { ImageResponse } from '@vercel/og';
import { getPoliticianBySlug, getPoliticianStats } from '@/lib/queries/politician-queries';
import { getPoliticianAvgReturn } from '@/lib/queries/return-queries';
import { formatParty, formatChamber } from '@/lib/format-trade';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let name = slug;
  let party = '';
  let chamber = '';
  let tradeCount = 0;
  let avgReturnPct: number | null = null;

  try {
    const politician = await getPoliticianBySlug(slug);
    if (politician) {
      name = politician.nameKr ?? politician.nameEn;
      party = formatParty(politician.party);
      chamber = formatChamber(politician.chamber);
      const [statsRows, returnData] = await Promise.all([
        getPoliticianStats(politician.id),
        getPoliticianAvgReturn(politician.id, 365),
      ]);
      tradeCount = statsRows.reduce((sum, r) => sum + Number(r.tradeCount), 0);
      avgReturnPct = returnData.avgReturnPct;
    }
  } catch {
    // fallback to slug
  }

  const partyColor = party === '민주당' ? '#3b82f6' : party === '공화당' ? '#ef4444' : '#71717a';

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
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Top badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div
            style={{
              background: partyColor,
              color: '#fff',
              borderRadius: '6px',
              padding: '4px 14px',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            {party || '의원'}
          </div>
          {chamber && (
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '4px 14px',
                fontSize: '18px',
              }}
            >
              {chamber}
            </div>
          )}
        </div>

        {/* Main name */}
        <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 800, lineHeight: 1.1 }}>
          {name}
        </div>

        {/* Trade count */}
        {tradeCount > 0 && (
          <div style={{ color: '#94a3b8', fontSize: '28px', marginTop: '20px' }}>
            총 {tradeCount}건의 공시 거래
          </div>
        )}

        {/* Estimated return */}
        {avgReturnPct !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <div
              style={{
                color: avgReturnPct >= 0 ? '#22c55e' : '#ef4444',
                fontSize: '36px',
                fontWeight: 800,
              }}
            >
              {avgReturnPct >= 0 ? '+' : ''}{avgReturnPct.toFixed(2)}%
            </div>
            <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600 }}>
              추정 수익률
            </div>
          </div>
        )}

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            right: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
          }}
        >
          <div style={{ color: '#f59e0b', fontSize: '22px', fontWeight: 700 }}>
            의회 주식 추적기
          </div>
          <div style={{ color: '#64748b', fontSize: '15px' }}>
            미국 의원 주식 거래 한국어 분석
          </div>
        </div>

        {/* Decorative corner */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: `${partyColor}18`,
            borderRadius: '0 0 0 300px',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
  imgResponse.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return imgResponse;
}
