import { CONTACT, SITE_URL, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';
import { PLANS } from '@/lib/plans';

/** Strip bidi isolate characters used for display so structured data stays clean. */
const clean = (s: string) => s.replace(/[⁦-⁩]/g, '');

export function JsonLd({ lang, t }: { lang: Locale; t: Dictionary }) {
  const url = `${SITE_URL}/${lang}`;
  const orgId = `${SITE_URL}/#organization`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'Marnova',
        url: SITE_URL,
        logo: `${SITE_URL}/logo-mark.svg`,
        email: CONTACT.email,
        areaServed: { '@type': 'Country', name: 'Morocco' },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            telephone: `+${CONTACT.whatsapp}`,
            email: CONTACT.email,
            availableLanguage: ['French', 'Arabic'],
            areaServed: 'MA',
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Marnova',
        inLanguage: ['fr', 'ar'],
        publisher: { '@id': orgId },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: clean(t.meta.title),
        description: clean(t.meta.description),
        inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#software` },
        primaryImageOfPage: `${SITE_URL}/og-image.png`,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: 'Marnova',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'ERP',
        operatingSystem: 'Web browser',
        description: clean(t.meta.description),
        inLanguage: ['fr', 'ar'],
        availableOnDevice: ['Desktop', 'Tablet', 'Mobile'],
        featureList: [
          t.features.sales.t,
          t.features.stock.t,
          t.features.pay.t,
          t.features.pos.t,
          t.features.delivery.t,
          t.features.reports.t,
          ...t.features.small.map((s) => s.t),
        ].map(clean),
        publisher: { '@id': orgId },
        offers: PLANS.map((p) => {
          const unit = (price: number, months: 1 | 12) => ({
            '@type': 'UnitPriceSpecification',
            ...(p.fromPrice ? { minPrice: price } : { price }),
            priceCurrency: 'MAD',
            valueAddedTaxIncluded: false,
            billingDuration: months === 1 ? 'P1M' : 'P1Y',
            unitText: months === 1 ? 'MONTH' : 'YEAR',
          });
          return {
            '@type': 'Offer',
            name: `Marnova ${t.pricing.plans[p.key].name}`,
            description: clean(t.pricing.plans[p.key].for),
            price: p.priceMonthly,
            priceCurrency: 'MAD',
            availability: 'https://schema.org/InStock',
            url: `${url}#pricing`,
            priceSpecification: [unit(p.priceMonthly, 1), unit(p.priceYearly, 12)],
          };
        }),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: lang,
        mainEntity: t.faq.items.map((f) => ({
          '@type': 'Question',
          name: clean(f.q),
          acceptedAnswer: { '@type': 'Answer', text: clean(f.a) },
        })),
      },
      {
        '@type': 'HowTo',
        '@id': `${url}#start`,
        name: clean(t.steps.title),
        inLanguage: lang,
        step: t.steps.items.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: clean(s.t), text: clean(s.d) })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for "<" to keep the script tag safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
