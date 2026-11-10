import { CONTACT, SITE_URL } from '@/i18n/config';
import { fr, type Dictionary } from '@/i18n/dictionaries/fr';
import { ar } from '@/i18n/dictionaries/ar';
import { PLANS, TRIAL_DAYS, fmt, yearlyPerMonth } from '@/lib/plans';

const clean = (s: string) => s.replace(/[⁦-⁩]/g, '').replace(/ /g, ' ');

/** Short, link-oriented summary following the llms.txt convention. */
export function llmsSummary(): string {
  return `# Marnova

> ${clean(fr.meta.description)}

Marnova is a cloud ERP (business management software) for small and medium-sized businesses in Morocco. It is fully bilingual: French and Arabic (right-to-left). It runs in the browser; nothing to install.

## Key facts
- Product type: multi-tenant SaaS ERP, web-based (desktop, tablet, mobile)
- Market: Morocco (SMEs: wholesale/distribution, retail, manufacturing, food service, services)
- Languages: French, Arabic
- Currency and formats: Moroccan dirham (MAD), French number and date formats
- Compliance: invoices carry ICE, IF, RC (and CNSS) identifiers, VAT (TVA) breakdown, sequential numbering, PDF export
- Pricing: published plans in MAD excluding VAT (HT), monthly or yearly (yearly = 10 months, 2 months free); ${TRIAL_DAYS}-day free trial, no credit card. See Pricing below
- Contact (sales and demos): WhatsApp ${CONTACT.whatsappDisplay} (https://wa.me/${CONTACT.whatsapp}), email ${CONTACT.email}

## Pricing (MAD, excl. 20% VAT)
${PLANS.map((p) => {
  const lim = (n: number) => (n === -1 ? 'unlimited' : String(n));
  const feats = [p.pos && 'point of sale', p.clientPortal && 'customer portal', p.reports && 'advanced reports'].filter(Boolean).join(', ');
  return `- ${fr.pricing.plans[p.key].name}: ${p.fromPrice ? 'from ' : ''}${p.priceMonthly} MAD/month or ${p.priceYearly} MAD/year; users ${lim(p.users)}, warehouses ${lim(p.warehouses)}, products ${lim(p.products)}, delivery drivers ${p.delivery ? lim(p.deliveryPersons) : 'none'}, storage ${p.storageGb} GB${feats ? `; includes ${feats}` : ''}${p.fromPrice ? ' (on quote)' : ''}`;
}).join('\n')}
- Free trial: ${TRIAL_DAYS} days, no credit card, Business features for 3 users
- Add-ons on request: ${fr.pricing.addons.items.map((a) => `${a.t} (${a.p})`).map(clean).join('; ')}

## Modules
- Sales and purchasing: quotes, purchase/sales orders, delivery notes, invoices; one-click conversion between documents; configurable numbering
- Inventory: real-time stock across multiple warehouses, adjustments with reasons, units of measure
- Payments: partial payments, multiple payment methods, payment terms, outstanding balance per invoice
- Point of sale: counter checkout with thermal ticket printing
- Delivery: assign deliveries to drivers, live status from a mobile delivery portal
- Customer portal: customers browse the catalogue, order online, track orders and invoices
- Reports: sales, purchases, customers, suppliers, stock and payments
- Roles and permissions, real-time notifications, document and file storage

## Pages
- [Marnova (Français)](${SITE_URL}/fr): main landing page in French
- [مارنوفا (العربية)](${SITE_URL}/ar): main landing page in Arabic
- [Full content for LLMs](${SITE_URL}/llms-full.txt): complete page text in both languages, including FAQ

## Optional
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}

function section(t: Dictionary, lang: 'fr' | 'ar'): string {
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l.map(clean));
  push(`# ${t.meta.title}`, '', `URL: ${SITE_URL}/${lang}`, '', t.meta.description, '');
  push(`## ${t.hero.title}`, '', t.hero.lead, '', t.hero.note, '');
  push(`## ${t.swap.title}`, '', t.swap.lead, '');
  for (const [b, a] of t.swap.rows) push(`- ${t.swap.before}: ${b} → ${t.swap.after}: ${a}`);
  push('', `## ${t.features.title}`, '', t.features.lead, '');
  const f = t.features;
  for (const m of [f.sales, f.stock, f.pay, f.pos, f.delivery, f.reports, ...f.small]) push(`### ${m.t}`, '', m.d, '');
  push(`## ${t.apps.title}`, '', t.apps.lead, '');
  t.apps.panels.forEach((p) => { push(`### ${p.t}`, ''); p.items.forEach((i) => push(`- ${i}`)); push(''); });
  push(`## ${t.morocco.title}`, '', t.morocco.lead, '');
  for (const s of t.morocco.specs) push(`- **${s.t}**: ${s.d}`);
  push('', `## ${t.steps.title}`, '');
  t.steps.items.forEach((s, i) => push(`${i + 1}. **${s.t}**: ${s.d}`));
  push('', `## ${t.pricing.title}`, '', t.pricing.lead, '');
  const p = t.pricing;
  for (const plan of PLANS) {
    const c = p.plans[plan.key];
    const price = `${plan.fromPrice ? `${p.from} ` : ''}${fmt(plan.priceMonthly)} ${p.currency} ${p.perMonth}`;
    push(`### ${c.name} — ${price}`, '', c.for, '', `- ${p.orYearly.replace('{y}', fmt(plan.priceYearly))} (${p.yearlyEq.replace('{m}', fmt(yearlyPerMonth(plan)))})`, '');
  }
  push(`- ${p.trial.t}: ${p.trial.d}`, `- ${p.addons.title}: ${p.addons.items.map((a) => `${a.t} (${a.p})`).join('; ')}`, `- ${p.vat}`);
  push('', `## ${t.faq.title}`, '');
  for (const q of t.faq.items) push(`### ${q.q}`, '', q.a, '');
  push(`## ${t.contact.title}`, '', `- WhatsApp: ${CONTACT.whatsappDisplay} — https://wa.me/${CONTACT.whatsapp}`, `- Email: ${CONTACT.email}`, '');
  return lines.join('\n');
}

export function llmsFull(): string {
  return `${llmsSummary()}\n---\n\n${section(fr, 'fr')}\n---\n\n${section(ar, 'ar')}`;
}
