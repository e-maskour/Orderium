export const locales = ['fr', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const LOCALE_COOKIE = 'marnova-lang';

export const isLocale = (v: string | undefined | null): v is Locale =>
  !!v && (locales as readonly string[]).includes(v);

export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr');
export const ogLocale: Record<Locale, string> = { fr: 'fr_MA', ar: 'ar_MA' };

export const CONTACT = {
  whatsapp: '212666473116',
  whatsappDisplay: '+212 6 66 47 31 16',
  email: 'elhoucine.maskour7@gmail.com',
} as const;

/** Marnova API origin; the contact form posts leads to `${API_URL}/api/public/leads`. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Absolute site origin, used for canonical URLs, sitemap and structured data. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3100')
).replace(/\/$/, '');

export const waLink = (text: string) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
export const mailLink = (subject: string, body?: string) =>
  `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
