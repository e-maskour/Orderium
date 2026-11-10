'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';
import { Split } from './Split';

type T = Dictionary['gallery'];

/** Real captures taken from the demo tenant (see /public/screens). */
const BO_SHOTS = ['bo-dashboard', 'bo-orders', 'bo-pos', 'bo-invoices', 'bo-analytics'];
const CLIENT_SHOTS = ['client-catalog', 'client-checkout', 'client-orders', 'client-tracking'];
const DELIVERY_SHOTS = ['delivery-orders', 'delivery-detail', 'delivery-earnings'];

function Phone({ src, t, d, priority = false }: { src: string; t: string; d: string; priority?: boolean }) {
  return (
    <figure className="gal-phone">
      <div className="gal-phone__frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          width={720}
          height={1558}
          alt={t}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
      <figcaption>
        <b>{t}</b>
        <span>{d}</span>
      </figcaption>
    </figure>
  );
}

export function Gallery({ t, lang }: { t: T; lang: Locale }) {
  // Arabic pages show the apps captured in Arabic.
  const file = (name: string) => `/screens/${name}${lang === 'ar' ? '.ar' : ''}.webp`;
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const shots = t.backoffice.shots;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : shots.length - 1;
      setActive(next);
      tabs.current[next]?.focus();
      return;
    }
    const step = keys[e.key];
    if (!step) return;
    e.preventDefault();
    // Horizontal arrows follow reading direction in RTL.
    const rtl = document.documentElement.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');
    const next = (active + (rtl ? -step : step) + shots.length) % shots.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="section gallery" id="screens" aria-labelledby="gallery-title">
      <div className="wrap">
        <header className="section__head gallery__head">
          <p className="gallery__kicker" data-anim>{t.kicker}</p>
          <Split text={t.title} id="gallery-title" className="h2" />
          <p className="lead" data-anim>{t.lead}</p>
        </header>

        {/* ---------- Back-office: browser frame + tabs ---------- */}
        <div className="gal-bo" data-anim>
          <div className="gal-bo__meta">
            <h3>{t.backoffice.label}</h3>
            <span className="gal-chip">{t.device.desktop}</span>
          </div>

          <div className="gal-bo__body">
            <div className="gal-bo__tabs" role="tablist" aria-label={t.backoffice.label} aria-orientation="vertical" onKeyDown={onKey}>
              {shots.map((s, i) => (
                <button
                  key={s.t}
                  ref={(el) => { tabs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`gal-tab-${i}`}
                  aria-selected={active === i}
                  aria-controls="gal-panel"
                  tabIndex={active === i ? 0 : -1}
                  className="gal-tab"
                  onClick={() => setActive(i)}
                >
                  <b>{s.t}</b>
                  <span>{s.d}</span>
                </button>
              ))}
            </div>

            <div className="gal-browser" id="gal-panel" role="tabpanel" aria-labelledby={`gal-tab-${active}`}>
              <div className="gal-browser__bar" aria-hidden="true">
                <i /><i /><i />
                <span>demo-admin.marnova.ma</span>
              </div>
              <div className="gal-browser__screen">
                {BO_SHOTS.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={file(src)}
                    width={1600}
                    height={1000}
                    alt={shots[i].t}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={active === i ? 'is-on' : undefined}
                    aria-hidden={active !== i}
                  />
                ))}
              </div>
              <p className="gal-browser__caption">{shots[active].d}</p>
            </div>
          </div>
        </div>

        {/* ---------- Mobile portals ---------- */}
        <div className="gal-mobile">
          {(
            [
              [t.client, CLIENT_SHOTS],
              [t.delivery, DELIVERY_SHOTS],
            ] as const
          ).map(([group, srcs]) => (
            <div className="gal-group" key={group.label} data-anim>
              <div className="gal-bo__meta">
                <h3>{group.label}</h3>
                <span className="gal-chip">{t.device.mobile}</span>
              </div>
              <div className="gal-rail">
                {srcs.map((src, i) => (
                  <Phone key={src} src={file(src)} t={group.shots[i].t} d={group.shots[i].d} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="gallery__note">{t.note}</p>
      </div>
    </section>
  );
}
