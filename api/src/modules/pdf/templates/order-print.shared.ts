/**
 * Building blocks shared by the order print layouts (A5 delivery note and
 * 80mm ticket): payment status, amount in words, Code 128 barcode, icons.
 */

export type PrintLang = 'fr' | 'ar';

export type PaymentState = 'paye' | 'non_paye' | 'partiel';

export interface PaymentStatusView {
  state: PaymentState;
  label: string;
  hint: string;
  glyph: string;
  bg: string;
  fg: string;
}

/** Escapes user-provided text before it is interpolated into HTML. */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Derives the payment state from the order amounts. Computed from
 * `total - paidAmount` rather than `remainingAmount` so a stale column can't
 * print the wrong badge.
 */
export function resolvePaymentState(
  total: number,
  paidAmount: number,
): PaymentState {
  const remaining = Math.round((total - paidAmount) * 100) / 100;
  if (total <= 0 || remaining <= 0) return 'paye';
  if (paidAmount > 0) return 'partiel';
  return 'non_paye';
}

/** Badge wording that depends on the document (delivery, invoice, purchase). */
export interface PaymentHints {
  paid?: string;
  unpaid?: string;
}

export function getPaymentStatusView(
  state: PaymentState,
  lang: PrintLang,
  remainingLabel?: string,
  hints: PaymentHints = {},
): PaymentStatusView {
  const ar = lang === 'ar';
  switch (state) {
    case 'paye':
      return {
        state,
        label: ar ? 'مدفوع' : 'PAYÉ',
        hint: hints.paid ?? (ar ? 'لا شيء للتحصيل' : 'Rien à encaisser'),
        glyph: '✓',
        bg: '#1e7a3c',
        fg: '#fff',
      };
    case 'partiel':
      return {
        state,
        label: ar ? 'جزئي' : 'PARTIEL',
        hint: remainingLabel
          ? `${ar ? 'الباقي' : 'Reste'} : ${remainingLabel}`
          : ar
            ? 'الباقي للتحصيل'
            : 'Reste à encaisser',
        glyph: '½',
        bg: '#b8872b',
        fg: '#fff',
      };
    default:
      return {
        state,
        label: ar ? 'غير مدفوع' : 'NON PAYÉ',
        hint:
          hints.unpaid ??
          (ar ? 'للتحصيل عند التسليم' : 'À encaisser à la livraison'),
        glyph: '!',
        bg: '#b3261e',
        fg: '#fff',
      };
  }
}

// ─── Amount in words (French) ─────────────────────────────────────────────

const UNITS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
const TENS = [
  '',
  '',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'soixante',
  'quatre-vingt',
  'quatre-vingt',
];

/** 0–999 in French words; '' for 0. `plural` adds the final "s" of cents/vingts. */
function belowThousand(n: number, plural = true): string {
  if (n === 0) return '';
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    const s = t === 7 || t === 9 ? r + 10 : r;
    if (t === 8 && r === 0) return plural ? 'quatre-vingts' : 'quatre-vingt';
    if (s === 1 && t < 8) return `${TENS[t]}-et-un`;
    if (s === 11 && t === 7) return `${TENS[t]}-et-onze`;
    return s ? `${TENS[t]}-${UNITS[s]}` : TENS[t];
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  let w = h === 1 ? 'cent' : `${UNITS[h]} cent`;
  if (r === 0 && h > 1 && plural) w += 's';
  return r ? `${w} ${belowThousand(r, plural)}` : w;
}

function integerToFrenchWords(n: number): string {
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (billions) {
    parts.push(`${belowThousand(billions)} milliard${billions > 1 ? 's' : ''}`);
  }
  if (millions) {
    parts.push(`${belowThousand(millions)} million${millions > 1 ? 's' : ''}`);
  }
  if (thousands) {
    // "mille" is invariable and "cent"/"vingt" lose their "s" before it.
    parts.push(
      thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`,
    );
  }
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
}

/** `1630.5` → "Mille six cent trente dirhams et cinquante centimes". */
export function amountToFrenchWords(amount: number): string {
  const safe = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
  const int = Math.floor(safe);
  const cents = Math.round((safe - int) * 100);
  // "deux millions de dirhams" — round millions/billions take "de".
  const de = int >= 1_000_000 && int % 1_000_000 === 0 ? ' de' : '';
  let w = `${integerToFrenchWords(int)}${de} dirham${int > 1 ? 's' : ''}`;
  if (cents)
    w += ` et ${integerToFrenchWords(cents)} centime${cents > 1 ? 's' : ''}`;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// ─── Code 128 (set B) barcode ─────────────────────────────────────────────

const CODE128_PATTERNS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];
const CODE128_START_B = 104;
const CODE128_STOP = 106;

/**
 * Code 128 set B symbol values (start, data, checksum, stop) for `text`, or
 * null when it contains characters set B can't encode (outside ASCII 32–126).
 */
export function code128Values(text: string): number[] | null {
  if (!text || !/^[\x20-\x7e]+$/.test(text)) return null;
  const values = [CODE128_START_B];
  let sum = CODE128_START_B;
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    values.push(v);
    sum += v * (i + 1);
  }
  values.push(sum % 103, CODE128_STOP);
  return values;
}

/**
 * Renders `text` as a Code 128 barcode in inline SVG (module width in px).
 * Returns '' when the text can't be encoded so callers can simply skip it.
 */
export function renderCode128Svg(
  text: string,
  height: number,
  moduleWidth = 1,
): string {
  const values = code128Values(text);
  if (!values) return '';
  const quiet = 10;
  let x = quiet;
  const rects: string[] = [];
  for (const v of values) {
    const pattern = CODE128_PATTERNS[v];
    for (let i = 0; i < pattern.length; i++) {
      const w = Number(pattern[i]);
      if (i % 2 === 0)
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}"/>`);
      x += w;
    }
  }
  const total = x + quiet;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total * moduleWidth}" height="${height}" viewBox="0 0 ${total} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" fill="#000">${rects.join('')}</svg>`;
}

// ─── Icons (Lucide paths) ─────────────────────────────────────────────────

export function phoneIcon(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/></svg>`;
}

export function pinIcon(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
}

export const PRINT_FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Noto+Sans+Arabic:wght@400;700&display=block" rel="stylesheet">`;

export const PRINT_FONT_FAMILY = `'Atkinson Hyperlegible', 'Noto Sans Arabic', system-ui, sans-serif`;
export const PRINT_MONO_FAMILY = `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;

/** Shared view-model both order layouts are rendered from. */
export interface OrderPrintData {
  lang: PrintLang;
  title: string;
  documentNumber: string;
  date: string;
  company: {
    name: string;
    addressLine?: string;
    phone?: string;
    email?: string;
    legalLine?: string;
    logoSrc?: string;
  };
  client: {
    name: string;
    phone?: string;
    address?: string;
  };
  status: PaymentStatusView;
  items: Array<{
    name: string;
    qty: string;
    price: string;
    total: string;
    /** "5 × 15,00 DH · Remise -2,00 DH · TVA 20%" */
    sub: string;
    /** Only the line adjustments: "Remise -2,00 DH · TVA 20%" (may be ''). */
    extras: string;
  }>;
  linesLabel: string;
  unitsLabel: string;
  /** Sous-total / remise / TVA rows shown above the grand total, if any. Values include the unit. */
  breakdown: Array<{ label: string; value: string }>;
  grandTotal: string;
  totalWords?: string;
  currency: string;
}
