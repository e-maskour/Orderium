/**
 * First-touch attribution: where the visitor came from the first time
 * (UTM tags, referrer, landing page). Sent with the lead so the dashboard
 * shows which campaign or site brought it.
 */
const KEY = 'mv_attribution';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPath?: string;
}

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof Attribution;

/** Records the visit's source unless one is already stored (a new UTM visit replaces it). */
export function captureAttribution(): void {
  try {
    const url = new URL(window.location.href);
    const hasUtm = UTM.some((k) => url.searchParams.get(k));
    if (localStorage.getItem(KEY) && !hasUtm) return;

    const ref = document.referrer && !document.referrer.startsWith(window.location.origin)
      ? document.referrer.slice(0, 500)
      : undefined;
    const data: Attribution = { referrer: ref, landingPath: `${url.pathname}${url.search}`.slice(0, 300) };
    for (const k of UTM) {
      const v = url.searchParams.get(k);
      if (v) data[camel(k)] = v.slice(0, 160);
    }
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: attribution is best-effort */
  }
}

export function getAttribution(): Attribution {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Attribution;
  } catch {
    return {};
  }
}
