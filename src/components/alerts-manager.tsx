'use client';

import { useState } from 'react';
import type { Alert } from '@/db/schema';
import Link from 'next/link';

const ALERT_TYPE_LABELS: Record<string, string> = {
  politician: '의원',
  stock: '종목',
  large_trade: '대형 거래 ($100K+)',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: '이메일',
  discord: 'Discord',
};

// Popular politicians and stocks for quick-add buttons
const QUICK_POLITICIANS = [
  { slug: 'nancy-pelosi', label: '낸시 펠로시' },
  { slug: 'dan-crenshaw', label: '댄 크렌쇼' },
  { slug: 'michael-mccaul', label: '마이클 맥컬' },
  { slug: 'tommy-tuberville', label: '토미 투버빌' },
];

const QUICK_STOCKS = [
  { ticker: 'NVDA', label: 'NVDA' },
  { ticker: 'TSLA', label: 'TSLA' },
  { ticker: 'AAPL', label: 'AAPL' },
  { ticker: 'MSFT', label: 'MSFT' },
];

export default function AlertsManager({
  initialAlerts,
  isPro,
}: {
  initialAlerts: Alert[];
  isPro: boolean;
}) {
  const [alertList, setAlertList] = useState<Alert[]>(initialAlerts);
  const [alertType, setAlertType] = useState<'politician' | 'stock' | 'large_trade'>('politician');
  const [targetId, setTargetId] = useState('');
  const [channel, setChannel] = useState<'email' | 'discord'>('email');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addAlert(type: typeof alertType, id: string) {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { alertType: type, channel: 'email' };
      if (type !== 'large_trade') body.targetId = id;

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '알림 추가에 실패했습니다.');
      } else {
        // Dedup by composite key before adding
        setAlertList((prev) => {
          const key = `${data.alertType}|${data.targetId}|${data.channel}`;
          const exists = prev.some((a) => `${a.alertType}|${a.targetId}|${a.channel}` === key);
          return exists ? prev : [...prev, data];
        });
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body: Record<string, unknown> = { alertType, channel };
    if (alertType !== 'large_trade') body.targetId = targetId.trim();
    if (channel === 'discord') body.channelConfig = { webhookUrl };

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '알림 추가에 실패했습니다.');
      } else {
        setAlertList((prev) => {
          const key = `${data.alertType}|${data.targetId}|${data.channel}`;
          const exists = prev.some((a) => `${a.alertType}|${a.targetId}|${a.channel}` === key);
          return exists ? prev : [...prev, data];
        });
        setTargetId('');
        setWebhookUrl('');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    if (res.ok) setAlertList((prev) => prev.filter((a) => a.id !== id));
  }

  // Composite key dedup: alertType|targetId|channel
  const activeKeys = new Set(alertList.map((a) => `${a.alertType}|${a.targetId}|${a.channel}`));

  return (
    <div className="space-y-8">
      {/* Quick-add popular politicians */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">인기 의원 빠른 알림 등록</h2>
        <p className="mb-3 text-xs text-zinc-500">자주 거래하는 의원을 한 번에 추가하세요.</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_POLITICIANS.map(({ slug, label }) => {
            const active = activeKeys.has(`politician|${slug}|email`);
            return (
              <button
                key={slug}
                onClick={() => !active && addAlert('politician', slug)}
                disabled={saving || active}
                aria-label={`${label} 의원 알림 추가`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-400 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-500 cursor-default'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500'
                }`}
              >
                {active ? `${label} ✓` : `+ ${label}`}
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick-add popular stocks */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">인기 종목 빠른 알림 등록</h2>
        <p className="mb-3 text-xs text-zinc-500">의원들이 자주 거래하는 종목을 추가하세요.</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_STOCKS.map(({ ticker, label }) => {
            const active = activeKeys.has(`stock|${ticker}|email`);
            return (
              <button
                key={ticker}
                onClick={() => !active && addAlert('stock', ticker)}
                disabled={saving || active}
                aria-label={`${label} 종목 알림 추가`}
                className={`rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors ${
                  active
                    ? 'border-green-200 bg-green-50 text-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-500 cursor-default'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-green-400 hover:text-green-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-green-500'
                }`}
              >
                {active ? `${label} ✓` : `+ ${label}`}
              </button>
            );
          })}
        </div>
      </section>

      {/* Existing alerts */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          현재 알림 ({alertList.length})
        </h2>
        {alertList.length === 0 ? (
          <p className="text-sm text-zinc-500">설정된 알림이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {alertList.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-sm">
                  <span className="font-medium">{ALERT_TYPE_LABELS[alert.alertType]}</span>
                  {alert.targetId && <span className="ml-2 text-zinc-500">· {alert.targetId}</span>}
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {CHANNEL_LABELS[alert.channel]}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  aria-label={`알림 삭제: ${ALERT_TYPE_LABELS[alert.alertType]}${alert.targetId ? ` ${alert.targetId}` : ''}`}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add new alert */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">알림 추가</h2>
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="am-alert-type" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">알림 유형</label>
              <select
                id="am-alert-type"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as typeof alertType)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="politician">의원</option>
                <option value="stock">종목</option>
                <option value="large_trade" disabled={!isPro}>
                  대형 거래 ($100K+) {!isPro ? '— Pro' : ''}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="am-channel" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">채널</label>
              <select
                id="am-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as typeof channel)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="email">이메일</option>
                <option value="discord" disabled={!isPro}>Discord {!isPro ? '— Pro' : ''}</option>
              </select>
            </div>
          </div>

          {alertType !== 'large_trade' && (
            <div>
              <label htmlFor="am-target-id" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {alertType === 'politician' ? '의원 슬러그 (예: nancy-pelosi)' : '종목 티커 (예: NVDA)'}
              </label>
              <input
                id="am-target-id"
                type="text"
                required
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}

          {channel === 'discord' && (
            <div>
              <label htmlFor="am-webhook-url" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Discord 웹훅 URL</label>
              <input
                id="am-webhook-url"
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '추가 중...' : '알림 추가'}
          </button>

          {!isPro && (
            <p className="text-xs text-zinc-500">
              Discord 알림 및 대형 거래 알림은 <Link href="/account" className="text-blue-600 underline">Pro 구독</Link>이 필요합니다.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
