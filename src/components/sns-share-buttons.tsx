'use client';

// SNS share buttons: X/Twitter, KakaoTalk, Naver Blog
// KakaoTalk uses Kakao.Share.sendDefault() when SDK is available,
// falls back to kakaotalk:// URL scheme on mobile, then story.kakao.com on desktop.

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description: string;
            imageUrl: string;
            link: { mobileWebUrl: string; webUrl: string };
          };
        }) => void;
      };
    };
  }
}

interface SnsShareButtonsProps {
  /** Full URL to share (should be absolute) */
  url: string;
  /** Short text for the share message */
  text: string;
  /** Optional image URL for Kakao feed card (defaults to OG image) */
  imageUrl?: string;
}

export default function SnsShareButtons({ url, text, imageUrl }: SnsShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const ogImage = imageUrl ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/og/top5`;

  const shareX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400',
    );
  };

  const shareKakao = () => {
    // Prefer Kakao JS SDK (best UX — native share dialog)
    if (window.Kakao?.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: text,
          description: '의회 주식 추적기 — 미국 의원 주식 거래 한국어 분석',
          imageUrl: ogImage,
          link: { mobileWebUrl: url, webUrl: url },
        },
      });
      return;
    }

    // Mobile fallback: KakaoTalk URL scheme
    const ua = navigator.userAgent.toLowerCase();
    if (/android|iphone|ipad/.test(ua)) {
      window.location.href = `kakaotalk://share?url=${encodedUrl}&text=${encodedText}`;
      return;
    }

    // Desktop fallback: Kakao Story share page
    window.open(
      `https://story.kakao.com/share?url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500',
    );
  };

  const shareNaver = () => {
    window.open(
      `https://blog.naver.com/openapi/share?url=${encodedUrl}&title=${encodedText}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500',
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-zinc-400 mr-1">공유</span>

      {/* X / Twitter */}
      <button
        onClick={shareX}
        aria-label="X(트위터)에 공유"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
      >
        <XIcon />
        X
      </button>

      {/* KakaoTalk */}
      <button
        onClick={shareKakao}
        aria-label="카카오톡으로 공유"
        className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-400 px-3 py-1.5 text-xs font-medium text-yellow-900 hover:bg-yellow-300 transition-colors"
      >
        <KakaoIcon />
        카카오톡
      </button>

      {/* Naver Blog */}
      <button
        onClick={shareNaver}
        aria-label="네이버 블로그에 공유"
        className="inline-flex items-center gap-1.5 rounded-lg border border-green-600 bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
      >
        <NaverIcon />
        네이버
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.617 5.077 4.077 6.516L5.1 21l4.523-2.277C10.054 18.897 11.013 19 12 19c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
    </svg>
  );
}
