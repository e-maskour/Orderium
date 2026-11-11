import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONTACT, isLocale, mailLink, ogLocale, SITE_URL, waLink, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getSolutions, isSolutionSlug, SOLUTION_SHOTS, SOLUTION_SLUGS } from '@/i18n/solutions';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LeadForm } from '@/components/LeadForm';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { Motion } from '@/components/Motion';
import { Split } from '@/components/Split';
import { MailIcon, WhatsAppIcon } from '@/components/icons';

export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

/** Strip bidi isolate characters used for display so metadata and structured data stay clean. */
const clean = (s: string) => s.replace(/[⁦-⁩]/g, '');

export async function generateMetadata({ params }: PageProps<'/[lang]/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !isSolutionSlug(slug)) return {};
  const p = getSolutions(lang).pages[slug];
  const other: Locale = lang === 'ar' ? 'fr' : 'ar';
  const title = clean(p.meta.title);
  const description = clean(p.meta.description);
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/${slug}`,
      languages: { fr: `/fr/${slug}`, ar: `/ar/${slug}`, 'x-default': `/fr/${slug}` },
    },
    openGraph: {
      type: 'website',
      siteName: 'Marnova',
      url: `/${lang}/${slug}`,
      title,
      description,
      locale: ogLocale[lang],
      alternateLocale: [ogLocale[other]],
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  };
}

export default async function SolutionPage({ params }: PageProps<'/[lang]/[slug]'>) {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !isSolutionSlug(slug)) notFound();
  const t = getDictionary(lang);
  const s = getSolutions(lang);
  const p = s.pages[slug];
  const other: Locale = lang === 'ar' ? 'fr' : 'ar';
  const base = `/${lang}`;
  const wa = waLink(p.wa);
  const mail = mailLink(`${t.wa.mailSubject} · ${clean(p.label)}`);
  const shot = SOLUTION_SHOTS[slug];
  const file = (name: string) => `/screens/${name}${lang === 'ar' ? '.ar' : ''}.webp`;
  const url = `${SITE_URL}/${lang}/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: clean(p.meta.title),
        description: clean(p.meta.description),
        inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#software` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Marnova', item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: clean(p.label), item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: p.faq.items.map((f) => ({
          '@type': 'Question',
          name: clean(f.q),
          acceptedAnswer: { '@type': 'Answer', text: clean(f.a) },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <Header lang={lang} t={{ nav: t.nav, a11y: t.a11y }} base={base} altHref={`/${other}/${slug}`} />

      <main id="main">
        {/* ================= HERO ================= */}
        <section className="hero hero--sub" aria-labelledby="hero-title">
          <div className="wrap hero__inner">
            <nav className="crumbs" aria-label={s.ui.home}>
              <a href={base}>{s.ui.home}</a>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{p.label}</span>
            </nav>
            <div className="hero__copy">
              <h1 className="hero__h1" id="hero-title">
                <span className="kicker">
                  <span className="pulse" aria-hidden="true" />
                  {p.kicker}
                </span>
                <span className="sr-only">. </span>
                <span className="hero__title hero__title--sub">{p.h1}</span>
              </h1>
              <p className="hero__lead">{p.lead}</p>
              <div className="hero__ctas">
                <a className="btn btn--primary btn--lg" href={wa} target="_blank" rel="noopener" data-magnetic>
                  <WhatsAppIcon className="ico" />
                  <span>{s.ui.cta1}</span>
                </a>
                <a className="btn btn--glass btn--lg" href={mail} data-magnetic>
                  {s.ui.cta2}
                </a>
              </div>
              <ul className="hero__points">
                {p.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </div>

            <figure className="gal-browser sol-shot">
              <div className="gal-browser__bar" aria-hidden="true">
                <i /><i /><i />
                <span>demo-admin.marnova.ma</span>
              </div>
              <div className="gal-browser__screen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="is-on"
                  src={file(shot)}
                  srcSet={`${file(`${shot}-800w`)} 800w, ${file(shot)} 1600w`}
                  sizes="(max-width: 900px) 100vw, 1000px"
                  width={1600}
                  height={1000}
                  alt={p.shotAlt}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </figure>
          </div>
        </section>

        {/* ================= BEFORE / AFTER ================= */}
        <section className="section swap" aria-labelledby="pains-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={p.pains.title} id="pains-title" className="h2" />
              <p className="lead" data-anim>{p.pains.lead}</p>
            </header>
            <table className="swap__table">
              <caption className="sr-only">{t.a11y.swap}</caption>
              <thead>
                <tr>
                  <th scope="col">{s.ui.before}</th>
                  <th scope="col">{s.ui.after}</th>
                </tr>
              </thead>
              <tbody>
                {p.pains.rows.map(([before, after]) => (
                  <tr key={before} data-anim>
                    <td><span className="strike" data-scrub="strike">{before}</span></td>
                    <td><span className="swap__ok" aria-hidden="true" />{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="section morocco" aria-labelledby="sol-features-title">
          <div className="wrap morocco__grid">
            <div>
              <Split text={p.features.title} id="sol-features-title" className="h2" />
              <p className="lead" data-anim>{p.features.lead}</p>
            </div>
            <div className="specs">
              {p.features.items.map((f) => (
                <article key={f.t} data-anim>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= WHO + PRICE ================= */}
        <section className="section steps" aria-labelledby="who-title">
          <div className="wrap">
            <header className="section__head section__head--tight">
              <Split text={p.who.title} id="who-title" className="h2" />
            </header>
            <ul className="chips" data-anim>
              {p.who.items.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="trial sol-price" data-anim data-zone="pricing">
              <div>
                <p className="trial__t">{p.price.t}</p>
                <p className="trial__d">{p.price.d}</p>
              </div>
              <div className="sol-price__ctas">
                <a className="btn btn--primary" href={waLink(t.pricing.trial.wa)} target="_blank" rel="noopener">
                  <WhatsAppIcon className="ico" />
                  <span>{t.pricing.trial.cta}</span>
                </a>
                <a className="btn btn--soft" href={`${base}#pricing`}>{s.ui.seePricing}</a>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="section faq" aria-labelledby="faq-title">
          <div className="wrap faq__grid">
            <Split text={p.faq.title} id="faq-title" className="h2" />
            <div className="faq__list">
              {p.faq.items.map((f) => (
                <details name="faq" key={f.q} data-anim>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ================= RELATED ================= */}
        <section className="section related" aria-labelledby="related-title">
          <div className="wrap">
            <h2 className="related__title" id="related-title">{s.ui.related}</h2>
            <ul className="related__list">
              {SOLUTION_SLUGS.filter((x) => x !== slug).map((x) => (
                <li key={x} data-anim>
                  <a href={`/${lang}/${x}`}>
                    <b>{s.pages[x].label}</b>
                    <span>{s.pages[x].kicker}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= CONTACT (dark) ================= */}
        <section className="section contact" id="contact" aria-labelledby="contact-title">
          <div className="contact__bg" aria-hidden="true" />
          <div className="wrap contact__grid">
            <div className="contact__intro">
              <Split text={t.contact.title} id="contact-title" className="h2" />
              <p className="lead" data-anim>{t.contact.lead}</p>
              <ul className="direct" data-anim>
                <li>
                  <a href={wa} target="_blank" rel="noopener">
                    <span className="direct__ico direct__ico--wa"><WhatsAppIcon /></span>
                    <span><small>WhatsApp</small><b dir="ltr">{CONTACT.whatsappDisplay}</b></span>
                  </a>
                </li>
                <li>
                  <a href={mail}>
                    <span className="direct__ico"><MailIcon /></span>
                    <span><small>{t.contact.email}</small><b dir="ltr">{CONTACT.email}</b></span>
                  </a>
                </li>
              </ul>
            </div>
            <div data-anim>
              <LeadForm t={t.form} wa={{ ...t.wa, greeting: p.wa }} />
            </div>
          </div>
        </section>
      </main>

      <Footer lang={lang} t={t} s={s} wa={wa} mail={mail} base={base} altHref={`/${other}/${slug}`} />
      <WhatsAppFloat href={wa} label={t.a11y.waFloat} />
      <Motion />
    </>
  );
}
