import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import SiteNav from '@/components/site-nav';
import { SITE_URL } from '@/lib/site-url';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '의회 주식 추적기 - 미국 의원 주식 거래 한국어 분석',
    template: '%s | 의회 주식 추적기',
  },
  description:
    '미국 STOCK Act 공시 데이터를 한국어로 — 의원 주식 거래를 실시간 추적하세요. 의원 프로필, 종목별 거래 현황, 랭킹을 한국어로 확인하세요.',
  keywords: ['미국 의회 주식', '의원 주식 거래', 'STOCK Act', '미국 주식 한국어', '의회 투자 추적'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '의회 주식 추적기',
    images: [{ url: '/api/og/top5', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/api/og/top5'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '의회 주식 추적기',
  url: SITE_URL,
  description: '미국 STOCK Act 공시 데이터를 한국어로 제공하는 의원 주식 거래 추적 서비스',
  inLanguage: 'ko',
};

// WebSite schema with SearchAction for sitelinks search box
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '의회 주식 추적기',
  url: SITE_URL,
  inLanguage: 'ko',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {/* Blocking script: apply dark class before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');})()`}} />
        <a href="#main-content" className="skip-to-content">본문으로 이동</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/<\/script>/gi, '<\\/script>') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/<\/script>/gi, '<\\/script>') }}
        />
        <SiteNav />
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 bg-white py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <p>
            데이터 출처: 미국 상원 eFTS &amp; 하원 FD XML 공시 시스템 (
            <Link href="/methodology" className="hover:underline text-zinc-400">
              STOCK Act
            </Link>
            ) ·{' '}
            <span className="text-zinc-400">의회 주식 추적기</span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            이 서비스는 투자 조언을 제공하지 않습니다.{' '}
            <Link href="/methodology" className="hover:underline">
              데이터 방법론 안내
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
