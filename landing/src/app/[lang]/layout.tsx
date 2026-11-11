import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Readex_Pro } from 'next/font/google';
import { dirOf, isLocale, locales, ogLocale, SITE_URL } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import '../globals.css';
import { motionBootScript } from '@/components/Motion';
import { Analytics } from '@/components/Analytics';

const readex = Readex_Pro({
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  // 'optional' + preload: no late font swap repainting the hero text (better LCP/CLS).
  display: 'optional',
  variable: '--font-readex',
  fallback: ['system-ui', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
});

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: '#2747D9',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    keywords: t.meta.keywords,
    applicationName: 'Marnova',
    alternates: {
      canonical: `/${lang}`,
      languages: { fr: '/fr', ar: '/ar', 'x-default': '/fr' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Marnova',
      url: `/${lang}`,
      title: t.meta.title,
      description: t.meta.description,
      locale: ogLocale[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocale[l]),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: t.meta.ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    formatDetection: { telephone: false, email: false, address: false },
    category: 'business',
    // Optional search-console ownership tags (DNS TXT verification needs none of this).
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : undefined,
    },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} dir={dirOf(lang)} className={readex.variable} suppressHydrationWarning>
      <body>
        {/* Must run before the page paints; it only toggles classes on <html>. */}
        <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
        {children}
        <Analytics lang={lang} />
      </body>
    </html>
  );
}
