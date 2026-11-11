'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { GA4_ID, META_PIXEL_ID, track, type AnalyticsEvent } from '@/lib/analytics';
import { captureAttribution } from '@/lib/attribution';

/** Where on the page a click happened: section id, else its first class name. */
function zoneOf(el: Element): string {
  const section = el.closest('section, header, footer, [data-zone]');
  if (!section) return 'page';
  return (
    (section as HTMLElement).dataset.zone ||
    section.id ||
    section.className.toString().split(/\s+/).find((c) => c && c !== 'section') ||
    section.tagName.toLowerCase()
  );
}

/**
 * Loads GA4 / Meta Pixel when their IDs are configured, records first-touch
 * attribution, and tracks every WhatsApp, e-mail and phone link on the page
 * with one delegated listener (no per-button wiring).
 */
export function Analytics({ lang }: { lang: string }) {
  useEffect(() => {
    captureAttribution();

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      let event: AnalyticsEvent | null = null;
      if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) event = 'contact_whatsapp';
      else if (href.startsWith('mailto:')) event = 'contact_email';
      else if (href.startsWith('tel:')) event = 'contact_phone';
      if (!event) return;

      const zone = zoneOf(a);
      const label = (a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
      track(event, { location: zone, label, language: lang });
      // Pricing and trial buttons are also funnel steps of their own.
      if (zone === 'pricing') track(a.closest('.trial') ? 'start_trial' : 'select_plan', { label, language: lang });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [lang]);

  return (
    <>
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA4_ID}',{language:'${lang}'});`}
          </Script>
        </>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
