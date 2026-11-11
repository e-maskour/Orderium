import { CONTACT, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';
import { SOLUTION_SLUGS, type SolutionsDictionary } from '@/i18n/solutions/types';
import { LogoMark } from './icons';

type Props = {
  lang: Locale;
  t: Dictionary;
  s: SolutionsDictionary;
  wa: string;
  mail: string;
  /** Prefix for in-page anchors: '' on the home page, '/fr' or '/ar' elsewhere. */
  base?: string;
  /** Same page in the other language. */
  altHref?: string;
};

export function Footer({ lang, t, s, wa, mail, base = '', altHref }: Props) {
  const other: Locale = lang === 'ar' ? 'fr' : 'ar';
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top footer__top--4">
          <div className="footer__brand">
            <a className="brand" href={base ? base : '#top'} aria-label="Marnova">
              <LogoMark size={34} variant="tile" />
              <span>Marnova</span>
            </a>
            <p>{t.footer.tag}</p>
          </div>
          <nav className="footer__col" aria-label={t.footer.product}>
            <p>{t.footer.product}</p>
            <a href={`${base}#features`}>{t.nav.features}</a>
            <a href={`${base}#apps`}>{t.nav.apps}</a>
            <a href={`${base}#morocco`}>{t.nav.morocco}</a>
            <a href={`${base}#pricing`}>{t.nav.pricing}</a>
            <a href={`${base}#faq`}>{t.nav.faq}</a>
          </nav>
          <nav className="footer__col" aria-label={s.ui.solutions}>
            <p>{s.ui.solutions}</p>
            {SOLUTION_SLUGS.map((slug) => (
              <a key={slug} href={`/${lang}/${slug}`}>{s.pages[slug].label}</a>
            ))}
          </nav>
          <div className="footer__col">
            <p>{t.footer.contact}</p>
            <a href={wa} target="_blank" rel="noopener" dir="ltr">{CONTACT.whatsappDisplay}</a>
            <a href={mail} dir="ltr">{CONTACT.email}</a>
            <a href={altHref ?? `/${other}`} hrefLang={other}>{t.nav.otherLang}</a>
          </div>
        </div>
        <p className="wordmark" aria-hidden="true" data-scrub="wordmark" dir="ltr">
          {'Marnova'.split('').map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </p>
        <div className="footer__bottom">
          <p>© 2026 Marnova. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
