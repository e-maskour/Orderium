/**
 * Frontend routes for opening a single record of another module.
 * Keep in sync with the `:id` routes declared in App.tsx.
 */
export type Direction = 'vente' | 'achat';

export const entityRoutes = {
  order: (id: number | string) => `/orders/${id}`,
  product: (id: number | string) => `/products/${id}`,
  customer: (id: number | string) => `/customers/${id}`,
  supplier: (id: number | string) => `/fournisseurs/${id}`,
  /** Customer for sales documents, supplier for purchase documents. */
  partner: (id: number | string, direction: Direction = 'vente') =>
    direction === 'achat' ? `/fournisseurs/${id}` : `/customers/${id}`,
  invoice: (id: number | string, direction: Direction = 'vente') => `/factures/${direction}/${id}`,
  quote: (id: number | string, direction: Direction = 'vente') =>
    direction === 'achat' ? `/demande-prix/${id}` : `/devis/${id}`,
} as const;

/** Router state written by RefLink so the target page can offer "Retour à …". */
export interface ReturnToState {
  from?: { path: string; label: string };
}
