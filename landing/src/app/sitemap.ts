import type { MetadataRoute } from 'next';
import { locales, SITE_URL } from '@/i18n/config';
import { SOLUTION_SLUGS } from '@/i18n/solutions/types';

/** Every page exists in every locale; each entry lists all its language versions. */
function entry(path: string, priority: number): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return locales.map((l) => ({
    url: `${SITE_URL}/${l}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: l === 'fr' ? priority : priority - 0.1,
    alternates: { languages: { ...languages, 'x-default': `${SITE_URL}/fr${path}` } },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [...entry('', 1), ...SOLUTION_SLUGS.flatMap((slug) => entry(`/${slug}`, 0.8))];
}
