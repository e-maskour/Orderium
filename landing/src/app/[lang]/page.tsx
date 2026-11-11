import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { CONTACT, isLocale, mailLink, waLink } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { Header } from '@/components/Header';
import { HeroScene } from '@/components/HeroScene';
import { HeroDashboard } from '@/components/HeroDashboard';
import { ChainDocument } from '@/components/ChainDocument';
import { Device } from '@/components/Device';
import { Gallery } from '@/components/Gallery';
import { LeadForm } from '@/components/LeadForm';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { JsonLd } from '@/components/JsonLd';
import { Motion } from '@/components/Motion';
import { Split } from '@/components/Split';
import { Pricing } from '@/components/Pricing';
import { PLANS, fmt, yearlyPerMonth, type Plan } from '@/lib/plans';
import type { Dictionary } from '@/i18n/dictionaries/fr';
import { Footer } from '@/components/Footer';
import { getSolutions, SOLUTION_SLUGS } from '@/i18n/solutions';
import { MailIcon, WhatsAppIcon } from '@/components/icons';

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Concentric 8-fold star polygons {8/3}: a zellige rosette drawn as lines. */
function Rosette({ className }: { className?: string }) {
  const star = (R: number, rot: number) => {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = ((i * 3) / 8) * Math.PI * 2 + rot;
      return `${(Math.cos(a) * R).toFixed(2)},${(Math.sin(a) * R).toFixed(2)}`;
    });
    return pts.join(' ');
  };
  return (
    <svg className={className} viewBox="-100 -100 200 200" aria-hidden="true" data-scrub="draw">
      {[96, 76, 56, 36].map((R, i) => (
        <polygon key={R} points={star(R, (i * Math.PI) / 8)} pathLength={1} />
      ))}
      <circle r="98" pathLength={1} />
      <circle r="18" pathLength={1} />
    </svg>
  );
}

type PlanRow = { label: string; on: boolean; value?: string; num?: boolean };

/** Feature list of one plan card, from the plan limits and the dictionary labels. */
function planRows(p: Plan, t: Dictionary['pricing']): PlanRow[] {
  const r = t.rows;
  const limit = (label: string, n: number, suffix = ''): PlanRow =>
    n === -1 ? { label, on: true, value: t.unlimited } : { label, on: n > 0, value: n > 0 ? `${fmt(n)}${suffix}` : undefined, num: true };
  return [
    limit(r.users, p.users),
    limit(r.warehouses, p.warehouses),
    limit(r.products, p.products),
    { label: r.pos, on: p.pos },
    p.delivery ? limit(r.delivery, p.deliveryPersons) : { label: r.delivery, on: false },
    { label: r.portal, on: p.clientPortal },
    { label: r.reports, on: p.reports },
    limit(r.storage, p.storageGb, ` ${t.gb}`),
    { label: r.support, on: true, value: t.plans[p.key].support },
  ];
}

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const s = getSolutions(lang);
  const wa = waLink(t.wa.greeting);
  const mail = mailLink(t.wa.mailSubject);
  return (
    <>
      <JsonLd lang={lang} t={t} />
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <Header lang={lang} t={{ nav: t.nav, a11y: t.a11y }} />

      <main id="main">
        {/* ================= HERO ================= */}
        <section className="hero" aria-labelledby="hero-title">
          <HeroScene />
          <div className="hero__veil" aria-hidden="true" />
          <div className="wrap hero__inner">
            <div className="hero__copy">
              {/* The kicker carries the search keywords, so it is part of the H1. */}
              <h1 className="hero__h1" id="hero-title">
                <span className="kicker">
                  <span className="pulse" aria-hidden="true" />
                  {t.hero.kicker}
                </span>
                <span className="sr-only">. </span>
                <span className="hero__title">{t.hero.title}</span>
              </h1>
              <p className="hero__lead">{t.hero.lead}</p>
              <div className="hero__ctas">
                <a className="btn btn--primary btn--lg" href={wa} target="_blank" rel="noopener" data-magnetic>
                  <WhatsAppIcon className="ico" />
                  <span>{t.hero.cta1}</span>
                </a>
                <a className="btn btn--glass btn--lg" href={mail} data-magnetic>
                  {t.hero.cta2}
                </a>
              </div>
              <ul className="hero__points">
                {t.hero.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <HeroDashboard t={t.dash} cities={t.features.stock.cities} />

            <dl className="hero__stats">
              {t.stats.map((s) => (
                <div key={s.l}>
                  <dt className="num">{s.v}</dt>
                  <dd>{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================= MARQUEE ================= */}
        <section className="marquee" aria-label={t.marquee.label}>
          <p className="marquee__label">{t.marquee.label}</p>
          <div className="marquee__viewport">
            <ul className="marquee__track">
              {[0, 1].map((copy) =>
                t.marquee.items.map((item) => (
                  <li key={`${copy}-${item}`} aria-hidden={copy === 1 || undefined}>
                    <svg viewBox="-12 -12 24 24" aria-hidden="true">
                      <rect x="-7" y="-7" width="14" height="14" />
                      <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
                    </svg>
                    {item}
                  </li>
                )),
              )}
            </ul>
          </div>
        </section>

        {/* ================= DOCUMENT CHAIN (scroll story) ================= */}
        <section className="section chain" id="chain" aria-labelledby="chain-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={t.chain.title} id="chain-title" className="h2" />
              <p className="lead" data-anim>{t.chain.lead}</p>
            </header>

            <div className="chain__grid" data-stage-group>
              <div className="chain__visual">
                <div className="chain__sticky">
                  <ChainDocument t={t.doc} />
                </div>
              </div>
              <div className="chain__track">
              <span className="chain__progress" data-stage-progress aria-hidden="true"><i /></span>
              <ol className="chain__steps" data-stage-steps>
                {t.chain.steps.map((s, i) => (
                  <li className="chain__step" data-stage-step key={s.t}>
                    <span className="chain__num num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <p className="chain__label">{t.doc.rail[i]}</p>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </li>
                ))}
              </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BEFORE / AFTER ================= */}
        <section className="section swap" aria-labelledby="swap-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={t.swap.title} id="swap-title" className="h2" />
              <p className="lead" data-anim>{t.swap.lead}</p>
            </header>
            <table className="swap__table">
              <caption className="sr-only">{t.a11y.swap}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.swap.before}</th>
                  <th scope="col">{t.swap.after}</th>
                </tr>
              </thead>
              <tbody>
                {t.swap.rows.map(([before, after]) => (
                  <tr key={before} data-anim>
                    <td><span className="strike" data-scrub="strike">{before}</span></td>
                    <td><span className="swap__ok" aria-hidden="true" />{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= FEATURES (bento) ================= */}
        <section className="section features" id="features" aria-labelledby="features-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={t.features.title} id="features-title" className="h2" />
              <p className="lead" data-anim>{t.features.lead}</p>
            </header>

            <div className="bento">
              <article className="tile tile--wide" data-anim data-tilt>
                <div className="tile__text">
                  <h3>{t.features.sales.t}</h3>
                  <p>{t.features.sales.d}</p>
                </div>
                <div className="flow" aria-hidden="true">
                  {t.doc.rail.map((label, i) => (
                    <span key={label} className="flow__group">
                      {i > 0 && <span className="flow__arrow" />}
                      <span className={`flow__doc${i === 3 ? ' flow__doc--end' : ''}`}>
                        <b>{label}</b>
                        <i className="num">{['DV-0142', 'BC-0098', 'BL-0211', 'FA-0187'][i]}</i>
                      </span>
                    </span>
                  ))}
                </div>
              </article>

              <article className="tile tile--stock" data-anim data-tilt>
                <h3>{t.features.stock.t}</h3>
                <p>{t.features.stock.d}</p>
                <ul className="bars" aria-hidden="true">
                  {t.features.stock.cities.map((c, i) => (
                    <li key={c}>
                      <span>{c}</span>
                      <i style={css({ '--v': ['82%', '54%', '28%'][i], '--k': i })} className={i === 2 ? 'low' : undefined} />
                    </li>
                  ))}
                </ul>
              </article>

              <article className="tile tile--pay" data-anim data-tilt>
                <h3>{t.features.pay.t}</h3>
                <p>{t.features.pay.d}</p>
                <div className="paybar" aria-hidden="true">
                  <div className="paybar__track"><i /></div>
                  <div className="paybar__legend">
                    <span><b className="num">7 500,00</b> {t.features.pay.paid}</span>
                    <span><b className="num">4 980,00</b> {t.features.pay.left}</span>
                  </div>
                </div>
              </article>

              <article className="tile tile--pos" data-anim data-tilt>
                <h3>{t.features.pos.t}</h3>
                <p>{t.features.pos.d}</p>
                <div className="ticket" aria-hidden="true">
                  <span /><span /><span /><b className="num">245,00</b>
                </div>
              </article>

              <article className="tile tile--delivery" data-anim data-tilt>
                <h3>{t.features.delivery.t}</h3>
                <p>{t.features.delivery.d}</p>
                <div className="route" aria-hidden="true">
                  <svg viewBox="0 0 220 60" preserveAspectRatio="none"><path d="M10 48 C 60 48, 70 12, 110 14 S 170 46, 210 14" /></svg>
                  <i className="route__pin route__pin--a" /><i className="route__van" /><i className="route__pin route__pin--b" />
                </div>
              </article>

              <article className="tile tile--reports" data-anim data-tilt>
                <h3>{t.features.reports.t}</h3>
                <p>{t.features.reports.d}</p>
                <div className="spark" aria-hidden="true">
                  {[38, 52, 44, 63, 58, 74, 69, 88].map((h, i) => (
                    <i key={i} style={css({ '--h': `${h}%`, '--k': i })} />
                  ))}
                </div>
              </article>

              {t.features.small.map((s) => (
                <article className="tile tile--small" key={s.t} data-anim data-tilt>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </article>
              ))}
            </div>

            <nav className="sol-links" aria-label={s.ui.solutions} data-anim>
              {SOLUTION_SLUGS.map((slug) => (
                <a key={slug} href={`/${lang}/${slug}`}>{s.pages[slug].label}</a>
              ))}
            </nav>
          </div>
        </section>

        {/* ================= APPS SHOWCASE (dark, sticky device) ================= */}
        <section className="section apps" id="apps" aria-labelledby="apps-title">
          <div className="apps__glow" aria-hidden="true" />
          <div className="wrap">
            <header className="section__head">
              <Split text={t.apps.title} id="apps-title" className="h2" />
              <p className="lead" data-anim>{t.apps.lead}</p>
            </header>
            <div className="show" data-stage-group>
              <div className="show__visual">
                <div className="show__sticky">
                  <Device t={t.apps} lang={lang} />
                </div>
              </div>
              <div className="show__steps" data-stage-steps>
                {t.apps.panels.map((p, i) => (
                  <article className="show__step" data-stage-step key={p.t}>
                    <p className="show__tag">{t.apps.tabs[i]}</p>
                    <h3>{p.t}</h3>
                    <ul className="ticks">
                      {p.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= GALLERY (real captures) ================= */}
        <Gallery t={t.gallery} lang={lang} />

        {/* ================= MOROCCO ================= */}
        <section className="section morocco" id="morocco" aria-labelledby="morocco-title">
          <Rosette className="rosette" />
          <div className="wrap morocco__grid">
            <div>
              <Split text={t.morocco.title} id="morocco-title" className="h2" />
              <p className="lead" data-anim>{t.morocco.lead}</p>
              <div className="bilingual" aria-hidden="true" data-scrub="wipe">
                <span lang="fr" dir="ltr">Facture</span>
                <span lang="ar" dir="rtl">فاتورة</span>
              </div>
            </div>
            <dl className="specs">
              {t.morocco.specs.map((s) => (
                <div key={s.t} data-anim>
                  <dt>{s.t}</dt>
                  <dd>{s.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================= STEPS ================= */}
        <section className="section steps" id="start" aria-labelledby="start-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={t.steps.title} id="start-title" className="h2" />
            </header>
            <div className="steps__rail">
              <span className="steps__line" data-scrub="line" aria-hidden="true" />
              <ol className="steps__list" data-scrub="steps">
                {t.steps.items.map((s) => (
                  <li key={s.t}>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section className="section prices" id="pricing" aria-labelledby="pricing-title">
          <div className="wrap">
            <header className="section__head">
              <Split text={t.pricing.title} id="pricing-title" className="h2" />
              <p className="lead" data-anim>{t.pricing.lead}</p>
            </header>
            <Pricing t={t.pricing.billing}>
              <div className="plans">
                {PLANS.map((p) => {
                  const c = t.pricing.plans[p.key];
                  return (
                    <article className={`plan${p.featured ? ' plan--featured' : ''}`} key={p.key} data-anim aria-labelledby={`plan-${p.key}`}>
                      <div className="plan__top">
                        <h3 className="plan__name" id={`plan-${p.key}`}>{c.name}</h3>
                        {p.featured && <span className="plan__badge">{t.pricing.popular}</span>}
                      </div>
                      <p className="plan__for">{c.for}</p>
                      <div className="plan__price">
                        <p className="plan__from" aria-hidden={!p.fromPrice || undefined}>{p.fromPrice ? t.pricing.from : '\u00a0'}</p>
                        <p className="plan__amount" data-period="m">
                          <b className="num">{fmt(p.priceMonthly)}</b>
                          <span>{t.pricing.currency}<br />{t.pricing.perMonth}</span>
                        </p>
                        <p className="plan__amount" data-period="y">
                          <b className="num">{fmt(p.priceYearly)}</b>
                          <span>{t.pricing.currency}<br />{t.pricing.perYear}</span>
                        </p>
                        <p className="plan__note" data-period="m">{t.pricing.orYearly.replace('{y}', fmt(p.priceYearly))}</p>
                        <p className="plan__note" data-period="y">{t.pricing.yearlyEq.replace('{m}', fmt(yearlyPerMonth(p)))}</p>
                      </div>
                      <a
                        className={`btn ${p.featured ? 'btn--primary' : 'btn--soft'} plan__cta`}
                        href={waLink(c.wa)}
                        target="_blank"
                        rel="noopener"
                      >
                        <WhatsAppIcon className="ico" />
                        <span>{c.cta}</span>
                      </a>
                      <ul className="plan__list">
                        {planRows(p, t.pricing).map((row) => (
                          <li key={row.label} className={row.on ? 'is-on' : 'is-off'}>
                            <span>
                              {row.label}
                              {!row.value && <span className="sr-only">{`: ${row.on ? t.pricing.included : t.pricing.notIncluded}`}</span>}
                            </span>
                            {row.value && <b className={row.num ? 'num' : undefined}>{row.value}</b>}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </Pricing>

            <div className="trial" data-anim>
              <div>
                <p className="trial__t">{t.pricing.trial.t}</p>
                <p className="trial__d">{t.pricing.trial.d}</p>
              </div>
              <a className="btn btn--primary" href={waLink(t.pricing.trial.wa)} target="_blank" rel="noopener">
                <WhatsAppIcon className="ico" />
                <span>{t.pricing.trial.cta}</span>
              </a>
            </div>

            <div className="addons" data-anim>
              <h3 className="addons__title">{t.pricing.addons.title}</h3>
              <ul className="addons__list">
                {t.pricing.addons.items.map((a) => (
                  <li key={a.t}>
                    <span>{a.t}</span>
                    <b>{a.p}</b>
                  </li>
                ))}
              </ul>
              <p className="addons__vat">{t.pricing.vat}</p>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="section faq" id="faq" aria-labelledby="faq-title">
          <div className="wrap faq__grid">
            <Split text={t.faq.title} id="faq-title" className="h2" />
            <div className="faq__list">
              {t.faq.items.map((f) => (
                <details name="faq" key={f.q} data-anim>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
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
              <LeadForm t={t.form} />
            </div>
          </div>
        </section>
      </main>

      <Footer lang={lang} t={t} s={s} wa={wa} mail={mail} />

      <WhatsAppFloat href={wa} label={t.a11y.waFloat} />
      <Motion />
    </>
  );
}
