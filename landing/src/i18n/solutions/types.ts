/** Keyword landing pages ("solutions"): one per search intent, in every locale. */
export const SOLUTION_SLUGS = [
  'logiciel-facturation-maroc',
  'logiciel-gestion-stock-maroc',
  'logiciel-caisse-maroc',
  'logiciel-gestion-livraison-maroc',
  'logiciel-distribution-grossiste-maroc',
] as const;

export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

export const isSolutionSlug = (s: string): s is SolutionSlug => (SOLUTION_SLUGS as readonly string[]).includes(s);

/** Back-office capture shown in the hero (see public/screens). */
export const SOLUTION_SHOTS: Record<SolutionSlug, string> = {
  'logiciel-facturation-maroc': 'bo-invoices',
  'logiciel-gestion-stock-maroc': 'bo-dashboard',
  'logiciel-caisse-maroc': 'bo-pos',
  'logiciel-gestion-livraison-maroc': 'bo-orders',
  'logiciel-distribution-grossiste-maroc': 'bo-analytics',
};

export type Item = { t: string; d: string };

export type Solution = {
  /** Short name used in links, breadcrumbs and the footer. */
  label: string;
  meta: { title: string; description: string };
  kicker: string;
  h1: string;
  lead: string;
  points: string[];
  /** Prefilled WhatsApp message for this page's buttons. */
  wa: string;
  shotAlt: string;
  pains: { title: string; lead: string; rows: [string, string][] };
  features: { title: string; lead: string; items: Item[] };
  who: { title: string; items: string[] };
  price: { t: string; d: string };
  faq: { title: string; items: { q: string; a: string }[] };
};

export type SolutionsUi = {
  home: string;
  solutions: string;
  related: string;
  seePricing: string;
  before: string;
  after: string;
  cta1: string;
  cta2: string;
};

export type SolutionsDictionary = { ui: SolutionsUi; pages: Record<SolutionSlug, Solution> };
