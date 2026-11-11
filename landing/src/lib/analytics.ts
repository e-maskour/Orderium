/**
 * Marketing analytics: GA4 + Meta Pixel, both optional.
 *
 * Set at build time (they are inlined into the client bundle):
 *   NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID=123456789012345
 * Without them nothing is loaded and `track()` is a no-op.
 */
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? '';
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

type Params = Record<string, string | number | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Funnel events. GA4 names follow its recommended events; the Meta mapping uses
 * standard events so they can be optimised for in Ads Manager.
 */
export type AnalyticsEvent =
  | 'generate_lead' // form submitted (the main conversion)
  | 'contact_whatsapp' // any WhatsApp link clicked
  | 'contact_email' // any mailto link clicked
  | 'contact_phone' // any tel: link clicked
  | 'select_plan' // a pricing CTA clicked
  | 'start_trial'; // the free-trial CTA clicked

const META_STANDARD: Partial<Record<AnalyticsEvent, string>> = {
  generate_lead: 'Lead',
  contact_whatsapp: 'Contact',
  contact_email: 'Contact',
  contact_phone: 'Contact',
  start_trial: 'StartTrial',
};

const clean = (p: Params) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));

export function track(event: AnalyticsEvent, params: Params = {}): void {
  if (typeof window === 'undefined') return;
  const p = clean(params);
  try {
    window.gtag?.('event', event, p);
    const std = META_STANDARD[event];
    if (std) window.fbq?.('track', std, p);
    else window.fbq?.('trackCustom', event, p);
  } catch {
    /* analytics must never break the page */
  }
}
