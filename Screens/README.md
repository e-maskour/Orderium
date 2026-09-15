# Screens — Morocom Backoffice UI tour

Captured from `http://demo-admin.localhost:3001` (tenant `demo`, user `0666473116`).

## Layout

    Screens/<language>/<viewport>/NN-<page>.png

| Language | Viewports |
|---|---|
| `fr` (French, LTR) | `desktop` 1440x900 · `tablet` 834x1112 · `mobile` 390x844 |
| `ar` (Arabic, RTL) | `desktop` 1440x900 · `tablet` 834x1112 · `mobile` 390x844 |

81 pages per combination, 486 files total. All shots are full-page
(`fullPage: true`) at 2x (3x on mobile).

`00-login.png` is the logged-out login page; `01`–`80` follow the
navigation order below.

## Coverage

- Core: dashboard, POS, caisse, orders, client requests
- Catalogue: products (+create), categories, brands
- Partners: customers, suppliers (+create forms)
- Sales docs: devis, bons de livraison, factures vente, paiements vente
- Purchase docs: demande de prix, bon d'achat, factures achat, paiements achat
- Inventory: warehouses, stock movements, inventory adjustments
- Ops: delivery persons, drive, notifications
- Admin: users, roles, profile, settings, 10 configuration pages
- Analytics: 33 report pages (sales, products, stock, clients,
  suppliers, purchases, invoices, payments)

## Note on capture

Each page fires ~16 API calls and the dev API throttles at 60 req/min per IP
(`api/src/app.module.ts`). Exceeding it makes `GET /api/access/me` return 429,
and the frontend fails closed (`AuthContext.refreshAccess` sets empty
permissions), so every gated route renders "Accès non autorisé".

These screenshots were taken with the limit temporarily raised; the limit has
since been restored to 60. Every page was text-verified at capture time to
confirm it was not the 403 screen.
