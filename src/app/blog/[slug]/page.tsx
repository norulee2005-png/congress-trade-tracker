import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllBlogSlugs, getBlogPost } from '@/lib/blog-posts';
import { absoluteUrl } from '@/lib/site-url';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: `${post.title} | 의회 주식 추적기`,
      description: post.description,
      url: `/blog/${slug}`,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'ko',
    author: {
      '@type': 'Organization',
      name: '의회 주식 추적기',
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: '의회 주식 추적기',
      url: absoluteUrl('/'),
    },
    image: absoluteUrl('/api/og/top5'),
    url: absoluteUrl(`/blog/${slug}`),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${slug}`),
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '블로그', item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: absoluteUrl(`/blog/${slug}`) },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        ← 블로그 목록
      </Link>

      {/* Header */}
      <header className="mb-8">
        <time className="text-xs text-zinc-400" dateTime={post.date}>
          {new Date(post.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{post.description}</p>
      </header>

      {/* Article body */}
      <article
        className="prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none
          prose-headings:font-semibold
          prose-a:text-blue-600 dark:prose-a:text-blue-400
          prose-strong:text-zinc-800 dark:prose-strong:text-zinc-200
          prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </div>
  );
}
