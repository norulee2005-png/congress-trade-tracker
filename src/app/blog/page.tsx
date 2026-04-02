import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog-posts';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: '블로그 — 미국 의회 주식 거래 인사이트',
  description:
    '미국 의원 주식 거래, STOCK Act, 투자 전략에 대한 한국어 콘텐츠. Congress Trade Tracker 블로그에서 최신 분석을 확인하세요.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: '블로그 | 의회 주식 추적기',
    description: '미국 의원 주식 거래 인사이트와 투자 활용 전략을 한국어로 제공합니다.',
    url: '/blog',
    locale: 'ko_KR',
    type: 'website',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  announcement: '공지',
  education: '교육',
  analysis: '분석',
  guide: '가이드',
  politician: '의원분석',
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '블로그', item: absoluteUrl('/blog') },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">블로그</h1>
        <p className="mt-2 text-sm text-zinc-500">
          미국 의회 주식 거래, STOCK Act, 투자 인사이트를 한국어로 제공합니다
        </p>
      </section>

      <section className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex items-center gap-2 mb-2">
              {post.category && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </span>
              )}
              <time className="text-xs text-zinc-400" dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
              {post.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 leading-relaxed line-clamp-2">
              {post.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
