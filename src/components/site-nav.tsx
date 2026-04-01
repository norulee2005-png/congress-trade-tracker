import Link from 'next/link';
import NavLinks from './nav-links';
import ThemeToggle from './theme-toggle';
import { getSession } from '@/lib/auth-session';

export default async function SiteNav() {
  const session = await getSession();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-50">
          <span className="text-blue-600">🏛</span>
          <span>의회 주식 추적기</span>
        </Link>
        <div className="flex items-center gap-2">
          <NavLinks />
          <div className="ml-2 flex items-center gap-1 border-l border-zinc-200 pl-3 dark:border-zinc-800">
            <ThemeToggle />
            {session ? (
              <Link
                href="/account"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                내 계정
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
