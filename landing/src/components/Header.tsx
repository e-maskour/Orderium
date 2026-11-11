'use client';

import { useEffect, useState } from 'react';
import { LOCALE_COOKIE, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';
import { GlobeIcon } from './icons';

type Props = {
  lang: Locale;
  t: Pick<Dictionary, 'nav' | 'a11y'>;
  /** Prefix for section anchors: '' on the home page, '/fr' or '/ar' on other pages. */
  base?: string;
  /** Same page in the other language. */
  altHref?: string;
};

const SECTIONS = ['features', 'apps', 'morocco', 'start', 'pricing', 'faq'] as const;

export function Header({ lang, t, base = '', altHref }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const other: Locale = lang === 'ar' ? 'fr' : 'ar';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const rememberLang = () => {
    document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
  };

  const links = SECTIONS.map((id) => (
    <a key={id} href={`${base}#${id}`} onClick={() => setOpen(false)}>
      {t.nav[id]}
    </a>
  ));

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`} id="top">
      <div className="wrap nav__inner">
        <a className="brand" href={base || '#top'} aria-label="Marnova">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__logo brand__logo--light" src="/logo-full-light.svg" alt="" width={218} height={54} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__logo brand__logo--dark" src="/logo-full.svg" alt="" aria-hidden="true" width={218} height={54} />
        </a>

        <nav className="nav__links" aria-label={t.a11y.nav}>
          {links}
        </nav>

        <div className="nav__actions">
          <a className="lang" href={altHref ?? `/${other}`} hrefLang={other} lang={other} onClick={rememberLang} title={t.a11y.lang}>
            <GlobeIcon />
            <span>{t.nav.otherLang}</span>
          </a>
          <a className="btn btn--primary btn--sm nav__cta" href="#contact">
            {t.nav.cta}
          </a>
          <button
            className="burger"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={t.a11y.menu}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav className="mobile-menu" id="mobile-menu" hidden={!open} aria-label={t.a11y.nav}>
        {links}
        <a className="btn btn--primary" href="#contact" onClick={() => setOpen(false)}>
          {t.nav.cta}
        </a>
      </nav>
    </header>
  );
}
