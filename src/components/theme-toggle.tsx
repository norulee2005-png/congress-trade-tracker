'use client';

import { useEffect, useState } from 'react';

type Theme = 'system' | 'dark' | 'light';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    if (matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

const CYCLE: Theme[] = ['system', 'dark', 'light'];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && CYCLE.includes(stored)) {
      setTheme(stored);
    }
  }, []);

  function handleClick() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={handleClick}
      aria-label={`테마 변경 (현재: ${theme === 'system' ? '시스템' : theme === 'dark' ? '다크' : '라이트'})`}
      title={`테마: ${theme === 'system' ? '시스템' : theme === 'dark' ? '다크' : '라이트'}`}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
    >
      {isDark ? (
        /* Moon icon (dark mode active) */
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        /* Sun icon (light/system mode) */
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
