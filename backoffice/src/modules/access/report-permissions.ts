/**
 * The reporting modules' view keys.
 *
 * Kept as a literal list rather than derived from `GET /access/modules`,
 * because the sidebar has to decide whether to show the Analytics entry during
 * the first render, before the registry has been fetched. It mirrors the
 * `reporting` category in `api/src/common/access/access-modules.ts`.
 */
export const REPORT_VIEW_PERMISSIONS: string[] = [
  'reports_sales.view',
  'reports_purchases.view',
  'reports_invoices.view',
  'reports_payments.view',
  'reports_clients.view',
  'reports_suppliers.view',
  'reports_products.view',
  'reports_stock.view',
];

export const REPORT_EXPORT_PERMISSIONS = REPORT_VIEW_PERMISSIONS.map((key) =>
  key.replace(/\.view$/, '.export'),
);
