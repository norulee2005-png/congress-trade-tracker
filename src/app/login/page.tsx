import type { Metadata } from 'next';
import LoginForm from '@/components/login-form';

export const metadata: Metadata = {
  title: '로그인',
  description: '이메일 매직 링크로 로그인하세요.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">로그인</h1>
          <p className="mt-2 text-sm text-zinc-500">
            이메일을 입력하시면 로그인 링크를 보내드립니다.
          </p>
        </div>
        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  );
}
