import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'STOCK Act 설명 및 데이터 방법론',
  description:
    'STOCK Act이 뭔가요? 미국 의회 의원들은 왜 주식 거래를 신고해야 하나요? 의회 주식 추적기의 데이터 수집 방법과 공시 절차를 한국어로 설명합니다.',
  alternates: {
    canonical: '/methodology',
  },
  openGraph: {
    title: 'STOCK Act 설명 및 데이터 방법론 | 의회 주식 추적기',
    description:
      'STOCK Act이 뭔가요? 미국 의원들의 주식 거래 신고 의무, 공시 절차, 데이터 활용법을 한국어로 설명합니다.',
    url: '/methodology',
    locale: 'ko_KR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STOCK Act 설명 및 데이터 방법론 | 의회 주식 추적기',
    description: 'STOCK Act이 뭔가요? 미국 의원 주식 공시 제도 한국어 안내',
  },
};

const faqs = [
  {
    question: 'STOCK Act이 뭔가요?',
    answer:
      'STOCK Act(Stop Trading on Congressional Knowledge Act)는 2012년 미국에서 제정된 법률로, 의회 의원 및 직원들이 직무상 취득한 비공개 정보를 이용해 주식 거래를 하는 것을 금지합니다. 또한 의원들은 주식 매수·매도 거래를 45일 이내에 공개 신고해야 합니다.',
  },
  {
    question: '의원 주식거래는 합법인가요?',
    answer:
      '네, 미국 의원들의 주식 거래 자체는 합법입니다. 다만 STOCK Act에 따라 거래 후 45일 이내에 공시해야 하며, 내부 정보를 이용한 거래는 금지됩니다. 신고 기한을 어기면 건당 200달러의 과태료가 부과됩니다.',
  },
  {
    question: '낸시 펠로시 주식을 따라해도 되나요?',
    answer:
      '이 서비스는 투자 조언을 제공하지 않습니다. 의원들의 거래 내역은 참고용 정보이며, 의원들의 매매 결정에는 정치적 판단, 세금, 자산 구성 등 복잡한 요소가 포함되어 있습니다. 투자 결정은 본인의 판단과 전문 금융 자문을 기반으로 하시기 바랍니다.',
  },
  {
    question: '의원들의 주식 거래 데이터는 어디서 가져오나요?',
    answer:
      '데이터는 미국 상원 전자금융공시시스템(eFTS, efts.senate.gov)과 미국 하원 금융공시시스템(FD XML, disclosures-clerk.house.gov)에서 수집됩니다. 모두 미국 정부의 공개 데이터로, STOCK Act에 따라 의무적으로 공시된 정보입니다.',
  },
  {
    question: '공시가 45일 이내라고 하는데, 실제로 얼마나 걸리나요?',
    answer:
      '법적 기한은 45일이지만 실제로는 대부분의 의원이 기한 내에 신고합니다. 일부 의원은 신고가 지연되거나 수정 신고를 하는 경우도 있습니다. 저희 사이트는 신고 날짜(disclosure date)와 실제 거래 날짜(trade date) 모두 표시하므로 공시 지연을 확인할 수 있습니다.',
  },
  {
    question: 'NANC ETF, GOP ETF가 뭔가요?',
    answer:
      'NANC ETF(Subversive Unusual Whales Democratic Trading ETF)와 GOP ETF(Unusual Whales Republican Trading ETF)는 각각 민주당과 공화당 의원들의 공시 거래 내역을 추종하는 미국 상장 ETF입니다. 의원들의 포트폴리오를 직접 따라하지 않고 ETF를 통해 간접 투자하는 방법입니다.',
  },
  {
    question: '거래 금액 범위는 왜 정확한 금액이 아닌가요?',
    answer:
      'STOCK Act 공시 양식은 정확한 금액이 아닌 범위(예: $1,001–$15,000, $15,001–$50,000 등)로 신고하도록 설계되어 있습니다. 따라서 저희도 공시된 금액 범위를 그대로 표시하며, 정확한 거래 금액은 알 수 없습니다.',
  },
  {
    question: '데이터는 얼마나 자주 업데이트되나요?',
    answer:
      '거래 데이터는 6시간마다 자동으로 미국 정부 공시 시스템에서 동기화됩니다. 최신 공시가 반영되기까지 최대 6시간의 시차가 발생할 수 있습니다.',
  },
];

export default function MethodologyPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '대시보드', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'STOCK Act 설명', item: absoluteUrl('/methodology') },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          STOCK Act 설명 및 데이터 방법론
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          미국 의원 주식 공시 제도와 이 서비스의 데이터 수집 방법을 안내합니다
        </p>
      </section>

      {/* Data sources */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">데이터 출처</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">미국 상원</p>
            <p className="mt-1 text-xs text-zinc-500">
              eFTS (Electronic Financial Disclosure System)
            </p>
            <a
              href="https://efts.senate.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              efts.senate.gov ↗
            </a>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">미국 하원</p>
            <p className="mt-1 text-xs text-zinc-500">
              FD XML (Financial Disclosure XML)
            </p>
            <a
              href="https://disclosures-clerk.house.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              disclosures-clerk.house.gov ↗
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">자주 묻는 질문</h2>
        <dl className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <dt className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {faq.question}
              </dt>
              <dd className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Disclaimer */}
      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-900 dark:bg-yellow-950/30">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>투자 주의사항:</strong> 이 서비스는 미국 정부 공시 데이터를 한국어로 제공하는
          정보 서비스입니다. 투자 조언이나 권유가 아닙니다. 투자 결정은 본인의 책임 하에
          이루어져야 하며, 필요한 경우 전문 금융 자문을 구하시기 바랍니다.
        </p>
      </section>
    </div>
  );
}
