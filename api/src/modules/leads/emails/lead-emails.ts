import type { Lead } from '../entities/lead.entity';
import { LOGO_HEIGHT, LOGO_PNG_BASE64, LOGO_WIDTH } from './logo';

/**
 * Branded transactional e-mails for landing-page leads.
 *
 * Built for e-mail clients, not browsers: table layout, inline styles, no web
 * fonts, no SVG, 600px max width, and a logo sent as an inline (CID) image.
 * Colors follow the landing design system (night navy, Majorelle blue,
 * saffron, zellige green).
 */

export const BRAND = {
  night: '#040B24',
  night2: '#0F2160',
  blue: '#2F6BFF',
  blueDeep: '#1D4ED8',
  blue50: '#EEF3FF',
  saffron: '#F5B544',
  green: '#12A57D',
  green50: '#E3F5EE',
  ink: '#0B1533',
  ink2: '#3B4769',
  ink3: '#6B7592',
  paper: '#F4F6FB',
  line: '#E1E5F0',
  whatsapp: '#25D366',
} as const;

export interface LeadEmailLinks {
  /** Public site, e.g. https://mar-nova.com */
  siteUrl: string;
  /** Tenant dashboard leads page, e.g. https://tenants.mar-nova.com/leads */
  dashboardUrl: string;
  /** Marnova WhatsApp number in international digits, e.g. 212666473116 */
  whatsapp: string;
  /** Same number formatted for people. */
  whatsappDisplay: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
    cid: string;
  }[];
}

const LOGO_CID = 'marnova-logo@mar-nova.com';

const logoAttachment = () => ({
  filename: 'marnova.png',
  content: Buffer.from(LOGO_PNG_BASE64, 'base64'),
  contentType: 'image/png',
  cid: LOGO_CID,
});

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

/** Escapes, then keeps the visitor's line breaks. */
const multiline = (s: string) => escapeHtml(s).replace(/\r?\n/g, '<br>');

/** Moroccan local numbers (06…, 07…, 05…) → international digits. */
export function intlDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return `212${d.slice(1)}`;
  return d;
}

const waUrl = (digits: string, text?: string) =>
  `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// ─── Layout pieces ──────────────────────────────────────────────────────────

interface ShellOptions {
  lang: 'fr' | 'ar';
  preheader: string;
  body: string;
  footer: string;
}

function shell({ lang, preheader, body, footer }: ShellOptions): string {
  const rtl = lang === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const font = rtl
    ? "Tahoma, 'Segoe UI', Arial, sans-serif"
    : "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Marnova</title>
<style>
  body { margin:0; padding:0; }
  a { color:${BRAND.blueDeep}; }
  @media (max-width: 620px) {
    .container { width:100% !important; }
    .px { padding-left:24px !important; padding-right:24px !important; }
    .stack td.col { display:block !important; width:100% !important; padding:0 0 10px 0 !important; }
    .h1 { font-size:24px !important; line-height:32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.paper};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:600px;max-width:600px;font-family:${font};">
    <tr><td style="background:${BRAND.night};background-image:linear-gradient(135deg,${BRAND.night} 0%,${BRAND.night2} 100%);border-radius:18px 18px 0 0;padding:28px 40px;" class="px" align="${rtl ? 'right' : 'left'}">
      <img src="cid:${LOGO_CID}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="Marnova" style="display:block;border:0;outline:none;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;color:#FFFFFF;font-size:22px;font-weight:700;">
    </td></tr>
    <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue} 0%,${BRAND.blueDeep} 60%,${BRAND.saffron} 100%);">&nbsp;</td></tr>
    <tr><td class="px" style="background:#FFFFFF;padding:40px 40px 36px;border-left:1px solid ${BRAND.line};border-right:1px solid ${BRAND.line};" align="${rtl ? 'right' : 'left'}">
      ${body}
    </td></tr>
    <tr><td class="px" style="background:#FFFFFF;border:1px solid ${BRAND.line};border-top:0;border-radius:0 0 18px 18px;padding:0 40px 32px;" align="${rtl ? 'right' : 'left'}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${BRAND.line};padding-top:22px;font-size:13px;line-height:20px;color:${BRAND.ink3};">
        ${footer}
      </td></tr></table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function button(
  href: string,
  label: string,
  color: string,
  textColor = '#FFFFFF',
) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr>
<td style="border-radius:12px;background:${color};" bgcolor="${color}">
<a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:15px;line-height:20px;font-weight:700;color:${textColor};text-decoration:none;border-radius:12px;white-space:nowrap;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function detailsTable(rows: [string, string][], rtl = false): string {
  const align = rtl ? 'right' : 'left';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.paper};border:1px solid ${BRAND.line};border-radius:14px;">
${rows
  .map(
    ([k, v], i) => `<tr>
  <td valign="top" align="${align}" style="padding:14px 20px;${i ? `border-top:1px solid ${BRAND.line};` : ''}width:34%;font-size:13px;line-height:20px;color:${BRAND.ink3};">${escapeHtml(k)}</td>
  <td valign="top" align="${align}" style="padding:14px 20px;${i ? `border-top:1px solid ${BRAND.line};` : ''}font-size:15px;line-height:22px;color:${BRAND.ink};font-weight:600;">${v}</td>
</tr>`,
  )
  .join('')}
</table>`;
}

const kicker = (label: string, color: string, bg: string) =>
  `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${bg};color:${color};font-size:12px;line-height:16px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">${escapeHtml(label)}</span>`;

// ─── Team notification ──────────────────────────────────────────────────────

/** Sent to the Marnova team for every new lead (French). */
export function renderTeamNotification(
  lead: Lead,
  links: LeadEmailLinks,
): RenderedEmail {
  const phoneDigits = intlDigits(lead.phone);
  const source =
    [lead.utmSource, lead.utmMedium, lead.utmCampaign]
      .filter(Boolean)
      .join(' / ') || lead.referrer;

  const rows: [string, string][] = [
    ['Nom', escapeHtml(lead.name)],
    ...(lead.company
      ? ([['Entreprise', escapeHtml(lead.company)]] as [string, string][])
      : []),
    [
      'Téléphone',
      `<a href="tel:+${phoneDigits}" style="color:${BRAND.blueDeep};text-decoration:none;">${escapeHtml(lead.phone)}</a>`,
    ],
    ...(lead.email
      ? ([
          [
            'E-mail',
            `<a href="mailto:${escapeHtml(lead.email)}" style="color:${BRAND.blueDeep};text-decoration:none;">${escapeHtml(lead.email)}</a>`,
          ],
        ] as [string, string][])
      : []),
    ...(lead.activity
      ? ([['Activité', escapeHtml(lead.activity)]] as [string, string][])
      : []),
    ['Langue', lead.locale === 'ar' ? 'Arabe' : 'Français'],
    ['Canal choisi', lead.channel === 'email' ? 'E-mail' : 'WhatsApp'],
    ...(source ? ([['Source', escapeHtml(source)]] as [string, string][]) : []),
  ];

  const greeting =
    lead.locale === 'ar'
      ? `السلام عليكم ${lead.name}، شكراً على اهتمامكم بمارنوفا.`
      : `Bonjour ${lead.name}, merci pour votre intérêt pour Marnova.`;

  const message = lead.message
    ? `<p style="margin:28px 0 8px;font-size:13px;line-height:20px;color:${BRAND.ink3};font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Son besoin</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-left:4px solid ${BRAND.blue};background:${BRAND.blue50};border-radius:0 12px 12px 0;padding:16px 20px;font-size:15px;line-height:24px;color:${BRAND.ink};">${multiline(lead.message)}</td>
</tr></table>`
    : '';

  const body = `
${kicker('Nouveau lead', BRAND.blueDeep, BRAND.blue50)}
<h1 class="h1" style="margin:18px 0 8px;font-size:28px;line-height:36px;color:${BRAND.ink};font-weight:800;">${escapeHtml(lead.name)}${lead.company ? `<span style="color:${BRAND.ink3};font-weight:600;"> · ${escapeHtml(lead.company)}</span>` : ''}</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:24px;color:${BRAND.ink2};">Une nouvelle demande vient d’arriver depuis le formulaire de contact du site. Elle est aussi enregistrée dans le tableau de bord.</p>
${detailsTable(rows)}
${message}
<table role="presentation" class="stack" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
  <td class="col" style="padding-right:10px;">${button(waUrl(phoneDigits, greeting), 'WhatsApp', BRAND.whatsapp, BRAND.night)}</td>
  ${lead.email ? `<td class="col" style="padding-right:10px;">${button(`mailto:${lead.email}?subject=${encodeURIComponent('Votre demande Marnova')}`, 'Répondre par e-mail', BRAND.blue)}</td>` : ''}
  <td class="col">${button(links.dashboardUrl, 'Tableau de bord', BRAND.night)}</td>
</tr></table>`;

  const footer = `Lead #${lead.id} · reçu le ${(lead.createdAt ?? new Date()).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca', dateStyle: 'long', timeStyle: 'short' })} (heure du Maroc).<br>
${lead.email ? 'Répondez directement à cet e-mail pour écrire au prospect.' : 'Le prospect n’a pas laissé d’e-mail : contactez-le par téléphone ou WhatsApp.'}`;

  const text = [
    'Nouveau lead depuis le site Marnova',
    '',
    ...rows.map(
      ([k, v]) => `${k} : ${v.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')}`,
    ),
    ...(lead.message ? ['', 'Besoin :', lead.message] : []),
    '',
    `WhatsApp : ${waUrl(phoneDigits)}`,
    `Tableau de bord : ${links.dashboardUrl}`,
  ].join('\n');

  return {
    subject: `Nouveau lead : ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
    html: shell({
      lang: 'fr',
      preheader: `${lead.name}${lead.company ? `, ${lead.company}` : ''} · ${lead.phone}${lead.activity ? ` · ${lead.activity}` : ''}`,
      body,
      footer,
    }),
    text,
    attachments: [logoAttachment()],
  };
}

// ─── Visitor confirmation ───────────────────────────────────────────────────

const COPY = {
  fr: {
    subject: 'Nous avons bien reçu votre demande · Marnova',
    preheader: 'Merci ! Un conseiller Marnova vous contacte sous 24 h ouvrées.',
    kicker: 'Demande reçue',
    title: (name: string) => `Merci ${name}, votre demande est bien arrivée.`,
    intro:
      'Nous avons bien reçu votre message. Un conseiller Marnova l’étudie et revient vers vous très vite pour comprendre votre activité et vous montrer le logiciel sur vos propres besoins.',
    stepsTitle: 'La suite',
    steps: [
      ['Nous lisons votre demande', 'Aujourd’hui même.'],
      [
        'Nous vous appelons',
        'Sous 24 h ouvrées, au numéro que vous nous avez laissé.',
      ],
      [
        'Démo et essai gratuit',
        '14 jours pour tester Marnova, sans carte bancaire.',
      ],
    ],
    recapTitle: 'Récapitulatif de votre demande',
    labels: {
      name: 'Nom',
      company: 'Entreprise',
      phone: 'Téléphone',
      activity: 'Activité',
      message: 'Votre besoin',
    },
    urgent: 'Une question urgente ? Écrivez-nous directement sur WhatsApp.',
    waButton: 'Nous écrire sur WhatsApp',
    waText: 'Bonjour, je viens d’envoyer une demande depuis le site Marnova.',
    siteButton: 'Découvrir Marnova',
    signoff: 'À très vite,',
    team: 'L’équipe Marnova',
    footer: (site: string, wa: string) =>
      `Marnova · Logiciel de facturation et de gestion pour les entreprises marocaines.<br>
<a href="${site}" style="color:${BRAND.ink3};">${site.replace(/^https?:\/\//, '')}</a> · WhatsApp <span dir="ltr" style="direction:ltr;unicode-bidi:embed;white-space:nowrap;">${wa}</span><br>
Vous recevez cet e-mail car vous avez rempli le formulaire de contact sur notre site.`,
  },
  ar: {
    subject: 'توصلنا بطلبك · مارنوفا',
    preheader: 'شكراً! سيتصل بك أحد مستشاري مارنوفا خلال 24 ساعة عمل.',
    kicker: 'تم استلام الطلب',
    title: (name: string) => `شكراً ${name}، لقد توصلنا بطلبك.`,
    intro:
      'توصلنا برسالتك وسيدرسها أحد مستشاري مارنوفا ويعود إليك قريباً جداً لفهم نشاطك وعرض البرنامج حسب احتياجاتك.',
    stepsTitle: 'الخطوات التالية',
    steps: [
      ['نقرأ طلبك', 'اليوم نفسه.'],
      ['نتصل بك', 'خلال 24 ساعة عمل، على الرقم الذي تركته لنا.'],
      ['عرض تجريبي وتجربة مجانية', '14 يوماً لتجربة مارنوفا، دون بطاقة بنكية.'],
    ],
    recapTitle: 'ملخص طلبك',
    labels: {
      name: 'الاسم',
      company: 'المقاولة',
      phone: 'الهاتف',
      activity: 'النشاط',
      message: 'حاجتك',
    },
    urgent: 'سؤال مستعجل؟ راسلنا مباشرة عبر واتساب.',
    waButton: 'راسلنا عبر واتساب',
    waText: 'السلام عليكم، أرسلت للتو طلباً من موقع مارنوفا.',
    siteButton: 'اكتشف مارنوفا',
    signoff: 'إلى اللقاء قريباً،',
    team: 'فريق مارنوفا',
    footer: (site: string, wa: string) =>
      `مارنوفا · برنامج الفواتير والتسيير للمقاولات المغربية.<br>
<a href="${site}" style="color:${BRAND.ink3};">${site.replace(/^https?:\/\//, '')}</a> · واتساب <span dir="ltr" style="direction:ltr;unicode-bidi:embed;white-space:nowrap;">${wa}</span><br>
تتوصل بهذه الرسالة لأنك ملأت استمارة الاتصال على موقعنا.`,
  },
} as const;

/** Sent to the visitor right after they submit the form (their language). */
export function renderLeadConfirmation(
  lead: Lead,
  links: LeadEmailLinks,
): RenderedEmail {
  const lang = lead.locale === 'ar' ? 'ar' : 'fr';
  const rtl = lang === 'ar';
  const c = COPY[lang];
  const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;
  const align = rtl ? 'right' : 'left';

  const rows: [string, string][] = [
    [c.labels.name, escapeHtml(lead.name)],
    ...(lead.company
      ? ([[c.labels.company, escapeHtml(lead.company)]] as [string, string][])
      : []),
    [
      c.labels.phone,
      `<span dir="ltr" style="direction:ltr;unicode-bidi:embed;white-space:nowrap;">${escapeHtml(lead.phone)}</span>`,
    ],
    ...(lead.activity
      ? ([[c.labels.activity, escapeHtml(lead.activity)]] as [string, string][])
      : []),
    ...(lead.message
      ? ([[c.labels.message, multiline(lead.message)]] as [string, string][])
      : []),
  ];

  const steps = c.steps
    .map(
      ([t, d], i) => `<tr>
  <td valign="top" width="46" style="padding:0 ${rtl ? '0' : '14px'} 14px ${rtl ? '14px' : '0'};">
    <div style="width:32px;height:32px;line-height:32px;border-radius:999px;background:${i === 2 ? BRAND.green50 : BRAND.blue50};color:${i === 2 ? BRAND.green : BRAND.blueDeep};font-size:14px;font-weight:800;text-align:center;">${i + 1}</div>
  </td>
  <td valign="top" align="${align}" style="padding:0 0 14px;">
    <p style="margin:4px 0 2px;font-size:15px;line-height:22px;color:${BRAND.ink};font-weight:700;">${escapeHtml(t)}</p>
    <p style="margin:0;font-size:14px;line-height:21px;color:${BRAND.ink2};">${escapeHtml(d)}</p>
  </td>
</tr>`,
    )
    .join('');

  const body = `
${kicker(c.kicker, BRAND.green, BRAND.green50)}
<h1 class="h1" style="margin:18px 0 12px;font-size:28px;line-height:36px;color:${BRAND.ink};font-weight:800;">${escapeHtml(c.title(firstName))}</h1>
<p style="margin:0 0 30px;font-size:16px;line-height:26px;color:${BRAND.ink2};">${escapeHtml(c.intro)}</p>

<p style="margin:0 0 14px;font-size:13px;line-height:20px;color:${BRAND.ink3};font-weight:700;letter-spacing:.4px;${rtl ? '' : 'text-transform:uppercase;'}">${escapeHtml(c.stepsTitle)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${rtl ? 'rtl' : 'ltr'}">${steps}</table>

<p style="margin:22px 0 14px;font-size:13px;line-height:20px;color:${BRAND.ink3};font-weight:700;letter-spacing:.4px;${rtl ? '' : 'text-transform:uppercase;'}">${escapeHtml(c.recapTitle)}</p>
${detailsTable(rows, rtl)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;"><tr>
<td align="${align}" style="background:${BRAND.night};background-image:linear-gradient(135deg,${BRAND.night} 0%,${BRAND.night2} 100%);border-radius:16px;padding:24px;">
  <p style="margin:0 0 16px;font-size:15px;line-height:23px;color:#FFFFFF;font-weight:600;">${escapeHtml(c.urgent)}</p>
  <table role="presentation" class="stack" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="col" style="padding-${rtl ? 'left' : 'right'}:10px;">${button(waUrl(links.whatsapp, c.waText), c.waButton, BRAND.whatsapp, BRAND.night)}</td>
    <td class="col">${button(links.siteUrl + (rtl ? '/ar' : ''), c.siteButton, BRAND.saffron, BRAND.night)}</td>
  </tr></table>
</td></tr></table>

<p style="margin:30px 0 0;font-size:15px;line-height:24px;color:${BRAND.ink2};">${escapeHtml(c.signoff)}<br><strong style="color:${BRAND.ink};">${escapeHtml(c.team)}</strong></p>`;

  const text = [
    c.title(firstName),
    '',
    c.intro,
    '',
    `${c.stepsTitle} :`,
    ...c.steps.map(([t, d], i) => `${i + 1}. ${t} ${d}`),
    '',
    `${c.recapTitle} :`,
    ...rows.map(([k, v]) => `${k} : ${v.replace(/<[^>]+>/g, '')}`),
    '',
    `${c.urgent} ${waUrl(links.whatsapp)}`,
    '',
    c.signoff,
    c.team,
    links.siteUrl,
  ].join('\n');

  return {
    subject: c.subject,
    html: shell({
      lang,
      preheader: c.preheader,
      body,
      footer: c.footer(links.siteUrl, links.whatsappDisplay),
    }),
    text,
    attachments: [logoAttachment()],
  };
}
