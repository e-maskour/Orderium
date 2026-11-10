import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './i18n/config';

function preferredLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const header = req.headers.get('accept-language') ?? '';
  // Pick the first of fr/ar that appears in the visitor's ordered language list.
  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split('/')[1];
  if (isLocale(first)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === '/' ? '' : pathname}`;
  // 307 so search engines keep "/" as the x-default entry point.
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip Next internals, metadata routes and any file with an extension.
  matcher: ['/((?!_next|api|sitemap.xml|robots.txt|manifest.webmanifest|llms.txt|llms-full.txt|icon.svg|.*\\..*).*)'],
};
