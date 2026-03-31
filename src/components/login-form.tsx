'use client';

import { useState, use } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: '로그인 링크가 없습니다. 다시 시도해주세요.',
  invalid_token: '로그인 링크가 만료되었거나 유효하지 않습니다.',
  user_not_found: '사용자를 찾을 수 없습니다.',
  server_error: '서버 오류가 발생했습니다. 다시 시도해주세요.',
};

export default function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = use(searchParams);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? '오류가 발생했습니다.');
        setStatus('error');
      } else {
        setStatus('sent');
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <p className="font-medium text-green-800 dark:text-green-200">이메일을 확인하세요 ✉️</p>
        <p className="mt-2 text-sm text-green-700 dark:text-green-300">
          <strong>{email}</strong>으로 로그인 링크를 보냈습니다. 15분 이내에 클릭해주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || errorMsg) && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMsg || ERROR_MESSAGES[error ?? ''] || '오류가 발생했습니다.'}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          이메일 주소
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'loading' ? '전송 중...' : '로그인 링크 받기'}
      </button>
    </form>
  );
}
