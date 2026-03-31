import { ImageResponse } from '@vercel/og';
import { getStockByTicker, getStockStats } from '@/lib/queries/stock-queries';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  let stockName = upper;
  let tradeCount = 0;
  let buyCount = 0;
  let sellCount = 0;

  try {
    const [stock, statsRows] = await Promise.all([
      getStockByTicker(upper),
      getStockStats(upper),
    ]);
    if (stock) stockName = stock.nameKr ?? stock.nameEn ?? upper;
    for (const row of statsRows) {
      const n = Number(row.tradeCount);
      tradeCount += n;
      if (row.tradeType === 'buy') buyCount = n;
      if (row.tradeType === 'sell') sellCount = n;
    }
  } catch {
    // fallback
  }

  const buyRatio = tradeCount > 0 ? Math.round((buyCount / tradeCount) * 100) : 0;

  return new ImageResponse(
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
        {/* Ticker badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
          <div
            style={{
              background: '#f59e0b',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '6px 18px',
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '0.05em',
            }}
          >
            {upper}
          </div>
        </div>

        {/* Stock name */}
        <div style={{ color: '#f8fafc', fontSize: '60px', fontWeight: 800, lineHeight: 1.1 }}>
          {stockName}
        </div>

        {/* Trade stats */}
        {tradeCount > 0 && (
          <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '18px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: '16px' }}>총 거래</div>
              <div style={{ color: '#f8fafc', fontSize: '36px', fontWeight: 700 }}>{tradeCount}건</div>
            </div>
            <div
              style={{
                background: 'rgba(34,197,94,0.1)',
                borderRadius: '12px',
                padding: '18px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ color: '#86efac', fontSize: '16px' }}>매수</div>
              <div style={{ color: '#22c55e', fontSize: '36px', fontWeight: 700 }}>{buyCount}건</div>
            </div>
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderRadius: '12px',
                padding: '18px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ color: '#fca5a5', fontSize: '16px' }}>매도</div>
              <div style={{ color: '#ef4444', fontSize: '36px', fontWeight: 700 }}>{sellCount}건</div>
            </div>
            {tradeCount > 0 && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '18px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '16px' }}>매수 비율</div>
                <div style={{ color: '#f8fafc', fontSize: '36px', fontWeight: 700 }}>{buyRatio}%</div>
              </div>
            )}
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

        {/* Decorative element */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: 'rgba(245,158,11,0.08)',
            borderRadius: '0 0 0 300px',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
