import type { MetadataRoute } from 'next';
import { locales, SITE_URL } from '@/i18n/config';
import { SOLUTION_SLUGS, type SolutionSlug } from '@/i18n/solutions/types';

/**
 * Date each page's *content* last changed (YYYY-MM-DD), sent as <lastmod>.
 *
 * Bump a date by hand only when that page's visible content really changes
 * (copy, prices, sections), not on every deploy. Search engines stop trusting
 * <lastmod> when it is always "now", and then real updates are crawled later.
 * A date covers both the French and Arabic versions of the page.
 */
const CONTENT_UPDATED: { home: string } & Record<SolutionSlug, string> = {
  home: '2026-11-11',
  'logiciel-facturation-maroc': '2026-11-11',
  'logiciel-gestion-stock-maroc': '2026-11-11',
  'logiciel-caisse-maroc': '2026-11-11',
  'logiciel-gestion-livraison-maroc': '2026-11-11',
  'logiciel-distribution-grossiste-maroc': '2026-11-11',
};

/** Every page exists in every locale; each entry lists all its language versions. */
function entry(path: string, priority: number, updated: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return locales.map((l) => ({
    url: `${SITE_URL}/${l}${path}`,
    lastModified: updated,
    changeFrequency: 'monthly',
    priority: l === 'fr' ? priority : priority - 0.1,
    alternates: { languages: { ...languages, 'x-default': `${SITE_URL}/fr${path}` } },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entry('', 1, CONTENT_UPDATED.home),
    ...SOLUTION_SLUGS.flatMap((slug) => entry(`/${slug}`, 0.8, CONTENT_UPDATED[slug])),
  ];
}
