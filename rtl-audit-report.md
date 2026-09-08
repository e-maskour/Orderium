# Arabic / RTL Audit — Morocom Back-Office

**Date:** 2026-09-08  
**App under test:** `http://demo-admin.localhost:3001` (tenant `demo`)  
**Locale switch:** `localStorage.language = "ar"` — read by `LanguageProvider` ([backoffice/src/context/LanguageContext.tsx:6](backoffice/src/context/LanguageContext.tsx#L6)), which sets `document.documentElement.dir` at [LanguageContext.tsx:13](backoffice/src/context/LanguageContext.tsx#L13)  
**i18n library:** none — a hand-rolled `t()` over static dictionaries ([backoffice/src/lib/i18n.ts](backoffice/src/lib/i18n.ts)), locales at `backoffice/src/lib/langs/{ar_MA,fr_FR}/`  
**Method:** Playwright 1.58.2 (already vendored in `playwright/node_modules`); each route loaded in `ar` and again in `fr`, screenshotted full-page, then checked in-page by `rtl-audit/checks.js`. Layout geometry diffed between locales.  
**Audit only — no application source was modified.**

## Summary

| | Count |
|---|---|
| Route definitions in router | 98 |
| Routes visited in Arabic | 89 |
| Routes not reached | 9 |
| Interactive states exercised | 12 |
| **Distinct defects** | **379** |
| — blocker | 0 |
| — major | 110 |
| — minor | 269 |
| Hardcoded user-facing strings — high confidence | 107 |
| Hardcoded user-facing strings — possible | 233 |
| Physical CSS declarations in source | 203 |

### Headline findings

- `untranslated` — 20 hardcoded source literal(s) and 25 PrimeReact English default(s) render in Arabic mode.
- `icons-not-mirrored` — 8 directional icon(s) keep their LTR orientation under RTL.
- `icon-broken` — 57 icon(s) fail to render.
- The `ar_MA` bundle is **key-complete** — 0 keys missing against `fr_FR`. Every untranslated string below is therefore a **hardcoded literal that never reaches `t()`**, not a missing key.

## Verified user-reported defects

Reported by users and reproduced in a live Playwright run, not inferred from source or screenshots.

### UR-01 · Logout confirmation modal renders entirely in French — `blocker`

**Reproduction:** open the header user menu in Arabic → click logout → the confirm dialog appears. Script: `rtl-audit/repro-logout.js`.

**Observed** (`document.documentElement.dir = "rtl"`, menu item correctly Arabic):

| Element | Selector | Rendered text | Arabic? |
|---|---|---|---|
| Menu item | `[aria-label="User menu"]` → logout entry | `تسجيل الخروج` | yes — uses `t('logout')` |
| Dialog title | `.ord-confirm-title` | `Se déconnecter ?` | **no** |
| Cancel button | `.ord-confirm-btn--cancel` | `Annuler` | **no** |
| Confirm button | `.ord-confirm-btn` | `Se déconnecter` | **no** |

**Screenshot:** `rtl-audit/screenshots/repro.logout-modal.ar.png` (menu: `rtl-audit/screenshots/repro.logout-menu.ar.png`)

**Root cause — two independent layers, both hardcoded French:**

1. **Call site.** [backoffice/src/components/Header.tsx:988](backoffice/src/components/Header.tsx#L988) passes literals straight through, bypassing `t()`:

   ```tsx
   toastConfirm(
     'Se déconnecter ?',
     () => { logout(); navigate('/login'); },
     { variant: 'warning', confirmLabel: 'Se déconnecter' },
   );
   ```

2. **Shared defaults.** Even a call site that passes nothing still gets French, at two levels:

   - [backoffice/src/services/toast.service.ts:116-117](backoffice/src/services/toast.service.ts#L116-L117) — `confirmLabel: options?.confirmLabel ?? 'Confirmer'` and `cancelLabel: 'Annuler'`. **`cancelLabel` has no override parameter at all**, so every confirm dialog in the app shows a French "Annuler".
   - [shared/ui/src/ConfirmDialog.tsx:73-74](shared/ui/src/ConfirmDialog.tsx#L73-L74) — `confirmLabel = 'Confirmer'`, `cancelLabel = 'Annuler'` as component defaults, in the shared package used by every app in the monorepo.

**Blast radius:** `toastConfirm` has **61 call sites** outside the service itself; **19** of them pass no `confirmLabel` and fall back to `'Confirmer'`, and **all 61** get the unoverridable `'Annuler'`. This is not one modal — every confirmation dialog in the back-office is partly or wholly French in Arabic mode.

### UR-03 · Every PrimeIcon fails to render in Arabic — `blocker`

**Reported as:** "analytics page, all icons are not working in arabic lang". Confirmed and root-caused. Diagnostic: `rtl-audit/diag-analytics-icons.js`.

**Scale:** 128 icon instances across 34 routes render as tofu in Arabic. On every route where the French arm genuinely switched locale, the same page has **0** broken icons — this is strictly Arabic-specific.

| Route | Broken in AR | Broken in FR | Screenshot |
|---|---|---|---|
| `/analytics` | 39 | 0 | `rtl-audit/screenshots/analytics.ar.png` |
| `/settings/notifications` | 6 | 0 | `rtl-audit/screenshots/settings_notifications.ar.png` |
| `/analytics/sales/revenue` | 6 | 0 | `rtl-audit/screenshots/analytics_sales_revenue.ar.png` |
| `/analytics/payments/in-out` | 6 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_payments_in-out.ar.png` |
| `/analytics/sales/top-products` | 5 | 0 | `rtl-audit/screenshots/analytics_sales_top-products.ar.png` |
| `/analytics/invoices/outstanding` | 4 | 0 | `rtl-audit/screenshots/analytics_invoices_outstanding.ar.png` |
| `/analytics/stock/valuation` | 4 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_stock_valuation.ar.png` |
| `/analytics/products/performance` | 4 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_products_performance.ar.png` |
| `/analytics/sales/by-category` | 3 | 0 | `rtl-audit/screenshots/analytics_sales_by-category.ar.png` |
| `/analytics/purchases/by-period` | 3 | 0 | `rtl-audit/screenshots/analytics_purchases_by-period.ar.png` |
| `/analytics/payments/cashflow` | 3 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_payments_cashflow.ar.png` |
| `/analytics/payments/by-method` | 3 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_payments_by-method.ar.png` |
| `/analytics/stock/by-warehouse` | 3 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_stock_by-warehouse.ar.png` |
| `/users` | 2 | 0 | `rtl-audit/screenshots/users.ar.png` |
| `/analytics/sales/by-customer` | 2 | 0 | `rtl-audit/screenshots/analytics_sales_by-customer.ar.png` |
| `/analytics/sales/by-pos` | 2 | 0 | `rtl-audit/screenshots/analytics_sales_by-pos.ar.png` |
| `/analytics/purchases/top-suppliers` | 2 | 0 | `rtl-audit/screenshots/analytics_purchases_top-suppliers.ar.png` |
| `/analytics/purchases/by-product` | 2 | 0 | `rtl-audit/screenshots/analytics_purchases_by-product.ar.png` |
| `/analytics/invoices/journal-vente` | 2 | 0 | `rtl-audit/screenshots/analytics_invoices_journal-vente.ar.png` |
| `/analytics/invoices/journal-achat` | 2 | 0 | `rtl-audit/screenshots/analytics_invoices_journal-achat.ar.png` |
| `/analytics/invoices/tva` | 2 | 0 | `rtl-audit/screenshots/analytics_invoices_tva.ar.png` |
| `/analytics/clients/top` | 2 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_clients_top.ar.png` |
| `/analytics/clients/inactive` | 2 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_clients_inactive.ar.png` |
| `/analytics/clients/statement` | 2 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_clients_statement.ar.png` |
| `/analytics/suppliers/top` | 2 | _(FR arm did not switch — not comparable)_ | `rtl-audit/screenshots/analytics_suppliers_top.ar.png` |

> … 9 further affected routes in `rtl-audit/out/route-results.json`.

**Root cause —** [shared/ui/src/styles.css:203-208](shared/ui/src/styles.css#L203-L208):

```css
[dir='rtl'] body,
[lang='ar'] body,
[lang='ar'] * {                       /* <-- universal selector */
    font-family: var(--font-arabic);
    line-height: 1.75;
}
```

A PrimeIcon glyph is a Private Use Area codepoint that only exists in the `primeicons` font. PrimeIcons ships `.pi { font-family: primeicons }` to bind it. The two selectors have **identical specificity**:

| Selector | Specificity | Wins? |
|---|---|---|
| `.pi` (primeicons.css) | (0,1,0) | loses on source order |
| `[lang='ar'] *` (shared/ui) | (0,1,0) + (0,0,0) = (0,1,0) | **wins — declared later** |

With the tie broken by source order, `[lang='ar'] *` overrides the icon font on every `<i class="pi">`. The codepoint then falls through to `IBM Plex Arabic`, which has no glyph there, so the browser renders a tofu box. Verified live: the computed `font-family` on `i.pi` is `"IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif`, while `document.fonts` confirms the `primeicons` face **did** load successfully and no font request failed — the font is fine, it is simply not applied.

**Why only Arabic:** the rule is keyed on `[lang='ar']`. In French the selector does not match, `.pi` applies unopposed, and icons render.

**Why analytics is the worst-hit screen:** it is built almost entirely from PrimeIcon report cards. Screens whose icons are `lucide` SVGs (the sidebar, for instance) are unaffected — visible in the screenshot, where sidebar icons render correctly beside broken content icons.

**Beyond the back-office:** the rule lives in the shared package, imported by three apps — [backoffice/src/main.tsx:4](backoffice/src/main.tsx#L4), [client/src/main.tsx:3](client/src/main.tsx#L3), [delivery-portal/src/main.tsx:4](delivery-portal/src/main.tsx#L4). Any of them showing PrimeIcons in Arabic has the same defect. Only the back-office was in scope for this audit; the other two are **[unverified]**.

**Note on the `line-height: 1.75` in the same rule:** it is applied universally by the same selector and will also override component-level line heights throughout the Arabic UI. Not separately measured here.

### UR-02 · Bidi: trailing punctuation jumps to the wrong side — `major`

Visible in the logout-modal screenshot. The source string is `'Se déconnecter ?'` with the question mark last, but inside the RTL dialog it renders as `؟ Se déconnecter` — the `?` moves to the visual left, because a Latin run sits in an RTL container with no isolation.

**Selector:** `.ord-confirm-title`  
**Source:** [backoffice/src/components/Header.tsx:988](backoffice/src/components/Header.tsx#L988), rendered by [shared/ui/src/ConfirmDialog.tsx:162](shared/ui/src/ConfirmDialog.tsx#L162)

This is a symptom of UR-01 rather than a separate bug: translating the string removes it. It is listed separately because the same pattern will recur wherever Latin text (references, codes, emails) is placed in RTL containers without `<bdi>` or `dir` isolation.

## Defects

Grouped by category, then severity. "Routes" lists where the defect was observed; a defect on shared chrome (sidebar, header) is reported once with all affected routes.

### Untranslated strings in Arabic locale — `untranslated`

Every visible text node, `placeholder`, `title` and `aria-label` was walked on each route in Arabic mode. Strings are grouped by **root cause**, because the fix differs per group. Tenant record names (`33` strings such as "Seed Product 3", "Client A", "Boissons") are database content, not localization defects, and are excluded.

#### A. Hardcoded literals in application source — `major`

20 string(s) observed in the DOM and traced to a source line. These never pass through `t()`, so they render identically in both locales.

| String | Attribute | Source | Routes observed | Screenshot |
|---|---|---|---|---|
| `Tab ↹` | text node | `backoffice/src/components/keyboard/layouts/arabic.ts:88`<br>`backoffice/src/components/keyboard/layouts/english.ts:72`<br>`backoffice/src/components/keyboard/layouts/french.ts:85` | 7 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Keyboard layout` | `@aria-label` | `backoffice/src/components/keyboard/LanguageSwitcher.tsx:20` | 6 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Français AZERTY` | `@aria-label` | `backoffice/src/components/keyboard/LanguageSwitcher.tsx:7` | 6 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Numeric keypad` | `@aria-label` | `backoffice/src/components/keyboard/LanguageSwitcher.tsx:9` | 6 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Symbols` | `@aria-label` | `backoffice/src/components/keyboard/LanguageSwitcher.tsx:10`<br>`backoffice/src/components/keyboard/layouts/symbols.ts:3` | 6 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Tab ↹` | `@aria-label` | `backoffice/src/components/keyboard/layouts/arabic.ts:88`<br>`backoffice/src/components/keyboard/layouts/english.ts:72`<br>`backoffice/src/components/keyboard/layouts/french.ts:85` | 6 (e.g. `/onboarding`) | `rtl-audit/screenshots/onboarding.ar.png` |
| `Enterprise` | text node | `backoffice/src/DataTableTheme.css:2`<br>`backoffice/src/common/api/api-client.ts:3`<br>`backoffice/src/components/AppDataTable.tsx:2`<br>`backoffice/src/components/Sidebar.tsx:689` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `Morocom ERP` | text node | `backoffice/src/components/Sidebar.tsx:986` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `v2.0.0 PRO` | text node | `backoffice/src/components/Sidebar.tsx:989` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `Client C` | text node | `backoffice/src/common/api/api-client.ts:291` | 3 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `Search (⌘K)` | `@title` | `backoffice/src/components/Header.tsx:1066`<br>`backoffice/src/components/Header.tsx:1067` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `Search (⌘K)` | `@aria-label` | `backoffice/src/components/Header.tsx:1066`<br>`backoffice/src/components/Header.tsx:1067` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `User menu` | `@aria-label` | `backoffice/src/components/Header.tsx:1098` | 6 (e.g. `/dashboard`) | `rtl-audit/screenshots/dashboard.ar.png` |
| `Choose` | `@aria-label` | `backoffice/src/components/ImageUpload.tsx:649`<br>`backoffice/src/pages/POS.tsx:1765`<br>`backoffice/src/pages/analytics/components/ReportFilterBar.tsx:103` | 3 (e.g. `/delivery-persons`) | `rtl-audit/screenshots/delivery-persons.ar.png` |
| `Name, barcode and description` | text node | `backoffice/src/pages/ProductCreate.tsx:410` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |
| `Price shown to customers` | text node | `backoffice/src/pages/ProductCreate.tsx:489` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |
| `Purchase cost` | text node | `backoffice/src/pages/ProductCreate.tsx:629` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |
| `Settings` | text node | `backoffice/src/App.tsx:16`<br>`backoffice/src/App.tsx:17`<br>`backoffice/src/App.tsx:26`<br>`backoffice/src/App.tsx:127` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |
| `Product behavior options` | text node | `backoffice/src/pages/ProductCreate.tsx:801` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |
| `Warehouse and categories` | text node | `backoffice/src/pages/ProductCreate.tsx:883` | 1 (e.g. `/products/create`) | `rtl-audit/screenshots/products_create.ar.png` |

#### B. PrimeReact built-in English locale — `major` (single root cause)

25 string(s) emitted by PrimeReact/ApexCharts, not by application code.

**Root cause:** `PrimeReactProvider` at [backoffice/src/App.tsx:246](backoffice/src/App.tsx#L246) is given `backofficeConfig` from [backoffice/src/theme-preset.ts:55](backoffice/src/theme-preset.ts#L55), which never sets a `locale` key, and `addLocale()` from `primereact/api` is never called anywhere in `backoffice/src`. PrimeReact therefore falls back to its built-in `en` locale for every component-generated string, in both `ar` and `fr`.

| String | Attribute |
|---|---|
| `bar chart with 1 data series` | `@aria-label` |
| `First Page` | `@aria-label` |
| `Previous Page` | `@aria-label` |
| `Page 1` | `@aria-label` |
| `Next Page` | `@aria-label` |
| `Last Page` | `@aria-label` |
| `Jump to Page Dropdown` | `@aria-label` |
| `All items unselected` | `@aria-label` |
| `Row Selected 1` | `@aria-label` |
| `Row Selected 8` | `@aria-label` |
| `Row Selected 7` | `@aria-label` |
| `Row Selected 5` | `@aria-label` |
| `Row Selected 4` | `@aria-label` |
| `Row Selected 3` | `@aria-label` |
| `Row Selected 2` | `@aria-label` |
| `Row Selected 32` | `@aria-label` |
| `Row Selected 31` | `@aria-label` |
| `Row Selected 21` | `@aria-label` |
| `Row Selected 30` | `@aria-label` |
| `Row Selected 22` | `@aria-label` |
| `Row Selected 23` | `@aria-label` |
| `Row Selected 24` | `@aria-label` |
| `Row Selected 25` | `@aria-label` |
| `Row Selected 26` | `@aria-label` |
| `Row Selected 27` | `@aria-label` |

#### C. Intentional — not defects

- `Changer en français` — the language toggle names the target language in that language ([backoffice/src/components/LanguageToggle.tsx](backoffice/src/components/LanguageToggle.tsx)).
- `Changer en français` — the language toggle names the target language in that language ([backoffice/src/components/LanguageToggle.tsx](backoffice/src/components/LanguageToggle.tsx)).

### Directional icons not mirrored in RTL — `icons-not-mirrored`

8 distinct defect(s).

#### icons-not-mirrored-01 · `major`

**Defect:** Directional icon "chevron-right" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > div.hidden.lg:flex:nth-of-type(4) > button.sb-collapse-btn > span:nth-of-type(1) > svg.lucide.lucide-chevron-right`

**Icon:** `chevron-right` — classes `lucide lucide-chevron-right `

**Routes (95):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create` … +83 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### icons-not-mirrored-02 · `major`

**Defect:** Directional icon "arrow-left" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-header:nth-of-type(1) > button.p-button.p-component.p-button-icon-only > svg.lucide.lucide-arrow-left`

**Icon:** `arrow-left` — classes `lucide lucide-arrow-left `

**Routes (41):** `/configurations/taxes`, `/configurations/currencies`, `/configurations/payment-terms`, `/configurations/sequences`, `/configurations/uom`, `/configurations/printers`, `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/sales/by-customer`, `/analytics/sales/by-category`, `/analytics/sales/by-pos`, `/analytics/purchases/by-period` … +29 more

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### icons-not-mirrored-03 · `major`

**Defect:** Directional icon "arrow-left" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.doc-detail-hdr:nth-of-type(1) > button.p-button.p-component.p-button-icon-only > svg.lucide.lucide-arrow-left`

**Icon:** `arrow-left` — classes `lucide lucide-arrow-left `

**Routes (7):** `/devis/create`, `/bons-livraison/create`, `/factures/vente/create`, `/factures/achat/create`, `/demande-prix/create`, `/bon-achat/create`, `/bon-achat/:id`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### icons-not-mirrored-04 · `major`

**Defect:** Directional icon "arrow-left" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-header > button.p-button.p-component.p-button-icon-only > svg.lucide.lucide-arrow-left`

**Icon:** `arrow-left` — classes `lucide lucide-arrow-left `

**Routes (6):** `/customers/create`, `/fournisseurs/create`, `/configurations/company`, `/configurations/inventory`, `/customers/create → form-customer-create`, `/customers/create → form-customer-create-validation`

**Screenshot:** `rtl-audit/screenshots/customers_create.ar.png`

#### icons-not-mirrored-05 · `major`

**Defect:** Directional icon "arrow-left" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.prod-create-hdr > button.p-button.p-component.p-button-icon-only > svg.lucide.lucide-arrow-left`

**Icon:** `arrow-left` — classes `lucide lucide-arrow-left `

**Routes (3):** `/products/create`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`

**Screenshot:** `rtl-audit/screenshots/products_create.ar.png`

#### icons-not-mirrored-06 · `major`

**Defect:** Directional icon "rotate-ccw" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr:nth-of-type(1) > td:nth-of-type(7) > div > button.p-button.p-component.p-button-icon-only:nth-of-type(1) > svg.lucide.lucide-rotate-ccw`

**Icon:** `rotate-ccw` — classes `lucide lucide-rotate-ccw `

**Routes (1):** `/configurations/sequences`

**Screenshot:** `rtl-audit/screenshots/configurations_sequences.ar.png`

#### icons-not-mirrored-07 · `major`

**Defect:** Directional icon "arrow-left" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.prod-detail-hdr:nth-of-type(1) > button.p-button.p-component.p-button-icon-only > svg.lucide.lucide-arrow-left`

**Icon:** `arrow-left` — classes `lucide lucide-arrow-left `

**Routes (1):** `/products/:id`

**Screenshot:** `rtl-audit/screenshots/products__id.ar.png`

#### icons-not-mirrored-08 · `major`

**Defect:** Directional icon "log-out" is not mirrored in RTL (no negative scaleX on it or its ancestors)

**Selector:** `html > body > div.p-overlaypanel.p-component.p-overlaypanel-enter-done:nth-of-type(2) > div.p-overlaypanel-content > div:nth-of-type(2) > button:nth-of-type(3) > div > svg.lucide.lucide-log-out`

**Icon:** `log-out` — classes `lucide lucide-log-out `

**Routes (1):** `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/state.header-user-menu.ar.png`

### Icons failing to render — `icon-broken`

57 distinct defect(s).

#### icon-broken-01 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.erp-card.mb-3:nth-of-type(2) > div.flex.flex-column.gap-2 > div.flex.align-items-center.gap-2:nth-of-type(1) > i.pi.pi-filter.text-500`

**Routes (28):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/sales/by-customer`, `/analytics/sales/by-category`, `/analytics/sales/by-pos`, `/analytics/purchases/by-period`, `/analytics/purchases/top-suppliers`, `/analytics/purchases/by-product`, `/analytics/invoices/journal-vente`, `/analytics/invoices/journal-achat`, `/analytics/invoices/tva`, `/analytics/invoices/outstanding` … +16 more

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-02 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card > div.flex.align-items-center.justify-content-between:nth-of-type(1) > div.flex.align-items-center.gap-2 > i.pi.pi-table.text-primary`

**Routes (17):** `/analytics/sales/by-customer`, `/analytics/sales/by-pos`, `/analytics/purchases/top-suppliers`, `/analytics/purchases/by-product`, `/analytics/invoices/journal-vente`, `/analytics/invoices/journal-achat`, `/analytics/invoices/tva`, `/analytics/clients/top`, `/analytics/clients/inactive`, `/analytics/clients/statement`, `/analytics/suppliers/top`, `/analytics/suppliers/statement` … +5 more

**Screenshot:** `rtl-audit/screenshots/analytics_sales_by-customer.ar.png`

#### icon-broken-03 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card:nth-of-type(2) > div.flex.align-items-center.justify-content-between:nth-of-type(1) > div.flex.align-items-center.gap-2 > i.pi.pi-table.text-primary`

**Routes (8):** `/analytics/sales/by-category`, `/analytics/purchases/by-period`, `/analytics/invoices/outstanding`, `/analytics/payments/cashflow`, `/analytics/payments/by-method`, `/analytics/stock/valuation`, `/analytics/stock/by-warehouse`, `/analytics/products/performance`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_by-category.ar.png`

#### icon-broken-04 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(1) > div > div.flex.align-items-center.justify-content-between:nth-of-type(2) > div > i.pi.pi-chart-line.analytics-kpi__icon`

**Routes (6):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/invoices/outstanding`, `/analytics/payments/in-out`, `/analytics/stock/valuation`, `/analytics/products/performance`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-05 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(2) > div > div.flex.align-items-center.justify-content-between:nth-of-type(2) > div > i.pi.pi-shopping-bag.analytics-kpi__icon`

**Routes (6):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/invoices/outstanding`, `/analytics/payments/in-out`, `/analytics/stock/valuation`, `/analytics/products/performance`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-06 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card:nth-of-type(1) > div.flex.align-items-center.gap-2:nth-of-type(1) > i.pi.pi-chart-line.text-primary`

**Routes (5):** `/analytics/sales/by-category`, `/analytics/purchases/by-period`, `/analytics/payments/cashflow`, `/analytics/payments/by-method`, `/analytics/stock/by-warehouse`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_by-category.ar.png`

#### icon-broken-07 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card:nth-of-type(2) > div.flex.align-items-center.gap-2:nth-of-type(1) > i.pi.pi-chart-line.text-primary`

**Routes (3):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/payments/in-out`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-08 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card:nth-of-type(3) > div.flex.align-items-center.justify-content-between:nth-of-type(1) > div.flex.align-items-center.gap-2 > i.pi.pi-table.text-primary`

**Routes (3):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/payments/in-out`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-09 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div.erp-card > div.flex.align-items-center.justify-content-between:nth-of-type(1) > div.flex.align-items-center.gap-2 > i.pi.pi-table.text-primary`

**Routes (3):** `/analytics/invoices/aging`, `/analytics/clients/aging`, `/analytics/suppliers/aging`

**Screenshot:** `rtl-audit/screenshots/analytics_invoices_aging.ar.png`

#### icon-broken-10 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(3) > div > div.flex.align-items-center.justify-content-between:nth-of-type(2) > div > i.pi.pi-percentage.analytics-kpi__icon`

**Routes (2):** `/analytics/sales/revenue`, `/analytics/payments/in-out`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### icon-broken-11 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#pr_id_37_header_0 > span.p-tabview-title:nth-of-type(1) > span > i.pi.pi-shield`

**Routes (1):** `/users`

**Screenshot:** `rtl-audit/screenshots/users.ar.png`

#### icon-broken-12 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#pr_id_37_header_1 > span.p-tabview-title:nth-of-type(1) > span > i.pi.pi-users`

**Routes (1):** `/users`

**Screenshot:** `rtl-audit/screenshots/users.ar.png`

#### icon-broken-13 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(1) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-users.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-14 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(2) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-shopping-cart.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-15 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(3) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-truck.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-16 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(4) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-box.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-17 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(5) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-credit-card.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-18 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div.flex.flex-column.gap-4:nth-of-type(2) > div.surface-card.border-round.shadow-1:nth-of-type(6) > div.px-4.py-3.flex:nth-of-type(1) > i.pi.pi-cog.text-primary`

**Routes (1):** `/settings/notifications`

**Screenshot:** `rtl-audit/screenshots/settings_notifications.ar.png`

#### icon-broken-19 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-chart-line`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-20 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-21 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-22 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-23 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.p-3:nth-of-type(2) > div:nth-of-type(4) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-24 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(1) > div.p-3:nth-of-type(2) > div:nth-of-type(5) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-25 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(2) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-shopping-bag`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-26 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(2) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-27 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(2) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-28 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(2) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-29 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-file`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-30 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-31 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-32 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-33 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.p-3:nth-of-type(2) > div:nth-of-type(4) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-34 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(3) > div.p-3:nth-of-type(2) > div:nth-of-type(5) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-35 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(4) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-credit-card`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-36 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(4) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-37 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(4) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-38 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(4) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-39 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(5) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-users`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-40 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(5) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-41 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(5) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-42 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(5) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-43 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(5) > div.p-3:nth-of-type(2) > div:nth-of-type(4) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-44 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(6) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-truck`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-45 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(6) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-46 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(6) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-47 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(6) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-48 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-box`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-49 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-50 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-51 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-52 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.p-3:nth-of-type(2) > div:nth-of-type(4) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-53 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(7) > div.p-3:nth-of-type(2) > div:nth-of-type(5) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-54 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(8) > div.flex.align-items-center.gap-3:nth-of-type(1) > div > i.pi.pi-tag`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-55 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(8) > div.p-3:nth-of-type(2) > div:nth-of-type(1) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-56 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(8) > div.p-3:nth-of-type(2) > div:nth-of-type(2) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### icon-broken-57 · `major`

**Defect:** PrimeIcon element resolves to font-family ""IBM Plex Arabic", "Plus Jakarta Sans", system-ui, sans-serif" (primeicons not applied — glyph will not render)

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(2) > div:nth-of-type(8) > div.p-3:nth-of-type(2) > div:nth-of-type(3) > a > div > div.flex.align-items-center.justify-content-between > i.pi.pi-arrow-right.text-400`

**Routes (1):** `/analytics`

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

### Overflow and clipping — `overflow`

11 distinct defect(s).

#### overflow-01 · `major`

**Defect:** Horizontal overflow: scrollWidth 296 > clientWidth 282 (+14px), overflow-x:hidden

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(1) > div`

**Rendered text:** `الإيرادات309,00 MAD`

**Routes (6):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/invoices/outstanding`, `/analytics/payments/in-out`, `/analytics/stock/valuation`, `/analytics/products/performance`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### overflow-02 · `major`

**Defect:** Horizontal overflow: scrollWidth 296 > clientWidth 282 (+14px), overflow-x:hidden

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(2) > div`

**Rendered text:** `عدد الطلبات1`

**Routes (6):** `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/invoices/outstanding`, `/analytics/payments/in-out`, `/analytics/stock/valuation`, `/analytics/products/performance`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### overflow-03 · `major`

**Defect:** Horizontal overflow: scrollWidth 296 > clientWidth 282 (+14px), overflow-x:hidden

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.flex.flex-column.gap-3:nth-of-type(3) > div:nth-of-type(1) > div.grid.m-0 > div.col-12.md:col-6.lg:col-3:nth-of-type(3) > div`

**Rendered text:** `متوسط السلة309,00 MAD`

**Routes (2):** `/analytics/sales/revenue`, `/analytics/payments/in-out`

**Screenshot:** `rtl-audit/screenshots/analytics_sales_revenue.ar.png`

#### overflow-04 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-highlight.p-row-odd.ord-row-clickable:nth-of-type(4) > td:nth-of-type(2) > div > img`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### overflow-05 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-highlight.ord-row-clickable:nth-of-type(5) > td:nth-of-type(2) > div > img`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### overflow-06 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-highlight.ord-row-clickable:nth-of-type(9) > td:nth-of-type(2) > div > img`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### overflow-07 · `major`

**Defect:** Horizontal overflow: scrollWidth 495 > clientWidth 432 (+63px), overflow-x:hidden

**Selector:** `#root > div:nth-of-type(2) > div > div.login-left-panel.login-panel-left:nth-of-type(1)`

**Rendered text:** `Morocomلوحة التحكم الإداريةأدر أعمالكبكل ثقة.مجموعة متكاملة لإدارة الطلبات والمخزون والعملاء والتحليلات.التحليلات والتقا`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.ar.png`

#### overflow-08 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-row-odd.ord-row-clickable:nth-of-type(4) > td:nth-of-type(2) > div > img`

**Routes (1):** `/products`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### overflow-09 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.ord-row-clickable:nth-of-type(5) > td:nth-of-type(2) > div > img`

**Routes (1):** `/products`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### overflow-10 · `major`

**Defect:** Horizontal overflow: scrollWidth 47 > clientWidth 35 (+12px), overflow-x:clip

**Selector:** `div.prod-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.ord-row-clickable:nth-of-type(9) > td:nth-of-type(2) > div > img`

**Routes (1):** `/products`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### overflow-11 · `major`

**Defect:** Horizontal overflow: scrollWidth 166 > clientWidth 132 (+34px), overflow-x:hidden

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-header:nth-of-type(1) > div.page-header__actions:nth-of-type(4) > div > button.p-button.p-component.p-button-sm`

**Rendered text:** `إضافة معدل ضريبة`

**Routes (1):** `/configurations/taxes → modal-dialog`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

### Physical CSS properties (runtime-confirmed) — `physical-css`

194 distinct defect(s).

#### physical-css-01 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 20px

**Selector:** `#root > div.p-toast.p-component.p-toast-bottom-right:nth-of-type(1)`

**Routes (101):** `/onboarding`, `/login`, `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/pos`, `/checkout`, `/checkout/success`, `/products`, `/products/create`, `/categories` … +89 more

**Screenshot:** `rtl-audit/screenshots/onboarding.ar.png`

#### physical-css-02 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: -2px

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > div > header.flex.align-items-center.justify-content-between > div.flex.align-items-center.gap-2:nth-of-type(2) > div:nth-of-type(1) > button > span`

**Rendered text:** `2`

**Routes (96):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create` … +84 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-03 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#root > div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise`

**Rendered text:** `MorocomEnterpriseلوحة القيادةالطلباتالصندوقنقطة البيعالتحليلاتالمبيعاتعرض أسعارسند تسليمفاتورة عميلالمدفوعاتالعملاءالمشت`

**Routes (95):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create` … +83 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-04 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): padding-right: 1rem; padding-left: 1.125rem

**Selector:** `#root > div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > div:nth-of-type(1)`

**Rendered text:** `MorocomEnterprise`

**Routes (95):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create` … +83 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-05 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): margin-right: 15rem; margin-left: 0.75rem

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2)`

**Rendered text:** `2
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); `

**Routes (95):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create` … +83 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-06 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(8) > button.sb-group-btn > span:nth-of-type(2)`

**Rendered text:** `المشتريات`

**Routes (84):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/customers`, `/customers/create`, `/devis`, `/devis/create` … +72 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-07 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(7) > button.sb-group-btn > span:nth-of-type(2)`

**Rendered text:** `المبيعات`

**Routes (82):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/products`, `/products/create`, `/categories`, `/brands`, `/fournisseurs`, `/fournisseurs/create`, `/factures/achat`, `/factures/achat/create` … +70 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-08 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(9) > button.sb-group-btn > span:nth-of-type(2)`

**Rendered text:** `المخزون`

**Routes (82):** `/dashboard`, `/delivery-persons`, `/orders`, `/caisse`, `/customers`, `/customers/create`, `/fournisseurs`, `/fournisseurs/create`, `/devis`, `/devis/create`, `/bons-livraison`, `/bons-livraison/create` … +70 more

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-09 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#sb-analytics > span:nth-of-type(1)`

**Routes (32):** `/analytics`, `/analytics/sales/revenue`, `/analytics/sales/top-products`, `/analytics/sales/by-customer`, `/analytics/sales/by-category`, `/analytics/sales/by-pos`, `/analytics/purchases/by-period`, `/analytics/purchases/top-suppliers`, `/analytics/purchases/by-product`, `/analytics/invoices/journal-vente`, `/analytics/invoices/journal-achat`, `/analytics/invoices/tva` … +20 more

**Screenshot:** `rtl-audit/screenshots/analytics.ar.png`

#### physical-css-10 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(9) > button.sb-group-btn > span:nth-of-type(1)`

**Routes (13):** `/products`, `/products/create`, `/categories`, `/brands`, `/warehouses`, `/stock-movements`, `/inventory-adjustments`, `/products/:id`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`, `/products → table-sorted`, `/products → pagination` … +1 more

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### physical-css-11 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(9) > button.sb-group-btn > span:nth-of-type(3)`

**Rendered text:** `المخزون`

**Routes (13):** `/products`, `/products/create`, `/categories`, `/brands`, `/warehouses`, `/stock-movements`, `/inventory-adjustments`, `/products/:id`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`, `/products → table-sorted`, `/products → pagination` … +1 more

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### physical-css-12 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(7) > button.sb-group-btn > span:nth-of-type(1)`

**Routes (13):** `/customers`, `/customers/create`, `/devis`, `/devis/create`, `/bons-livraison`, `/bons-livraison/create`, `/bon-livraison`, `/factures/vente`, `/factures/vente/create`, `/paiements-vente`, `/customers/:id`, `/customers/create → form-customer-create` … +1 more

**Screenshot:** `rtl-audit/screenshots/customers.ar.png`

#### physical-css-13 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(7) > button.sb-group-btn > span:nth-of-type(3)`

**Rendered text:** `المبيعات`

**Routes (13):** `/customers`, `/customers/create`, `/devis`, `/devis/create`, `/bons-livraison`, `/bons-livraison/create`, `/bon-livraison`, `/factures/vente`, `/factures/vente/create`, `/paiements-vente`, `/customers/:id`, `/customers/create → form-customer-create` … +1 more

**Screenshot:** `rtl-audit/screenshots/customers.ar.png`

#### physical-css-14 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(8) > button.sb-group-btn > span:nth-of-type(1)`

**Routes (11):** `/fournisseurs`, `/fournisseurs/create`, `/factures/achat`, `/factures/achat/create`, `/paiements-achat`, `/demande-prix`, `/demande-prix/create`, `/bon-achat`, `/bon-achat/create`, `/fournisseurs/:id`, `/bon-achat/:id`

**Screenshot:** `rtl-audit/screenshots/fournisseurs.ar.png`

#### physical-css-15 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div.hidden.lg:block:nth-of-type(1) > aside.sidebar-enterprise > nav > ul > li:nth-of-type(8) > button.sb-group-btn > span:nth-of-type(3)`

**Rendered text:** `المشتريات`

**Routes (11):** `/fournisseurs`, `/fournisseurs/create`, `/factures/achat`, `/factures/achat/create`, `/paiements-achat`, `/demande-prix`, `/demande-prix/create`, `/bon-achat`, `/bon-achat/create`, `/fournisseurs/:id`, `/bon-achat/:id`

**Screenshot:** `rtl-audit/screenshots/fournisseurs.ar.png`

#### physical-css-16 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#sb-config > span:nth-of-type(1)`

**Routes (11):** `/configurations`, `/configurations/taxes`, `/configurations/currencies`, `/configurations/payment-terms`, `/configurations/sequences`, `/configurations/uom`, `/configurations/company`, `/configurations/inventory`, `/configurations/printers`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations.ar.png`

#### physical-css-17 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(9) > div > ul > li:nth-of-type(1) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (8):** `/products`, `/products/create`, `/products/:id`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`, `/products → table-sorted`, `/products → pagination`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### physical-css-18 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div:nth-of-type(2) > div:nth-of-type(2) > div.doc-notes-totals:nth-of-type(4) > div:nth-of-type(2) > div.doc-totals-outer > div > div:nth-of-type(3) > div`

**Rendered text:** `0,00د.م`

**Routes (7):** `/devis/create`, `/bons-livraison/create`, `/factures/vente/create`, `/factures/achat/create`, `/demande-prix/create`, `/bon-achat/create`, `/bon-achat/:id`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### physical-css-19 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(7) > div > ul > li:nth-of-type(5) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (5):** `/customers`, `/customers/create`, `/customers/:id`, `/customers/create → form-customer-create`, `/customers/create → form-customer-create-validation`

**Screenshot:** `rtl-audit/screenshots/customers.ar.png`

#### physical-css-20 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#sb-dashboard > span:nth-of-type(1)`

**Routes (4):** `/dashboard`, `/`, `/dashboard → mobile-drawer`, `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-21 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `main.admin-main-area > div > div:nth-of-type(5) > div:nth-of-type(2) > table > thead > tr > th:nth-of-type(1)`

**Rendered text:** `رقم`

**Routes (3):** `/dashboard`, `/`, `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-22 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `main.admin-main-area > div > div:nth-of-type(5) > div:nth-of-type(2) > table > thead > tr > th:nth-of-type(2)`

**Rendered text:** `العميل`

**Routes (3):** `/dashboard`, `/`, `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-23 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `main.admin-main-area > div > div:nth-of-type(5) > div:nth-of-type(2) > table > thead > tr > th:nth-of-type(3)`

**Rendered text:** `المبلغ`

**Routes (3):** `/dashboard`, `/`, `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-24 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `main.admin-main-area > div > div:nth-of-type(5) > div:nth-of-type(2) > table > thead > tr > th:nth-of-type(4)`

**Rendered text:** `الحالة`

**Routes (3):** `/dashboard`, `/`, `/dashboard → header-user-menu`

**Screenshot:** `rtl-audit/screenshots/dashboard.ar.png`

#### physical-css-25 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0.75rem

**Selector:** `#root > div:nth-of-type(2) > div > main > div:nth-of-type(1) > div > svg.lucide.lucide-search:nth-of-type(1)`

**Routes (3):** `/pos`, `/checkout`, `/checkout/success`

**Screenshot:** `rtl-audit/screenshots/pos.ar.png`

#### physical-css-26 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0.75rem

**Selector:** `#root > div:nth-of-type(2) > div > main > div:nth-of-type(1) > div > svg.lucide.lucide-barcode:nth-of-type(2)`

**Routes (3):** `/pos`, `/checkout`, `/checkout/success`

**Screenshot:** `rtl-audit/screenshots/pos.ar.png`

#### physical-css-27 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(8) > div > ul > li:nth-of-type(5) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (3):** `/fournisseurs`, `/fournisseurs/create`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/fournisseurs.ar.png`

#### physical-css-28 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(7) > div > ul > li:nth-of-type(2) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (3):** `/bons-livraison`, `/bons-livraison/create`, `/bon-livraison`

**Screenshot:** `rtl-audit/screenshots/bons-livraison.ar.png`

#### physical-css-29 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(8) > div > ul > li:nth-of-type(2) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (3):** `/bon-achat`, `/bon-achat/create`, `/bon-achat/:id`

**Screenshot:** `rtl-audit/screenshots/bon-achat.ar.png`

#### physical-css-30 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div > div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > thead.p-datatable-thead > tr > th:nth-of-type(4)`

**Rendered text:** `الإجراءات`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-31 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr:nth-of-type(1) > td:nth-of-type(4) > div`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-32 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-row-odd:nth-of-type(2) > td:nth-of-type(4) > div`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-33 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr:nth-of-type(3) > td:nth-of-type(4) > div`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-34 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr.p-row-odd:nth-of-type(4) > td:nth-of-type(4) > div`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-35 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: right

**Selector:** `div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-datatable-wrapper:nth-of-type(2) > table.p-datatable-table > tbody.p-datatable-tbody > tr:nth-of-type(5) > td:nth-of-type(4) > div`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### physical-css-36 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#sb-orders > span:nth-of-type(1)`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### physical-css-37 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0.875rem

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div:nth-of-type(1) > div > svg.lucide.lucide-search`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### physical-css-38 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): padding-left: 2.5rem; padding-right: 0.875rem

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### physical-css-39 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(7) > div > ul > li:nth-of-type(1) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (2):** `/devis`, `/devis/create`

**Screenshot:** `rtl-audit/screenshots/devis.ar.png`

#### physical-css-40 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(7) > div > ul > li:nth-of-type(3) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (2):** `/factures/vente`, `/factures/vente/create`

**Screenshot:** `rtl-audit/screenshots/factures_vente.ar.png`

#### physical-css-41 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(1) > div:nth-of-type(1)`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### physical-css-42 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(2) > div:nth-of-type(1)`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### physical-css-43 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(3) > div:nth-of-type(1)`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### physical-css-44 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(8) > div > ul > li:nth-of-type(3) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (2):** `/factures/achat`, `/factures/achat/create`

**Screenshot:** `rtl-audit/screenshots/factures_achat.ar.png`

#### physical-css-45 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `nav > ul > li:nth-of-type(8) > div > ul > li:nth-of-type(1) > a.sb-link.p-ripple.sb-link--active > span:nth-of-type(1)`

**Routes (2):** `/demande-prix`, `/demande-prix/create`

**Screenshot:** `rtl-audit/screenshots/demande-prix.ar.png`

#### physical-css-46 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(1) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-47 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(2) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-48 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(3) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-49 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(4) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-50 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(5) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-51 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div.kpi-sheet-desktop > div.kpi-grid-cols-3 > div.kpi-card-enterprise:nth-of-type(6) > div:nth-of-type(1)`

**Routes (2):** `/customers/:id`, `/fournisseurs/:id`

**Screenshot:** `rtl-audit/screenshots/customers__id.ar.png`

#### physical-css-52 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 31.5px

**Selector:** `html > body > div.p-overlaypanel.p-component.p-overlaypanel-enter-done:nth-of-type(2)`

**Rendered text:** `MAMASKOUR0666473116ملفي الشخصيالإعداداتتسجيل الخروج`

**Routes (2):** `/dashboard → header-user-menu`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/state.header-user-menu.ar.png`

#### physical-css-53 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 0px

**Selector:** `html > body > div.p-dialog-mask.p-dialog-center.p-component-overlay:nth-of-type(2)`

**Rendered text:** `إضافة معدل ضريبةالاسم *المعدل (%) *تعيين كمعدل ضريبة افتراضيإلغاءحفظ`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### physical-css-54 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): padding-right: 2.5rem

**Selector:** `#taxes-modal-form > div:nth-of-type(2) > span > input.p-inputtext.p-component.p-filled`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### physical-css-55 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0.75rem

**Selector:** `#taxes-modal-form > div:nth-of-type(2) > span > svg.lucide.lucide-percent`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### physical-css-56 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): text-align: left

**Selector:** `#root > div:nth-of-type(2) > div > div > div:nth-of-type(2)`

**Rendered text:** `1ملف الشركةأخبرنا عن نشاطك التجاري2حساب المديرأنشئ حساب المدير الخاص بك`

**Routes (1):** `/onboarding`

**Screenshot:** `rtl-audit/screenshots/onboarding.ar.png`

#### physical-css-57 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: -80px

**Selector:** `#root > div:nth-of-type(2) > div > div.login-left-panel.login-panel-left:nth-of-type(1) > div:nth-of-type(1)`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.ar.png`

#### physical-css-58 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: -60px

**Selector:** `#root > div:nth-of-type(2) > div > div.login-left-panel.login-panel-left:nth-of-type(1) > div:nth-of-type(2)`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.ar.png`

#### physical-css-59 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): left: 60%

**Selector:** `#root > div:nth-of-type(2) > div > div.login-left-panel.login-panel-left:nth-of-type(1) > div:nth-of-type(3)`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.ar.png`

#### physical-css-60 · `minor`

**Defect:** Authored physical CSS property (should use logical equivalent): right: 0px

**Selector:** `#sb-delivery > span:nth-of-type(1)`

**Routes (1):** `/delivery-persons`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.ar.png`

> … 134 further `physical-css` defects in `rtl-audit/out/route-results.json`.

### Form controls — `form-controls`

76 distinct defect(s).

#### form-controls-01 · `major`

**Defect:** Form control computes direction:ltr in RTL locale (type=text)

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > input.p-inputtext.p-component.p-disabled`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### form-controls-02 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (10):** `/products`, `/devis`, `/bons-livraison`, `/bon-livraison`, `/factures/vente`, `/factures/achat`, `/demande-prix`, `/bon-achat`, `/users`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-03 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (10):** `/products`, `/devis`, `/bons-livraison`, `/bon-livraison`, `/factures/vente`, `/factures/achat`, `/demande-prix`, `/bon-achat`, `/users`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-04 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div > div:nth-of-type(3) > div.responsive-table-desktop:nth-of-type(2) > div.doc-datatable.p-datatable.p-component > div.min-h-3rem.p-paginator-top.p-paginator:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (7):** `/devis`, `/bons-livraison`, `/bon-livraison`, `/factures/vente`, `/factures/achat`, `/demande-prix`, `/bon-achat`

**Screenshot:** `rtl-audit/screenshots/devis.ar.png`

#### form-controls-05 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div:nth-of-type(2) > div.doc-create-grid:nth-of-type(1) > div.doc-pbox:nth-of-type(1) > div:nth-of-type(2) > div > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `اسم العميل`

**Routes (6):** `/devis/create`, `/bons-livraison/create`, `/factures/vente/create`, `/factures/achat/create`, `/demande-prix/create`, `/bon-achat/create`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### form-controls-06 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div:nth-of-type(2) > div:nth-of-type(2) > div.doc-create-grid:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span.doc-cal.p-calendar.p-component > input.p-inputtext.p-component.p-filled`

**Routes (6):** `/devis/create`, `/bons-livraison/create`, `/factures/vente/create`, `/factures/achat/create`, `/demande-prix/create`, `/bon-achat/create`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### form-controls-07 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div:nth-of-type(2) > div:nth-of-type(2) > div.doc-create-grid:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span.doc-cal.p-calendar.p-component > input.p-inputtext.p-component.p-filled`

**Routes (6):** `/devis/create`, `/bons-livraison/create`, `/factures/vente/create`, `/factures/achat/create`, `/demande-prix/create`, `/bon-achat/create`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### form-controls-08 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div.flex.flex-column.gap-3:nth-of-type(3) > div.erp-card > div.px-3.pb-3:nth-of-type(2) > div > div.mt-2.p-paginator.p-component:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (5):** `/analytics/invoices/journal-vente`, `/analytics/invoices/journal-achat`, `/analytics/clients/statement`, `/analytics/suppliers/statement`, `/analytics/stock/movements`

**Screenshot:** `rtl-audit/screenshots/analytics_invoices_journal-vente.ar.png`

#### form-controls-09 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (3):** `/delivery-persons`, `/customers`, `/fournisseurs`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.ar.png`

#### form-controls-10 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (3):** `/delivery-persons`, `/customers`, `/fournisseurs`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.ar.png`

#### form-controls-11 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (3):** `/products`, `/users`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-12 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (3):** `/products`, `/users`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-13 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div.product-form-grid > div:nth-of-type(1) > div.product-panel:nth-of-type(2) > div.product-pricing-grid:nth-of-type(2) > div.p-field:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `0%`

**Routes (3):** `/products/create`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`

**Screenshot:** `rtl-audit/screenshots/products_create.ar.png`

#### form-controls-14 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div.product-form-grid > div:nth-of-type(1) > div.product-panel:nth-of-type(3) > div.product-pricing-grid:nth-of-type(2) > div.p-field:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `0%`

**Routes (3):** `/products/create`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`

**Screenshot:** `rtl-audit/screenshots/products_create.ar.png`

#### form-controls-15 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#product-create-form > div.product-form-grid > div:nth-of-type(2) > div.product-panel:nth-of-type(2) > div.p-field:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `اختر علامة تجارية`

**Routes (3):** `/products/create`, `/products/create → form-product-create`, `/products/create → form-product-create-validation`

**Screenshot:** `rtl-audit/screenshots/products_create.ar.png`

#### form-controls-16 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(3) > div.tax-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (3):** `/configurations/taxes`, `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/configurations_taxes.ar.png`

#### form-controls-17 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### form-controls-18 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### form-controls-19 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### form-controls-20 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### form-controls-21 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(5) > div.ord-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (2):** `/orders`, `/orders → dropdown-panel`

**Screenshot:** `rtl-audit/screenshots/orders.ar.png`

#### form-controls-22 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/products`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-23 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/products`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-24 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div > div:nth-of-type(3) > div.responsive-table-desktop:nth-of-type(2) > div.prod-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (2):** `/products`, `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### form-controls-25 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#product-create-form > div.product-form-grid > div:nth-of-type(2) > div.product-panel:nth-of-type(2) > div.p-field:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `اختر أو ابحث عن مستودع`

**Routes (2):** `/products/create`, `/products/create → form-product-create`

**Screenshot:** `rtl-audit/screenshots/products_create.ar.png`

#### form-controls-26 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div:nth-of-type(2) > div:nth-of-type(2) > div.doc-create-grid:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span.doc-cal.p-calendar.p-component > input.p-inputtext.p-component.p-filled`

**Routes (2):** `/devis/create`, `/demande-prix/create`

**Screenshot:** `rtl-audit/screenshots/devis_create.ar.png`

#### form-controls-27 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(3) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### form-controls-28 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(3) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### form-controls-29 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-30 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-31 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-32 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-33 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-34 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div.orders-filter-bar:nth-of-type(2) > div:nth-of-type(3) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `الكل`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-35 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div:nth-of-type(1) > div:nth-of-type(3) > div.responsive-table-desktop:nth-of-type(2) > div.prod-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### form-controls-36 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#taxes-modal-form > div:nth-of-type(1) > input.p-inputtext.p-component`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### form-controls-37 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#taxes-modal-form > div:nth-of-type(2) > span > input.p-inputtext.p-component.p-filled`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### form-controls-38 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div > div.responsive-table-desktop:nth-of-type(4) > div > div.dp-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/delivery-persons`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.ar.png`

#### form-controls-39 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(3) > div.p-paginator.p-component:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `50`

**Routes (1):** `/categories`

**Screenshot:** `rtl-audit/screenshots/categories.ar.png`

#### form-controls-40 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(4) > div.cust-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/customers`

**Screenshot:** `rtl-audit/screenshots/customers.ar.png`

#### form-controls-41 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(4) > div.fourn-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/fournisseurs`

**Screenshot:** `rtl-audit/screenshots/fournisseurs.ar.png`

#### form-controls-42 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(4) > div.pv-datatable.responsive-table-desktop.p-datatable:nth-of-type(2) > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/paiements-vente`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### form-controls-43 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(4) > div.pa-datatable.responsive-table-desktop.p-datatable:nth-of-type(2) > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-achat.ar.png`

#### form-controls-44 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(3) > div.curr-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/configurations/currencies`

**Screenshot:** `rtl-audit/screenshots/configurations_currencies.ar.png`

#### form-controls-45 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(3) > div.pt-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/configurations/payment-terms`

**Screenshot:** `rtl-audit/screenshots/configurations_payment-terms.ar.png`

#### form-controls-46 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(3) > div.seq-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/configurations/sequences`

**Screenshot:** `rtl-audit/screenshots/configurations_sequences.ar.png`

#### form-controls-47 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(3) > div.uom-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/configurations/uom`

**Screenshot:** `rtl-audit/screenshots/configurations_uom.ar.png`

#### form-controls-48 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-city > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-49 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-city > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `اختر مدينة`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-50 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-legal > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-51 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-legal > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `اختر`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-52 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-fiscal > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-53 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `#cs-fiscal > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `يناير`

**Routes (1):** `/configurations/company`

**Screenshot:** `rtl-audit/screenshots/configurations_company.ar.png`

#### form-controls-54 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div > form > div > div:nth-of-type(1) > div > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/configurations/inventory`

**Screenshot:** `rtl-audit/screenshots/configurations_inventory.ar.png`

#### form-controls-55 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `div > form > div > div:nth-of-type(1) > div > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `Depot WH1`

**Routes (1):** `/configurations/inventory`

**Screenshot:** `rtl-audit/screenshots/configurations_inventory.ar.png`

#### form-controls-56 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper:nth-of-type(1) > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.ar.png`

#### form-controls-57 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper:nth-of-type(1) > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `جميع الأنواع`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.ar.png`

#### form-controls-58 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper:nth-of-type(2) > div.p-hidden-accessible:nth-of-type(1) > input`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.ar.png`

#### form-controls-59 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div.p-dropdown.p-component.p-inputwrapper:nth-of-type(2) > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `جميع الحالات`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.ar.png`

#### form-controls-60 · `minor`

**Defect:** Control has no associated <label>, aria-label, aria-labelledby or placeholder

**Selector:** `main.admin-main-area > div > div.responsive-table-desktop:nth-of-type(4) > div.sm-datatable.p-datatable.p-component > div.p-paginator-top.p-paginator.p-component:nth-of-type(1) > div.p-dropdown.p-component.p-inputwrapper > div.p-hidden-accessible.p-dropdown-hidden-select:nth-of-type(2) > select`

**Rendered text:** `25`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.ar.png`

> … 16 further `form-controls` defects in `rtl-audit/out/route-results.json`.

### Input icon on the wrong side (project rule: Arabic left / French right) — `input-icon-side`

33 distinct defect(s).

#### input-icon-side-01 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (11):** `/products`, `/customers`, `/fournisseurs`, `/devis`, `/bons-livraison`, `/bon-livraison`, `/factures/vente`, `/factures/achat`, `/demande-prix`, `/bon-achat`, `/users`

**Screenshot:** `rtl-audit/screenshots/products.ar.png`

#### input-icon-side-02 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (11):** `/products`, `/customers`, `/fournisseurs`, `/devis`, `/bons-livraison`, `/bon-livraison`, `/factures/vente`, `/factures/achat`, `/demande-prix`, `/bon-achat`, `/users`

**Screenshot:** `rtl-audit/screenshots/products.fr.png`

#### input-icon-side-03 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div > main > div:nth-of-type(1) > div > input.pos-search-input.p-inputtext.p-component`

**Routes (3):** `/pos`, `/checkout`, `/checkout/success`

**Screenshot:** `rtl-audit/screenshots/pos.ar.png`

#### input-icon-side-04 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div > main > div:nth-of-type(1) > div > input.pos-search-input.p-inputtext.p-component`

**Routes (3):** `/pos`, `/checkout`, `/checkout/success`

**Screenshot:** `rtl-audit/screenshots/pos.fr.png`

#### input-icon-side-05 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(3) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.ar.png`

#### input-icon-side-06 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(3) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (2):** `/paiements-vente`, `/paiements-achat`

**Screenshot:** `rtl-audit/screenshots/paiements-vente.fr.png`

#### input-icon-side-07 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div:nth-of-type(1) > div.page-quick-search.products-filter-row:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (2):** `/products → table-sorted`, `/products → pagination`

**Screenshot:** `rtl-audit/screenshots/state.table-sorted.ar.png`

#### input-icon-side-08 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `#taxes-modal-form > div:nth-of-type(2) > span > input.p-inputtext.p-component.p-filled`

**Routes (2):** `/configurations/taxes → modal-dialog`, `/configurations/taxes → toast`

**Screenshot:** `rtl-audit/screenshots/state.modal-dialog.ar.png`

#### input-icon-side-09 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#login-phone`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.fr.png`

#### input-icon-side-10 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#login-password`

**Routes (1):** `/login`

**Screenshot:** `rtl-audit/screenshots/login.fr.png`

#### input-icon-side-11 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `#search-delivery-persons`

**Routes (1):** `/delivery-persons`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.ar.png`

#### input-icon-side-12 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#search-delivery-persons`

**Routes (1):** `/delivery-persons`

**Screenshot:** `rtl-audit/screenshots/delivery-persons.fr.png`

#### input-icon-side-13 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component`

**Routes (1):** `/orders`

**Screenshot:** `rtl-audit/screenshots/orders.fr.png`

#### input-icon-side-14 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(3) > div:nth-of-type(1) > input.p-inputtext.p-component`

**Routes (1):** `/caisse`

**Screenshot:** `rtl-audit/screenshots/caisse.fr.png`

#### input-icon-side-15 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div > div > input.p-inputtext.p-component`

**Routes (1):** `/categories`

**Screenshot:** `rtl-audit/screenshots/categories.ar.png`

#### input-icon-side-16 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search:nth-of-type(2) > div > div > input.p-inputtext.p-component`

**Routes (1):** `/categories`

**Screenshot:** `rtl-audit/screenshots/categories.fr.png`

#### input-icon-side-17 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#search-brands`

**Routes (1):** `/brands`

**Screenshot:** `rtl-audit/screenshots/brands.fr.png`

#### input-icon-side-18 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#search-warehouses`

**Routes (1):** `/warehouses`

**Screenshot:** `rtl-audit/screenshots/warehouses.fr.png`

#### input-icon-side-19 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > div > div:nth-of-type(1) > input.p-inputtext.p-component`

**Routes (1):** `/stock-movements`

**Screenshot:** `rtl-audit/screenshots/stock-movements.fr.png`

#### input-icon-side-20 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#search-adjustments`

**Routes (1):** `/inventory-adjustments`

**Screenshot:** `rtl-audit/screenshots/inventory-adjustments.fr.png`

#### input-icon-side-21 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > input`

**Routes (1):** `/notifications`

**Screenshot:** `rtl-audit/screenshots/notifications.ar.png`

#### input-icon-side-22 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div:nth-of-type(2) > input`

**Routes (1):** `/notifications`

**Screenshot:** `rtl-audit/screenshots/notifications.fr.png`

#### input-icon-side-23 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > input.p-inputtext.p-component`

**Routes (1):** `/drive`

**Screenshot:** `rtl-audit/screenshots/drive.fr.png`

#### input-icon-side-24 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div:nth-of-type(2) > input.p-inputtext.p-component`

**Routes (1):** `/client-requests`

**Screenshot:** `rtl-audit/screenshots/client-requests.ar.png`

#### input-icon-side-25 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `#root > div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div:nth-of-type(2) > input.p-inputtext.p-component`

**Routes (1):** `/client-requests`

**Screenshot:** `rtl-audit/screenshots/client-requests.fr.png`

#### input-icon-side-26 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component.p-filled`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### input-icon-side-27 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > input.p-inputtext.p-component.p-disabled`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### input-icon-side-28 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div.p-password.p-component.p-inputwrapper > div.p-icon-field.p-icon-field-right > input.p-password-input.p-inputtext.p-component`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### input-icon-side-29 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) > div.p-password.p-component.p-inputwrapper > div.p-icon-field.p-icon-field-right > input.p-password-input.p-inputtext.p-component`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### input-icon-side-30 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div.p-password.p-component.p-inputwrapper > div.p-icon-field.p-icon-field-right > input.p-password-input.p-inputtext.p-component`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.ar.png`

#### input-icon-side-31 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component.p-filled`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.fr.png`

#### input-icon-side-32 · `major`

**Defect:** Input icon is on the left in the fr locale — project rule requires it on the right (Arabic: left, French: right)

**Selector:** `main.admin-main-area > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > input.p-inputtext.p-component.p-disabled`

**Routes (1):** `/profile`

**Screenshot:** `rtl-audit/screenshots/profile.fr.png`

#### input-icon-side-33 · `major`

**Defect:** Input icon is on the right in the ar locale — project rule requires it on the left (Arabic: left, French: right)

**Selector:** `div:nth-of-type(2) > div.admin-main-content:nth-of-type(2) > main.admin-main-area > div > div.page-quick-search.products-filter-row:nth-of-type(2) > div:nth-of-type(1) > div > input.p-inputtext.p-component.p-filled`

**Routes (1):** `/products → empty-state`

**Screenshot:** `rtl-audit/screenshots/state.empty-state.ar.png`

### Physical CSS properties in source — `physical-css-source`

203 authored physical (non-logical) declarations across 52 files. These do not auto-flip under RTL; each is a latent direction defect wherever it affects layout. Severity `minor` individually, `major` in aggregate.

**`backoffice/src/DataTableTheme.css`** — 39 declaration(s)

- `backoffice/src/DataTableTheme.css:39` — `border-left: none !important`
- `backoffice/src/DataTableTheme.css:40` — `border-right: none !important`
- `backoffice/src/DataTableTheme.css:77` — `margin-left: 0.4rem`
- `backoffice/src/DataTableTheme.css:116` — `border-left: none !important`
- `backoffice/src/DataTableTheme.css:117` — `border-right: none !important`
- `backoffice/src/DataTableTheme.css:291` — `margin-right: auto`
- `backoffice/src/DataTableTheme.css:786` — `margin-left: auto`
- `backoffice/src/DataTableTheme.css:923` — `text-align: right`
- `backoffice/src/DataTableTheme.css:927` — `text-align: right`
- `backoffice/src/DataTableTheme.css:931` — `text-align: right`
- `backoffice/src/DataTableTheme.css:943` — `margin-left: 0`
- `backoffice/src/DataTableTheme.css:944` — `margin-right: 0.4rem`
- … +27 more in this file

**`backoffice/src/pages/InventoryAdjustments.tsx`** — 11 declaration(s)

- `backoffice/src/pages/InventoryAdjustments.tsx:371` — `paddingLeft: '2.5rem'`
- `backoffice/src/pages/InventoryAdjustments.tsx:824` — `text-align: left`
- `backoffice/src/pages/InventoryAdjustments.tsx:911` — `marginLeft: '0.25rem'`
- `backoffice/src/pages/InventoryAdjustments.tsx:933` — `marginLeft: '0.25rem'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1082` — `paddingLeft: '2.5rem'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1138` — `text-align: left`
- `backoffice/src/pages/InventoryAdjustments.tsx:1170` — `borderLeft: '2px solid #e2e8f0'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1171` — `borderRight: '2px solid #e2e8f0'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1244` — `marginLeft: '0.25rem'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1255` — `borderLeft: '2px solid #f1f5f9'`
- `backoffice/src/pages/InventoryAdjustments.tsx:1256` — `borderRight: '2px solid #f1f5f9'`

**`backoffice/src/pages/drive/DrivePage.tsx`** — 8 declaration(s)

- `backoffice/src/pages/drive/DrivePage.tsx:1429` — `marginRight: '0.375rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:1437` — `marginRight: '0.375rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:1531` — `text-align: left`
- `backoffice/src/pages/drive/DrivePage.tsx:1679` — `paddingLeft: '2rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:1680` — `paddingRight: searchQuery ? '2rem' : '0.75rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:1886` — `marginRight: '0.375rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:2105` — `marginRight: '0.375rem'`
- `backoffice/src/pages/drive/DrivePage.tsx:2113` — `marginRight: '0.375rem'`

**`backoffice/src/pages/SharedDocumentPage.tsx`** — 7 declaration(s)

- `backoffice/src/pages/SharedDocumentPage.tsx:97` — `borderLeft: '2px solid transparent'`
- `backoffice/src/pages/SharedDocumentPage.tsx:98` — `borderRight: '2px solid transparent'`
- `backoffice/src/pages/SharedDocumentPage.tsx:350` — `text-align: left`
- `backoffice/src/pages/SharedDocumentPage.tsx:385` — `text-align: right`
- `backoffice/src/pages/SharedDocumentPage.tsx:395` — `text-align: right`
- `backoffice/src/pages/SharedDocumentPage.tsx:408` — `text-align: right`
- `backoffice/src/pages/SharedDocumentPage.tsx:418` — `text-align: right`

**`backoffice/src/pages/Orders.tsx`** — 6 declaration(s)

- `backoffice/src/pages/Orders.tsx:948` — `paddingLeft: '2.5rem'`
- `backoffice/src/pages/Orders.tsx:949` — `paddingRight: quickSearch ? '2.5rem' : '0.875rem'`
- `backoffice/src/pages/Orders.tsx:1985` — `paddingLeft: '2.25rem'`
- `backoffice/src/pages/Orders.tsx:2021` — `text-align: left`
- `backoffice/src/pages/Orders.tsx:2198` — `marginLeft: '0.5rem'`
- `backoffice/src/pages/Orders.tsx:2324` — `marginRight: '0.375rem'`

**`backoffice/src/pages/POS.tsx`** — 6 declaration(s)

- `backoffice/src/pages/POS.tsx:752` — `text-align: right`
- `backoffice/src/pages/POS.tsx:835` — `text-align: right`
- `backoffice/src/pages/POS.tsx:1147` — `borderRight: dir === 'rtl' ? undefined : '1px solid #e5e7eb'`
- `backoffice/src/pages/POS.tsx:1148` — `borderLeft: dir === 'rtl' ? '1px solid #e5e7eb' : undefined`
- `backoffice/src/pages/POS.tsx:1204` — `paddingLeft: '2.375rem'`
- `backoffice/src/pages/POS.tsx:1205` — `paddingRight: searchKeyboard.value ? '4rem' : '2.375rem'`

**`backoffice/src/pages/QuotePreviewPage.tsx`** — 6 declaration(s)

- `backoffice/src/pages/QuotePreviewPage.tsx:355` — `text-align: left`
- `backoffice/src/pages/QuotePreviewPage.tsx:388` — `text-align: right`
- `backoffice/src/pages/QuotePreviewPage.tsx:397` — `text-align: right`
- `backoffice/src/pages/QuotePreviewPage.tsx:408` — `text-align: right`
- `backoffice/src/pages/QuotePreviewPage.tsx:417` — `text-align: right`
- `backoffice/src/pages/QuotePreviewPage.tsx:619` — `marginLeft: 'auto'`

**`backoffice/src/pages/onboarding/CompanyStep.tsx`** — 6 declaration(s)

- `backoffice/src/pages/onboarding/CompanyStep.tsx:102` — `marginLeft: '0.25rem'`
- `backoffice/src/pages/onboarding/CompanyStep.tsx:214` — `marginRight: '0.375rem'`
- `backoffice/src/pages/onboarding/CompanyStep.tsx:342` — `marginRight: '0.375rem'`
- `backoffice/src/pages/onboarding/CompanyStep.tsx:412` — `marginRight: '0.375rem'`
- `backoffice/src/pages/onboarding/CompanyStep.tsx:485` — `marginRight: '0.375rem'`
- `backoffice/src/pages/onboarding/CompanyStep.tsx:493` — `marginLeft: '0.5rem'`

**`backoffice/src/theme.css`** — 6 declaration(s)

- `backoffice/src/theme.css:595` — `margin-right: 0.5rem`
- `backoffice/src/theme.css:1641` — `margin-right: 0.25rem`
- `backoffice/src/theme.css:1921` — `border-right: none !important`
- `backoffice/src/theme.css:2067` — `margin-left: 0.25rem`
- `backoffice/src/theme.css:2295` — `margin-left: 0.125rem`
- `backoffice/src/theme.css:2825` — `text-align: right`

**`backoffice/src/examples/InvoiceDetailWithPDF.example.tsx`** — 5 declaration(s)

- `backoffice/src/examples/InvoiceDetailWithPDF.example.tsx:153` — `text-align: left`
- `backoffice/src/examples/InvoiceDetailWithPDF.example.tsx:183` — `text-align: right`
- `backoffice/src/examples/InvoiceDetailWithPDF.example.tsx:189` — `text-align: right`
- `backoffice/src/examples/InvoiceDetailWithPDF.example.tsx:196` — `text-align: right`
- `backoffice/src/examples/InvoiceDetailWithPDF.example.tsx:203` — `text-align: right`

**`backoffice/src/components/AdminLayout.tsx`** — 4 declaration(s)

- `backoffice/src/components/AdminLayout.tsx:104` — `marginRight: isSidebarCollapsed ? '4.5rem' : '15rem'`
- `backoffice/src/components/AdminLayout.tsx:104` — `marginLeft: '0.75rem'`
- `backoffice/src/components/AdminLayout.tsx:105` — `marginLeft: isSidebarCollapsed ? '4.5rem' : '15rem'`
- `backoffice/src/components/AdminLayout.tsx:105` — `marginRight: '0.75rem'`

**`backoffice/src/components/CustomerSelectionModal.tsx`** — 4 declaration(s)

- `backoffice/src/components/CustomerSelectionModal.tsx:182` — `paddingLeft: dir === 'rtl' ? '0.875rem' : '2.75rem'`
- `backoffice/src/components/CustomerSelectionModal.tsx:183` — `paddingRight: dir === 'rtl' ? '2.75rem' : '0.875rem'`
- `backoffice/src/components/CustomerSelectionModal.tsx:445` — `paddingLeft: dir === 'rtl' ? '0.875rem' : '2.75rem'`
- `backoffice/src/components/CustomerSelectionModal.tsx:446` — `paddingRight: dir === 'rtl' ? '2.75rem' : '0.875rem'`

**`backoffice/src/components/PaymentModal.tsx`** — 4 declaration(s)

- `backoffice/src/components/PaymentModal.tsx:294` — `marginLeft: '0.25rem'`
- `backoffice/src/components/PaymentModal.tsx:314` — `marginLeft: '0.25rem'`
- `backoffice/src/components/PaymentModal.tsx:340` — `marginLeft: '0.25rem'`
- `backoffice/src/components/PaymentModal.tsx:460` — `paddingLeft: '2.5rem'`

**`backoffice/src/pages/Caisse.tsx`** — 4 declaration(s)

- `backoffice/src/pages/Caisse.tsx:335` — `paddingLeft: '2.5rem'`
- `backoffice/src/pages/Caisse.tsx:527` — `marginRight: '0.375rem'`
- `backoffice/src/pages/Caisse.tsx:765` — `marginRight: '0.375rem'`
- `backoffice/src/pages/Caisse.tsx:875` — `marginRight: '0.375rem'`

**`backoffice/src/pages/OrderDetailPage.tsx`** — 4 declaration(s)

- `backoffice/src/pages/OrderDetailPage.tsx:211` — `text-align: left`
- `backoffice/src/pages/OrderDetailPage.tsx:1126` — `text-align: right`
- `backoffice/src/pages/OrderDetailPage.tsx:1387` — `text-align: right`
- `backoffice/src/pages/OrderDetailPage.tsx:2137` — `text-align: left`

**`backoffice/src/pages/OrderSuccessPage.tsx`** — 4 declaration(s)

- `backoffice/src/pages/OrderSuccessPage.tsx:186` — `borderRight: '1px solid #f3f4f6'`
- `backoffice/src/pages/OrderSuccessPage.tsx:207` — `borderRight: '1px solid #f3f4f6'`
- `backoffice/src/pages/OrderSuccessPage.tsx:276` — `marginRight: '0.75rem'`
- `backoffice/src/pages/OrderSuccessPage.tsx:288` — `marginLeft: '0.75rem'`

**`backoffice/src/pages/ProfilePage.tsx`** — 4 declaration(s)

- `backoffice/src/pages/ProfilePage.tsx:277` — `paddingLeft: isRTL ? '0.75rem' : '2.5rem'`
- `backoffice/src/pages/ProfilePage.tsx:278` — `paddingRight: isRTL ? '2.5rem' : '0.75rem'`
- `backoffice/src/pages/ProfilePage.tsx:319` — `paddingLeft: isRTL ? '0.75rem' : '2.5rem'`
- `backoffice/src/pages/ProfilePage.tsx:320` — `paddingRight: isRTL ? '2.5rem' : '0.75rem'`

**`backoffice/src/pages/SettingsPage.tsx`** — 4 declaration(s)

- `backoffice/src/pages/SettingsPage.tsx:376` — `marginLeft: isRTL ? 0 : 'auto'`
- `backoffice/src/pages/SettingsPage.tsx:377` — `marginRight: isRTL ? 'auto' : 0`
- `backoffice/src/pages/SettingsPage.tsx:485` — `paddingLeft: isRTL ? 0 : '1rem'`
- `backoffice/src/pages/SettingsPage.tsx:486` — `paddingRight: isRTL ? '1rem' : 0`

**`backoffice/src/pages/configurations/PaymentTerms.tsx`** — 4 declaration(s)

- `backoffice/src/pages/configurations/PaymentTerms.tsx:249` — `text-align: right`
- `backoffice/src/pages/configurations/PaymentTerms.tsx:251` — `text-align: right`
- `backoffice/src/pages/configurations/PaymentTerms.tsx:334` — `marginLeft: '0.5rem'`
- `backoffice/src/pages/configurations/PaymentTerms.tsx:367` — `marginLeft: '0.5rem'`

**`backoffice/src/components/Header.tsx`** — 3 declaration(s)

- `backoffice/src/components/Header.tsx:1032` — `marginRight: '0.5rem'`
- `backoffice/src/components/Header.tsx:1665` — `paddingLeft: '1rem'`
- `backoffice/src/components/Header.tsx:1666` — `paddingRight: '1rem'`

**`backoffice/src/components/documents/DocumentActionBar.tsx`** — 3 declaration(s)

- `backoffice/src/components/documents/DocumentActionBar.tsx:116` — `text-align: left`
- `backoffice/src/components/documents/DocumentActionBar.tsx:142` — `text-align: left`
- `backoffice/src/components/documents/DocumentActionBar.tsx:204` — `marginRight: '0.25rem'`

**`backoffice/src/components/documents/DocumentItemsTable.tsx`** — 3 declaration(s)

- `backoffice/src/components/documents/DocumentItemsTable.tsx:53` — `text-align: left`
- `backoffice/src/components/documents/DocumentItemsTable.tsx:57` — `text-align: right`
- `backoffice/src/components/documents/DocumentItemsTable.tsx:76` — `text-align: left`

**`backoffice/src/examples/InvoicesListWithPDF.example.tsx`** — 3 declaration(s)

- `backoffice/src/examples/InvoicesListWithPDF.example.tsx:109` — `text-align: right`
- `backoffice/src/examples/InvoicesListWithPDF.example.tsx:115` — `text-align: right`
- `backoffice/src/examples/InvoicesListWithPDF.example.tsx:156` — `text-align: right`

**`backoffice/src/pages/PaiementsAchat.tsx`** — 3 declaration(s)

- `backoffice/src/pages/PaiementsAchat.tsx:775` — `text-align: right`
- `backoffice/src/pages/PaiementsAchat.tsx:777` — `text-align: right`
- `backoffice/src/pages/PaiementsAchat.tsx:785` — `marginLeft: '0.25rem'`

**`backoffice/src/pages/PaiementsVente.tsx`** — 3 declaration(s)

- `backoffice/src/pages/PaiementsVente.tsx:775` — `text-align: right`
- `backoffice/src/pages/PaiementsVente.tsx:777` — `text-align: right`
- `backoffice/src/pages/PaiementsVente.tsx:785` — `marginLeft: '0.25rem'`

> … 27 further files in `rtl-audit/out/physical-css.json`.

## Interactive states

| State | Route | Trigger | Result | Screenshot |
|---|---|---|---|---|
| `mobile-drawer` | `/dashboard` | burger menu click | 28 finding(s) | `rtl-audit/screenshots/state.mobile-drawer.ar.png` |
| `header-user-menu` | `/dashboard` | click [aria-label="User menu"] | 35 finding(s) | `rtl-audit/screenshots/state.header-user-menu.ar.png` |
| `form-customer-create` | `/customers/create` | page load (empty form) | 21 finding(s) | `rtl-audit/screenshots/state.form-customer-create.ar.png` |
| `form-customer-create-validation` | `/customers/create` | submit empty form | 22 finding(s) | `rtl-audit/screenshots/state.form-customer-create-validation.ar.png` |
| `form-product-create` | `/products/create` | page load (empty form) | 30 finding(s) | `rtl-audit/screenshots/state.form-product-create.ar.png` |
| `form-product-create-validation` | `/products/create` | submit empty form | 31 finding(s) | `rtl-audit/screenshots/state.form-product-create-validation.ar.png` |
| `dropdown-panel` | `/orders` | click first .p-dropdown | 44 finding(s) | `rtl-audit/screenshots/state.dropdown-panel.ar.png` |
| `date-picker` | `/orders` | calendar | not reached — No .p-calendar/date input on /orders | — |
| `table-sorted` | `/products` | click sortable column header | 62 finding(s) | `rtl-audit/screenshots/state.table-sorted.ar.png` |
| `pagination` | `/products` | inspect .p-paginator | 62 finding(s) | `rtl-audit/screenshots/state.pagination.ar.png` |
| `modal-dialog` | `/configurations/taxes` | click add button | 46 finding(s) | `rtl-audit/screenshots/state.modal-dialog.ar.png` |
| `toast` | `/configurations/taxes` | submit dialog to raise toast | 45 finding(s) | `rtl-audit/screenshots/state.toast.ar.png` |
| `empty-state` | `/products` | search for non-existent record | 34 finding(s) | `rtl-audit/screenshots/state.empty-state.ar.png` |
| `tooltip` | `/dashboard` | hover | not reached — Hovered but no .p-tooltip rendered | — |
| `loading-skeleton` | `/analytics/sales/revenue` | load | not reached — No skeleton/spinner element visible at 350ms | — |

**`mobile-drawer` geometry:** `{"left":0,"right":0,"vw":480,"cls":"sidebar-enterprise"}`

**`form-customer-create-validation` geometry:** `{"errorElements":5}`

**`form-product-create-validation` geometry:** `{"errorElements":7}`

**`table-sorted` geometry:** `{"direction":"rtl","headerOrderLeftToRight":[{"text":"","left":1159},{"text":"الاسم","left":858},{"text":"السعر","left":719},{"text":"التكلفة","left":593},{"text":"المخزون","left":452},{"text":"علامة تجارية","left":315},{"text":"الفئات","left":179},{"text":"الحالة","left":75},{"text":"","left":33}]}`

**`pagination` geometry:** `{"dir":"rtl","firstLeft":260,"lastLeft":134,"firstIsRightOfLast":true}`

**`modal-dialog` geometry:** `{"dir":"rtl","textAlign":"start","closeOnLeft":true}`

**`toast` geometry:** `{"left":1000,"right":1420,"vw":1440,"cssRight":"20px","cssLeft":"1000px","dir":"rtl","onRightHalf":true,"visible":true}`

## Console errors and failed requests (Arabic mode)

| Route | Console errors | Failed requests |
|---|---|---|
| `/caisse` | — | `GET http://localhost:3000/api/order-payments/caisse — net::ERR_ABORTED` |
| `/pos` | `Failed to load resource: the server responded with a status of 404 ()` | `404 https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop` |
| `/checkout` | `Failed to load resource: the server responded with a status of 404 ()` | `404 https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop` |
| `/checkout/success` | `Failed to load resource: the server responded with a status of 404 ()` | `404 https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop` |
| `/products` | `Failed to load resource: the server responded with a status of 404 ()` | `404 https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop` |
| `/configurations/printers` | `Failed to load resource: the server responded with a status of 500 (Internal Server Error)` | `500 http://localhost:3000/api/printers` |
| `/settings` | `Warning: Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org` | — |
| `/analytics/clients/inactive` | — | `GET http://demo-admin.localhost:3001/src/pages/analytics/components/ReportLayout.tsx?t=178`<br>`GET http://demo-admin.localhost:3001/src/components/AIAssistant/AIAssistantOverlay.tsx?t=1`<br>`GET http://demo-admin.localhost:3001/src/components/Sidebar.tsx?t=1788828332082 — net::ERR` |

## Route coverage

### Visited in Arabic (89)

| Route | Component | Source | AR screenshot | FR screenshot |
|---|---|---|---|---|
| `/onboarding` | `OnboardingPage` | `backoffice/src/App.tsx:249` | `rtl-audit/screenshots/onboarding.ar.png` | `rtl-audit/screenshots/onboarding.fr.png` |
| `/login` | `Login` | `backoffice/src/App.tsx:250` | `rtl-audit/screenshots/login.ar.png` | `rtl-audit/screenshots/login.fr.png` |
| `/dashboard` | `Dashboard` | `backoffice/src/App.tsx:255` | `rtl-audit/screenshots/dashboard.ar.png` | `rtl-audit/screenshots/dashboard.fr.png` |
| `/delivery-persons` | `DeliveryPersons` | `backoffice/src/App.tsx:263` | `rtl-audit/screenshots/delivery-persons.ar.png` | `rtl-audit/screenshots/delivery-persons.fr.png` |
| `/orders` | `Orders` | `backoffice/src/App.tsx:271` | `rtl-audit/screenshots/orders.ar.png` | `rtl-audit/screenshots/orders.fr.png` |
| `/caisse` | `Caisse` | `backoffice/src/App.tsx:287` | `rtl-audit/screenshots/caisse.ar.png` | `rtl-audit/screenshots/caisse.fr.png` |
| `/pos` | `POS` | `backoffice/src/App.tsx:295` | `rtl-audit/screenshots/pos.ar.png` | `rtl-audit/screenshots/pos.fr.png` |
| `/checkout` | `CheckoutPage` | `backoffice/src/App.tsx:303` | `rtl-audit/screenshots/checkout.ar.png` | `rtl-audit/screenshots/checkout.fr.png` |
| `/checkout/success` | `OrderSuccessPage` | `backoffice/src/App.tsx:311` | `rtl-audit/screenshots/checkout_success.ar.png` | `rtl-audit/screenshots/checkout_success.fr.png` |
| `/products` | `Products` | `backoffice/src/App.tsx:319` | `rtl-audit/screenshots/products.ar.png` | `rtl-audit/screenshots/products.fr.png` |
| `/products/create` | `ProductCreate` | `backoffice/src/App.tsx:327` | `rtl-audit/screenshots/products_create.ar.png` | `rtl-audit/screenshots/products_create.fr.png` |
| `/categories` | `Categories` | `backoffice/src/App.tsx:343` | `rtl-audit/screenshots/categories.ar.png` | `rtl-audit/screenshots/categories.fr.png` |
| `/brands` | `Brands` | `backoffice/src/App.tsx:351` | `rtl-audit/screenshots/brands.ar.png` | `rtl-audit/screenshots/brands.fr.png` |
| `/customers` | `Customers` | `backoffice/src/App.tsx:359` | `rtl-audit/screenshots/customers.ar.png` | `rtl-audit/screenshots/customers.fr.png` |
| `/customers/create` | `CustomerCreate` | `backoffice/src/App.tsx:367` | `rtl-audit/screenshots/customers_create.ar.png` | `rtl-audit/screenshots/customers_create.fr.png` |
| `/fournisseurs` | `Fournisseurs` | `backoffice/src/App.tsx:383` | `rtl-audit/screenshots/fournisseurs.ar.png` | `rtl-audit/screenshots/fournisseurs.fr.png` |
| `/fournisseurs/create` | `FournisseurCreate` | `backoffice/src/App.tsx:391` | `rtl-audit/screenshots/fournisseurs_create.ar.png` | `rtl-audit/screenshots/fournisseurs_create.fr.png` |
| `/devis` | `DevisVenteList` | `backoffice/src/App.tsx:408` | `rtl-audit/screenshots/devis.ar.png` | `rtl-audit/screenshots/devis.fr.png` |
| `/devis/create` | `DevisVenteCreate` | `backoffice/src/App.tsx:416` | `rtl-audit/screenshots/devis_create.ar.png` | `rtl-audit/screenshots/devis_create.fr.png` |
| `/bons-livraison` | `BonLivraisonList` | `backoffice/src/App.tsx:433` | `rtl-audit/screenshots/bons-livraison.ar.png` | `rtl-audit/screenshots/bons-livraison.fr.png` |
| `/bons-livraison/create` | `BonLivraisonCreate` | `backoffice/src/App.tsx:441` | `rtl-audit/screenshots/bons-livraison_create.ar.png` | `rtl-audit/screenshots/bons-livraison_create.fr.png` |
| `/bon-livraison` | `?` | `backoffice/src/App.tsx:458` | `rtl-audit/screenshots/bon-livraison.ar.png` | `rtl-audit/screenshots/bon-livraison.fr.png` |
| `/factures/vente` | `FactureVenteList` | `backoffice/src/App.tsx:464` | `rtl-audit/screenshots/factures_vente.ar.png` | `rtl-audit/screenshots/factures_vente.fr.png` |
| `/factures/vente/create` | `FactureVenteCreate` | `backoffice/src/App.tsx:472` | `rtl-audit/screenshots/factures_vente_create.ar.png` | `rtl-audit/screenshots/factures_vente_create.fr.png` |
| `/paiements-vente` | `PaiementsVente` | `backoffice/src/App.tsx:489` | `rtl-audit/screenshots/paiements-vente.ar.png` | `rtl-audit/screenshots/paiements-vente.fr.png` |
| `/factures/achat` | `FactureAchatList` | `backoffice/src/App.tsx:499` | `rtl-audit/screenshots/factures_achat.ar.png` | `rtl-audit/screenshots/factures_achat.fr.png` |
| `/factures/achat/create` | `FactureAchatCreate` | `backoffice/src/App.tsx:507` | `rtl-audit/screenshots/factures_achat_create.ar.png` | `rtl-audit/screenshots/factures_achat_create.fr.png` |
| `/paiements-achat` | `PaiementsAchat` | `backoffice/src/App.tsx:523` | `rtl-audit/screenshots/paiements-achat.ar.png` | `rtl-audit/screenshots/paiements-achat.fr.png` |
| `/demande-prix` | `DemandePrix` | `backoffice/src/App.tsx:531` | `rtl-audit/screenshots/demande-prix.ar.png` | `rtl-audit/screenshots/demande-prix.fr.png` |
| `/demande-prix/create` | `DemandeAchatCreate` | `backoffice/src/App.tsx:539` | `rtl-audit/screenshots/demande-prix_create.ar.png` | `rtl-audit/screenshots/demande-prix_create.fr.png` |
| `/bon-achat` | `BonAchat` | `backoffice/src/App.tsx:555` | `rtl-audit/screenshots/bon-achat.ar.png` | `rtl-audit/screenshots/bon-achat.fr.png` |
| `/bon-achat/create` | `BonAchatCreate` | `backoffice/src/App.tsx:563` | `rtl-audit/screenshots/bon-achat_create.ar.png` | `rtl-audit/screenshots/bon-achat_create.fr.png` |
| `/configurations` | `Configurations` | `backoffice/src/App.tsx:580` | `rtl-audit/screenshots/configurations.ar.png` | `rtl-audit/screenshots/configurations.fr.png` |
| `/configurations/taxes` | `Taxes` | `backoffice/src/App.tsx:588` | `rtl-audit/screenshots/configurations_taxes.ar.png` | `rtl-audit/screenshots/configurations_taxes.fr.png` |
| `/configurations/currencies` | `Currencies` | `backoffice/src/App.tsx:596` | `rtl-audit/screenshots/configurations_currencies.ar.png` | `rtl-audit/screenshots/configurations_currencies.fr.png` |
| `/configurations/payment-terms` | `PaymentTerms` | `backoffice/src/App.tsx:604` | `rtl-audit/screenshots/configurations_payment-terms.ar.png` | `rtl-audit/screenshots/configurations_payment-terms.fr.png` |
| `/configurations/sequences` | `Sequences` | `backoffice/src/App.tsx:612` | `rtl-audit/screenshots/configurations_sequences.ar.png` | `rtl-audit/screenshots/configurations_sequences.fr.png` |
| `/configurations/uom` | `UnitsOfMeasure` | `backoffice/src/App.tsx:620` | `rtl-audit/screenshots/configurations_uom.ar.png` | `rtl-audit/screenshots/configurations_uom.fr.png` |
| `/configurations/company` | `CompanySettings` | `backoffice/src/App.tsx:628` | `rtl-audit/screenshots/configurations_company.ar.png` | `rtl-audit/screenshots/configurations_company.fr.png` |
| `/configurations/inventory` | `InventorySettings` | `backoffice/src/App.tsx:636` | `rtl-audit/screenshots/configurations_inventory.ar.png` | `rtl-audit/screenshots/configurations_inventory.fr.png` |
| `/configurations/printers` | `Printers` | `backoffice/src/App.tsx:644` | `rtl-audit/screenshots/configurations_printers.ar.png` | `rtl-audit/screenshots/configurations_printers.fr.png` |
| `/warehouses` | `Warehouses` | `backoffice/src/App.tsx:652` | `rtl-audit/screenshots/warehouses.ar.png` | `rtl-audit/screenshots/warehouses.fr.png` |
| `/stock-movements` | `StockMovements` | `backoffice/src/App.tsx:660` | `rtl-audit/screenshots/stock-movements.ar.png` | `rtl-audit/screenshots/stock-movements.fr.png` |
| `/inventory-adjustments` | `InventoryAdjustments` | `backoffice/src/App.tsx:668` | `rtl-audit/screenshots/inventory-adjustments.ar.png` | `rtl-audit/screenshots/inventory-adjustments.fr.png` |
| `/notifications` | `Notifications` | `backoffice/src/App.tsx:676` | `rtl-audit/screenshots/notifications.ar.png` | `rtl-audit/screenshots/notifications.fr.png` |
| `/drive` | `DrivePage` | `backoffice/src/App.tsx:685` | `rtl-audit/screenshots/drive.ar.png` | `rtl-audit/screenshots/drive.fr.png` |
| `/users` | `UsersPage` | `backoffice/src/App.tsx:693` | `rtl-audit/screenshots/users.ar.png` | `rtl-audit/screenshots/users.fr.png` |
| `/client-requests` | `ClientRequestsPage` | `backoffice/src/App.tsx:701` | `rtl-audit/screenshots/client-requests.ar.png` | `rtl-audit/screenshots/client-requests.fr.png` |
| `/roles` | `RolesPage` | `backoffice/src/App.tsx:709` | `rtl-audit/screenshots/roles.ar.png` | `rtl-audit/screenshots/roles.fr.png` |
| `/profile` | `ProfilePage` | `backoffice/src/App.tsx:717` | `rtl-audit/screenshots/profile.ar.png` | `rtl-audit/screenshots/profile.fr.png` |
| `/settings` | `SettingsPage` | `backoffice/src/App.tsx:725` | `rtl-audit/screenshots/settings.ar.png` | `rtl-audit/screenshots/settings.fr.png` |
| `/settings/notifications` | `NotificationSettingsPage` | `backoffice/src/App.tsx:733` | `rtl-audit/screenshots/settings_notifications.ar.png` | `rtl-audit/screenshots/settings_notifications.fr.png` |
| `/analytics` | `AnalyticsHub` | `backoffice/src/App.tsx:742` | `rtl-audit/screenshots/analytics.ar.png` | `rtl-audit/screenshots/analytics.fr.png` |
| `/analytics/sales/revenue` | `SalesRevenuePage` | `backoffice/src/App.tsx:750` | `rtl-audit/screenshots/analytics_sales_revenue.ar.png` | `rtl-audit/screenshots/analytics_sales_revenue.fr.png` |
| `/analytics/sales/top-products` | `SalesTopProductsPage` | `backoffice/src/App.tsx:758` | `rtl-audit/screenshots/analytics_sales_top-products.ar.png` | `rtl-audit/screenshots/analytics_sales_top-products.fr.png` |
| `/analytics/sales/by-customer` | `SalesByCustomerPage` | `backoffice/src/App.tsx:766` | `rtl-audit/screenshots/analytics_sales_by-customer.ar.png` | `rtl-audit/screenshots/analytics_sales_by-customer.fr.png` |
| `/analytics/sales/by-category` | `SalesByCategoryPage` | `backoffice/src/App.tsx:774` | `rtl-audit/screenshots/analytics_sales_by-category.ar.png` | `rtl-audit/screenshots/analytics_sales_by-category.fr.png` |
| `/analytics/sales/by-pos` | `SalesByPosPage` | `backoffice/src/App.tsx:782` | `rtl-audit/screenshots/analytics_sales_by-pos.ar.png` | `rtl-audit/screenshots/analytics_sales_by-pos.fr.png` |
| `/analytics/purchases/by-period` | `PurchasesByPeriodPage` | `backoffice/src/App.tsx:790` | `rtl-audit/screenshots/analytics_purchases_by-period.ar.png` | `rtl-audit/screenshots/analytics_purchases_by-period.fr.png` |
| `/analytics/purchases/top-suppliers` | `PurchasesTopSuppliersPage` | `backoffice/src/App.tsx:798` | `rtl-audit/screenshots/analytics_purchases_top-suppliers.ar.png` | `rtl-audit/screenshots/analytics_purchases_top-suppliers.fr.png` |
| `/analytics/purchases/by-product` | `PurchasesByProductPage` | `backoffice/src/App.tsx:806` | `rtl-audit/screenshots/analytics_purchases_by-product.ar.png` | `rtl-audit/screenshots/analytics_purchases_by-product.fr.png` |
| `/analytics/invoices/journal-vente` | `JournalVentePage` | `backoffice/src/App.tsx:814` | `rtl-audit/screenshots/analytics_invoices_journal-vente.ar.png` | `rtl-audit/screenshots/analytics_invoices_journal-vente.fr.png` |
| `/analytics/invoices/journal-achat` | `JournalAchatPage` | `backoffice/src/App.tsx:822` | `rtl-audit/screenshots/analytics_invoices_journal-achat.ar.png` | `rtl-audit/screenshots/analytics_invoices_journal-achat.fr.png` |
| `/analytics/invoices/tva` | `TvaSummaryPage` | `backoffice/src/App.tsx:830` | `rtl-audit/screenshots/analytics_invoices_tva.ar.png` | `rtl-audit/screenshots/analytics_invoices_tva.fr.png` |
| `/analytics/invoices/outstanding` | `OutstandingInvoicesPage` | `backoffice/src/App.tsx:838` | `rtl-audit/screenshots/analytics_invoices_outstanding.ar.png` | `rtl-audit/screenshots/analytics_invoices_outstanding.fr.png` |
| `/analytics/invoices/aging` | `InvoiceAgingPage` | `backoffice/src/App.tsx:846` | `rtl-audit/screenshots/analytics_invoices_aging.ar.png` | `rtl-audit/screenshots/analytics_invoices_aging.fr.png` |
| `/analytics/payments/cashflow` | `CashflowPage` | `backoffice/src/App.tsx:854` | `rtl-audit/screenshots/analytics_payments_cashflow.ar.png` | `rtl-audit/screenshots/analytics_payments_cashflow.fr.png` |
| `/analytics/payments/by-method` | `PaymentsByMethodPage` | `backoffice/src/App.tsx:862` | `rtl-audit/screenshots/analytics_payments_by-method.ar.png` | `rtl-audit/screenshots/analytics_payments_by-method.fr.png` |
| `/analytics/payments/in-out` | `InOutFlowPage` | `backoffice/src/App.tsx:870` | `rtl-audit/screenshots/analytics_payments_in-out.ar.png` | `rtl-audit/screenshots/analytics_payments_in-out.fr.png` |
| `/analytics/clients/top` | `TopClientsPage` | `backoffice/src/App.tsx:878` | `rtl-audit/screenshots/analytics_clients_top.ar.png` | `rtl-audit/screenshots/analytics_clients_top.fr.png` |
| `/analytics/clients/aging` | `ClientAgingPage` | `backoffice/src/App.tsx:886` | `rtl-audit/screenshots/analytics_clients_aging.ar.png` | `rtl-audit/screenshots/analytics_clients_aging.fr.png` |
| `/analytics/clients/inactive` | `InactiveClientsPage` | `backoffice/src/App.tsx:894` | `rtl-audit/screenshots/analytics_clients_inactive.ar.png` | `rtl-audit/screenshots/analytics_clients_inactive.fr.png` |
| `/analytics/clients/statement` | `ClientStatementPage` | `backoffice/src/App.tsx:902` | `rtl-audit/screenshots/analytics_clients_statement.ar.png` | `rtl-audit/screenshots/analytics_clients_statement.fr.png` |
| `/analytics/suppliers/top` | `TopSuppliersPage` | `backoffice/src/App.tsx:910` | `rtl-audit/screenshots/analytics_suppliers_top.ar.png` | `rtl-audit/screenshots/analytics_suppliers_top.fr.png` |
| `/analytics/suppliers/aging` | `SupplierAgingPage` | `backoffice/src/App.tsx:918` | `rtl-audit/screenshots/analytics_suppliers_aging.ar.png` | `rtl-audit/screenshots/analytics_suppliers_aging.fr.png` |
| `/analytics/suppliers/statement` | `SupplierStatementPage` | `backoffice/src/App.tsx:926` | `rtl-audit/screenshots/analytics_suppliers_statement.ar.png` | `rtl-audit/screenshots/analytics_suppliers_statement.fr.png` |
| `/analytics/stock/valuation` | `StockValuationPage` | `backoffice/src/App.tsx:934` | `rtl-audit/screenshots/analytics_stock_valuation.ar.png` | `rtl-audit/screenshots/analytics_stock_valuation.fr.png` |
| `/analytics/stock/low-stock` | `LowStockPage` | `backoffice/src/App.tsx:942` | `rtl-audit/screenshots/analytics_stock_low-stock.ar.png` | `rtl-audit/screenshots/analytics_stock_low-stock.fr.png` |
| `/analytics/stock/movements` | `StockMovementsPage` | `backoffice/src/App.tsx:950` | `rtl-audit/screenshots/analytics_stock_movements.ar.png` | `rtl-audit/screenshots/analytics_stock_movements.fr.png` |
| `/analytics/stock/slow-dead` | `SlowDeadStockPage` | `backoffice/src/App.tsx:958` | `rtl-audit/screenshots/analytics_stock_slow-dead.ar.png` | `rtl-audit/screenshots/analytics_stock_slow-dead.fr.png` |
| `/analytics/stock/by-warehouse` | `StockByWarehousePage` | `backoffice/src/App.tsx:966` | `rtl-audit/screenshots/analytics_stock_by-warehouse.ar.png` | `rtl-audit/screenshots/analytics_stock_by-warehouse.fr.png` |
| `/analytics/products/performance` | `ProductPerformancePage` | `backoffice/src/App.tsx:974` | `rtl-audit/screenshots/analytics_products_performance.ar.png` | `rtl-audit/screenshots/analytics_products_performance.fr.png` |
| `/analytics/products/margin` | `MarginAnalysisPage` | `backoffice/src/App.tsx:982` | `rtl-audit/screenshots/analytics_products_margin.ar.png` | `rtl-audit/screenshots/analytics_products_margin.fr.png` |
| `/analytics/products/never-sold` | `NeverSoldProductsPage` | `backoffice/src/App.tsx:990` | `rtl-audit/screenshots/analytics_products_never-sold.ar.png` | `rtl-audit/screenshots/analytics_products_never-sold.fr.png` |
| `/` | `?` | `backoffice/src/App.tsx:998` | `rtl-audit/screenshots/root.ar.png` | `rtl-audit/screenshots/root.fr.png` |
| `/products/:id` | `ProductDetail` | `backoffice/src/App.tsx:335` | `rtl-audit/screenshots/products__id.ar.png` | `rtl-audit/screenshots/products__id.fr.png` |
| `/customers/:id` | `CustomerEdit` | `backoffice/src/App.tsx:375` | `rtl-audit/screenshots/customers__id.ar.png` | `rtl-audit/screenshots/customers__id.fr.png` |
| `/fournisseurs/:id` | `FournisseurEdit` | `backoffice/src/App.tsx:399` | `rtl-audit/screenshots/fournisseurs__id.ar.png` | `rtl-audit/screenshots/fournisseurs__id.fr.png` |
| `/bon-achat/:id` | `BonAchatEdit` | `backoffice/src/App.tsx:571` | `rtl-audit/screenshots/bon-achat__id.ar.png` | `rtl-audit/screenshots/bon-achat__id.fr.png` |

### Not reached (9)

| Route | Source | Reason |
|---|---|---|
| `/preview/quote/:token` | `backoffice/src/App.tsx:251` | Token-based public preview route — requires a share token; not reachable from the authenticated UI. |
| `/preview/invoice/:token` | `backoffice/src/App.tsx:252` | Token-based public preview route — requires a share token; not reachable from the authenticated UI. |
| `/preview/order/:token` | `backoffice/src/App.tsx:253` | Token-based public preview route — requires a share token; not reachable from the authenticated UI. |
| `/orders/:id` | `backoffice/src/App.tsx:279` | No record reachable from /orders — list is empty for this tenant or rows are not navigable. |
| `/devis/:id` | `backoffice/src/App.tsx:424` | No record reachable from /devis — list is empty for this tenant or rows are not navigable. |
| `/bons-livraison/:id` | `backoffice/src/App.tsx:449` | No record reachable from /bons-livraison — list is empty for this tenant or rows are not navigable. |
| `/factures/vente/:id` | `backoffice/src/App.tsx:480` | No record reachable from /factures/vente — list is empty for this tenant or rows are not navigable. |
| `/factures/achat/:id` | `backoffice/src/App.tsx:515` | No record reachable from /factures/achat — list is empty for this tenant or rows are not navigable. |
| `/demande-prix/:id` | `backoffice/src/App.tsx:547` | No record reachable from /demande-prix — list is empty for this tenant or rows are not navigable. |

## Missing / fallback i18n keys

Bundle comparison: `ar_MA` has 2330 keys, `fr_FR` has 2282.

**No keys are missing from `ar_MA`.** Every key defined in `fr_FR` has an Arabic counterpart, so `t()` never falls back to a key name or to French. This is the single most important structural result of the audit: the untranslated text users report does **not** come from the translation bundle.

### Keys defined only in `ar_MA` (48)

Not user-visible defects in Arabic, but they mean the French bundle would fall back for these:

- `roleSystemLocked`
- `roleSuperAdminHelp`
- `accessRoleDesc_administrator`
- `accessRoleDesc_accounting_manager`
- `loginHeroDesc`
- `iosInstallHint`
- `confirmDeleteWarehouse`
- `confirmDeleteDocument`
- `PARTNER_HAS_DOCUMENTS`
- `DELIVERY_PERSON_HAS_ORDERS`
- `CATEGORY_HAS_CHILDREN`
- `CATEGORY_HAS_PRODUCTS`
- `trialEndsToday`
- `blockedDisabledBody`
- `noCurrenciesConfigured`
- `noPaymentTermsConfigured`
- `noSequencesConfigured`
- `cannotEditUsedSequence`
- `noWarehouseConfigured`
- `printerHelpUsb`
- `printerHelpWebprnt`
- `printerHelpAirprint`
- `printerHelpMopria`
- `deleteDeliveryPersonConfirm`
- `confirmTrashDesc`
- `confirmDeleteForeverDesc`
- `confirmDeleteDesc`
- `adjValidateSubtitle`
- `confirmCreateDeliveryNote`
- `generateSecureLink`
- `errorPaymentExceedsInvoice`
- `notification.message.new_order`
- `notification.message.low_stock`
- `notification.message.payment_received`
- `notification.message.order_status_changed`
- `notification.message.delivery_status_update`
- `criticalCannotDisable`
- `confirmDeleteMessage`
- `onboardingCompanyIntro`
- `onboardingAdminIntro`
- `onboardingSuccessSubtitle`
- `confirmCancelDelivery`
- `confirmDeleteOrders`
- `noOrdersMatchFilter`
- `deletePartnerConfirmation`
- `confirmDeleteProduct`
- `allowPriceChangeDescription`
- `unsavedChangesConfirm`

### `ar_MA` values containing no Arabic script (18)

Entries sitting in the Arabic bundle whose value is Latin. Most are intentional (URLs, placeholders, brand); the flagged ones are genuine gaps:

| Key | Value | Location | Assessment |
|---|---|---|---|
| `appName` | `Morocom` | `backoffice/src/lib/langs/ar_MA/common.ts:3` | intentional (brand / URL / code) |
| `switchToFrench` | `Changer en français` | `backoffice/src/lib/langs/ar_MA/common.ts:127` | **untranslated** |
| `navBoard` | `Board` | `backoffice/src/lib/langs/ar_MA/common.ts:398` | **untranslated** |
| `analyticsExportExcel` | `Excel` | `backoffice/src/lib/langs/ar_MA/common.ts:412` | intentional (brand / URL / code) |
| `analyticsExportPdf` | `PDF` | `backoffice/src/lib/langs/ar_MA/common.ts:413` | intentional (brand / URL / code) |
| `currencyCodePlaceholder` | `USD` | `backoffice/src/lib/langs/ar_MA/configurations.ts:92` | intentional (brand / URL / code) |
| `paymentTermKeyPlaceholder` | `net_30` | `backoffice/src/lib/langs/ar_MA/configurations.ts:96` | intentional (brand / URL / code) |
| `warehouseCode` | `WH-001` | `backoffice/src/lib/langs/ar_MA/configurations.ts:238` | intentional (brand / URL / code) |
| `drive` | `Drive` | `backoffice/src/lib/langs/ar_MA/drive.ts:3` | intentional (brand / URL / code) |
| `invoice.iceLabel` | `ICE` | `backoffice/src/lib/langs/ar_MA/invoices.ts:203` | intentional (brand / URL / code) |
| `notification.message.system` | `{{message}}` | `backoffice/src/lib/langs/ar_MA/notifications.ts:62` | intentional (brand / URL / code) |
| `onboardingEmailPlaceholder` | `contact@entreprise.com` | `backoffice/src/lib/langs/ar_MA/onboarding.ts:30` | intentional (brand / URL / code) |
| `onboardingAdminEmailPlaceholder` | `ahmed@entreprise.com` | `backoffice/src/lib/langs/ar_MA/onboarding.ts:58` | intentional (brand / URL / code) |
| `enterBrandWebsite` | `https://example.com` | `backoffice/src/lib/langs/ar_MA/products.ts:66` | intentional (brand / URL / code) |
| `enterBrandLogoUrl` | `https://example.com/logo.png` | `backoffice/src/lib/langs/ar_MA/products.ts:71` | intentional (brand / URL / code) |
| `unit` | `UNIT` | `backoffice/src/lib/langs/ar_MA/products.ts:107` | intentional (brand / URL / code) |
| `exampleImageUrl` | `https://example.com/image.jpg` | `backoffice/src/lib/langs/ar_MA/products.ts:153` | intentional (brand / URL / code) |
| `websiteUrlPlaceholder` | `https://www.example.com` | `backoffice/src/lib/langs/ar_MA/purchases.ts:25` | intentional (brand / URL / code) |

## Hardcoded user-facing strings

Found by `rtl-audit/static-strings.js`, which tokenizes every string literal in `backoffice/src` and works out the syntactic slot it occupies. This supersedes a first-pass scanner that only looked at single lines and therefore missed the most common shape in this codebase — a literal passed as its own argument line:

```tsx
toastConfirm(
  'Se déconnecter ?',              // <- literal on its own line
  () => { logout(); navigate('/login'); },
  { variant: 'warning', confirmLabel: 'Se déconnecter' },
);
```

**Excluded as correct by construction** (verified by reading each):

- Literals inside locale-keyed objects — `{ en, fr, ar }`, `{ label_fr, label_ar }`. `Header.tsx` runs an entire parallel i18n system this way (`APP_ROUTES`, `GROUP_NAMES`, `SEARCH_UI`) alongside the main `t()` dictionaries.
- `*_FR` maps that have a `*_AR` twin in the same file — e.g. [backoffice/src/lib/uom-translations.ts:1](backoffice/src/lib/uom-translations.ts#L1) pairs `UOM_FR` with `UOM_AR` and selects on `language`.
- CSS-in-JS property values, route paths, `className`, test ids.

### High confidence — 107

The literal sits in a slot that is always user-visible (`label`, `title`, `message`, `placeholder`, `aria-label`, `confirmLabel`, or a leading argument to a toast/confirm helper), and never reaches `t()`.

| File:line | Slot | String |
|---|---|---|
| `backoffice/src/common/api/api-client.ts:272` | `prop:message` | `Unknown error occurred` |
| `backoffice/src/components/AIAssistant/AIAssistantButton.tsx:27` | `attr:tooltip` | `AI Assistant (Cmd+K)` |
| `backoffice/src/components/AIAssistant/InputArea.tsx:108` | `attr:tooltip` | `Send (Cmd+Enter)` |
| `backoffice/src/components/documents/DocumentAnalysisChart.tsx:429` | `attr:title` | `Bar Chart` |
| `backoffice/src/components/documents/DocumentAnalysisChart.tsx:444` | `attr:title` | `Line Chart` |
| `backoffice/src/components/documents/DocumentTable.tsx:310` | `prop:label` | `Aperçu` |
| `backoffice/src/components/documents/ShareDocumentDialog.tsx:90` | `attr:message` | `${greeting}Veuillez trouver votre *${docInfo.fr} ${documentNumber}* via le lien ci-dessous :nn${shareUrl}nn${totalLine}n` |
| `backoffice/src/components/Header.tsx:988` | `call:toastConfirm` | `Se déconnecter ?` |
| `backoffice/src/components/Header.tsx:993` | `prop:confirmLabel` | `Se déconnecter` |
| `backoffice/src/components/Header.tsx:1040` | `attr:aria-label` | `Toggle menu` |
| `backoffice/src/components/Header.tsx:1066` | `attr:aria-label` | `Search (⌘K)` |
| `backoffice/src/components/Header.tsx:1067` | `attr:title` | `Search (⌘K)` |
| `backoffice/src/components/Header.tsx:1098` | `attr:aria-label` | `User menu` |
| `backoffice/src/components/keyboard/LanguageSwitcher.tsx:7` | `prop:ariaLabel` | `Français AZERTY` |
| `backoffice/src/components/keyboard/LanguageSwitcher.tsx:9` | `prop:ariaLabel` | `Numeric keypad` |
| `backoffice/src/components/keyboard/LanguageSwitcher.tsx:20` | `attr:aria-label` | `Keyboard layout` |
| `backoffice/src/components/keyboard/layouts/arabic.ts:88` | `prop:label` | `Tab ↹` |
| `backoffice/src/components/keyboard/layouts/english.ts:72` | `prop:label` | `Tab ↹` |
| `backoffice/src/components/keyboard/layouts/english.ts:95` | `prop:label` | `Enter ↵` |
| `backoffice/src/components/keyboard/layouts/french.ts:85` | `prop:label` | `Tab ↹` |
| `backoffice/src/components/keyboard/layouts/french.ts:108` | `prop:label` | `Entrée ↵` |
| `backoffice/src/components/keyboard/layouts/symbols.ts:95` | `prop:label` | `Enter ↵` |
| `backoffice/src/components/PartnerForm.tsx:258` | `attr:placeholder` | `+212 6XX XXX XXX` |
| `backoffice/src/components/PaymentModal.tsx:416` | `attr:label` | `Payer le reste (${formatAmount(remainingAmount, 2)} ${currency})` |
| `backoffice/src/components/PDFActionButtons.tsx:81` | `attr:title` | `${pdfService.getDocumentLabel(documentType)} ${documentNumber \|\| ''}` |
| `backoffice/src/components/PDFActionButtons.tsx:132` | `attr:tooltip` | `Prévisualiser ${pdfService.getDocumentLabel(documentType)}` |
| `backoffice/src/components/PDFActionButtons.tsx:142` | `attr:tooltip` | `Télécharger ${pdfService.getDocumentLabel(documentType)}` |
| `backoffice/src/components/PDFActionButtons.tsx:151` | `attr:title` | `${pdfService.getDocumentLabel(documentType)} ${documentNumber \|\| ''}` |
| `backoffice/src/hooks/usePushNotifications.ts:196` | `prop:message` | `Failed to request permission` |
| `backoffice/src/hooks/usePushNotifications.ts:272` | `prop:message` | `Failed to register token` |
| `backoffice/src/hooks/useReport.ts:31` | `prop:message` | `Erreur lors du chargement` |
| `backoffice/src/hooks/useReportPdf.ts:41` | `prop:message` | `Erreur lors du téléchargement` |
| `backoffice/src/modules/documents/types/document-config.ts:176` | `prop:title` | `Factures de Vente` |
| `backoffice/src/modules/documents/types/document-config.ts:194` | `prop:title` | `Factures d'Achat` |
| `backoffice/src/modules/documents/types/document-config.ts:230` | `prop:title` | `Bons de Livraison` |
| `backoffice/src/modules/documents/types/document-config.ts:248` | `prop:title` | `Demandes de Prix` |
| `backoffice/src/modules/documents/types/document-config.ts:266` | `prop:title` | `Bons d'Achat` |
| `backoffice/src/modules/products/products.validation.ts:45` | `attr:description` | `Description must not exceed 1000 characters` |
| `backoffice/src/pages/configurations/Printers.tsx:65` | `prop:label` | `Star Micronics` |
| `backoffice/src/pages/configurations/Printers.tsx:66` | `prop:label` | `Générique` |
| `backoffice/src/pages/configurations/Printers.tsx:67` | `prop:label` | `QZ Tray` |
| `backoffice/src/pages/configurations/Printers.tsx:74` | `prop:label` | `Réseau` |
| `backoffice/src/pages/configurations/Printers.tsx:79` | `prop:label` | `80mm (ticket)` |
| `backoffice/src/pages/configurations/Printers.tsx:80` | `prop:label` | `148mm (A5)` |
| `backoffice/src/pages/configurations/Printers.tsx:84` | `prop:label` | `Ticket de caisse` |
| `backoffice/src/pages/configurations/Printers.tsx:85` | `prop:label` | `Bon de livraison` |
| `backoffice/src/pages/configurations/Printers.tsx:87` | `prop:label` | `Bon de commande` |
| `backoffice/src/pages/configurations/Printers.tsx:412` | `call:toastError` | `Échec impression (${result.error ?? result.method})` |
| `backoffice/src/pages/configurations/Printers.tsx:416` | `call:toastSuccess` | `Impression envoyée → ${result.method} (${result.durationMs}ms)` |
| `backoffice/src/pages/configurations/Printers.tsx:843` | `prop:title` | `Windows / Mac (USB)` |
| `backoffice/src/pages/configurations/Printers.tsx:847` | `prop:title` | `WiFi — Epson` |
| `backoffice/src/pages/configurations/Printers.tsx:851` | `prop:title` | `WiFi — Star Micronics` |
| `backoffice/src/pages/configurations/Printers.tsx:855` | `prop:title` | `iOS (AirPrint)` |
| `backoffice/src/pages/configurations/Printers.tsx:859` | `prop:title` | `Android (Mopria)` |
| `backoffice/src/pages/configurations/UnitsOfMeasure.tsx:505` | `prop:label` | `${baseUom.name} (${baseUom.code})` |
| `backoffice/src/pages/DeliveryPersons.tsx:218` | `call:toastConfirm` | `${t('delete')} ${selectedPersons.length} livreurs?` |
| `backoffice/src/pages/documents/DocumentEditPage.tsx:860` | `call:toastSuccess` | `Lien révoqué avec succès` |
| `backoffice/src/pages/documents/DocumentEditPage.tsx:1948` | `attr:title` | `${pdfService.getDocumentLabel(getPDFDocumentType(documentType))} ${invoiceNumber}` |
| `backoffice/src/pages/documents/DocumentListPage.tsx:617` | `attr:aria-label` | `clear date` |
| `backoffice/src/pages/NotificationSettingsPage.tsx:215` | `attr:title` | `Modifier le modèle` |
| `backoffice/src/pages/onboarding/CompanyStep.tsx:353` | `attr:placeholder` | `+212 6XX-XXXXXX` |
| `backoffice/src/pages/onboarding/CompanyStep.tsx:384` | `attr:placeholder` | `+212 5XX-XXXXXX` |
| `backoffice/src/pages/Orders.tsx:735` | `call:toastSuccess` | `Paiement enregistré` |
| `backoffice/src/pages/Orders.tsx:1044` | `attr:aria-label` | `clear date` |
| `backoffice/src/pages/PaiementsAchat.tsx:424` | `attr:aria-label` | `clear date` |
| `backoffice/src/pages/PaiementsAchat.tsx:593` | `attr:emptyMessage` | `Aucun paiement trouvé` |
| `backoffice/src/pages/PaiementsAchat.tsx:631` | `attr:title` | `Aucun paiement trouvé` |
| `backoffice/src/pages/PaiementsAchat.tsx:632` | `attr:description` | `Aucun paiement d'achat ne correspond à votre recherche` |
| `backoffice/src/pages/PaiementsVente.tsx:424` | `attr:aria-label` | `clear date` |
| `backoffice/src/pages/PaiementsVente.tsx:593` | `attr:emptyMessage` | `Aucun paiement trouvé` |
| `backoffice/src/pages/PaiementsVente.tsx:631` | `attr:title` | `Aucun paiement trouvé` |
| `backoffice/src/pages/PaiementsVente.tsx:632` | `attr:description` | `Aucun paiement de vente ne correspond à votre recherche` |
| `backoffice/src/pages/ProductCreate.tsx:199` | `prop:label` | `${w.name} (${w.code})` |
| `backoffice/src/pages/ProductCreate.tsx:204` | `prop:label` | `${u.name} — ${u.code}` |
| `backoffice/src/pages/ProductCreate.tsx:246` | `prop:label` | `${r.name} (${r.rate}%)` |
| `backoffice/src/pages/ProductCreate.tsx:629` | `jsx-text` | `Purchase cost` |
| `backoffice/src/pages/ProductDetail.tsx:317` | `prop:label` | `${w.name} (${w.code})` |
| `backoffice/src/pages/ProductDetail.tsx:322` | `prop:label` | `${u.name} — ${u.code}` |
| `backoffice/src/pages/ProductDetail.tsx:389` | `prop:label` | `${r.name} (${r.rate}%)` |
| `backoffice/src/pages/ProductDetail.tsx:432` | `jsx-text` | `Product not found` |
| `backoffice/src/pages/ProductDetail.tsx:1037` | `attr:placeholder` | `Aucune taxe` |
| `backoffice/src/pages/ProductDetail.tsx:1175` | `attr:placeholder` | `Aucune taxe` |
| `backoffice/src/pages/ProductDetail.tsx:1789` | `attr:placeholder` | `Stock correction — ${product.code \|\| product.name}` |
| `backoffice/src/pages/ProductDetail.tsx:1886` | `attr:placeholder` | `Stock transfer — ${product.code \|\| product.name}` |
| `backoffice/src/pages/RolesPage.tsx:239` | `jsx-text` | `new Set` |
| `backoffice/src/pages/SettingsPage.tsx:66` | `prop:label` | `Français` |
| `backoffice/src/pages/SharedDocumentPage.tsx:363` | `attr:header` | `Qté` |
| `backoffice/src/pages/SharedDocumentPage.tsx:383` | `attr:header` | `P.U. HT` |
| `backoffice/src/services/toolRegistry.service.ts:122` | `prop:message` | `Unknown error` |
| `backoffice/src/services/tools/dataTools.ts:15` | `prop:description` | `Get information from the system (orders, products, invoices, partners, inventory, statistics). Can filter by date, statu` |
| `backoffice/src/services/tools/dataTools.ts:23` | `prop:description` | `Data module to query` |
| `backoffice/src/services/tools/dataTools.ts:38` | `prop:description` | `Specific action/endpoint` |
| `backoffice/src/services/tools/dataTools.ts:43` | `prop:description` | `Optional filters (startDate, endDate, status, customerId, etc.)` |
| `backoffice/src/services/tools/dataTools.ts:56` | `prop:description` | `Pagination options` |
| `backoffice/src/services/tools/dataTools.ts:198` | `prop:message` | `Unknown error` |
| `backoffice/src/services/tools/dataTools.ts:235` | `prop:description` | `Calculate totals, averages, counts, or group data by category (e.g., count orders by status, sum revenue by month, etc.)` |
| `backoffice/src/services/tools/dataTools.ts:243` | `prop:description` | `Data module to aggregate` |
| `backoffice/src/services/tools/dataTools.ts:248` | `prop:description` | `Aggregation operation` |
| `backoffice/src/services/tools/dataTools.ts:253` | `prop:description` | `Field to aggregate (totalAmount, quantity, etc.)` |
| `backoffice/src/services/tools/dataTools.ts:257` | `prop:description` | `Field to group by (status, customerId, productId, month, etc.)` |
| `backoffice/src/services/tools/dataTools.ts:261` | `prop:description` | `Filters to apply before aggregation` |
| `backoffice/src/services/tools/dataTools.ts:370` | `prop:message` | `Unknown error` |
| `backoffice/src/services/tools/readTools.ts:13` | `prop:description` | `Find out what page or section the user is currently viewing` |
| `backoffice/src/services/tools/readTools.ts:47` | `prop:description` | `Check what text or item the user has selected on the page` |
| `backoffice/src/services/tools/readTools.ts:85` | `prop:description` | `Search the help documentation to find instructions or guidance` |
| `backoffice/src/services/tools/readTools.ts:93` | `prop:description` | `Search query for help documentation` |
| `backoffice/src/services/tools/readTools.ts:114` | `prop:title` | `Example Help Article` |

### Possible — 233

The slot is user-facing in some usages but not all; each needs a human glance. Listed in `rtl-audit/out/hardcoded-strings.json`. The highest-signal subset — French prose with accented characters — is shown here:

| File:line | Slot | String |
|---|---|---|
| `backoffice/src/modules/notification-templates/notification-templates.interface.ts:52` | `prop:system` | `Système` |
| `backoffice/src/modules/order-payments/order-payments.interface.ts:53` | `prop:cash` | `Espèce` |
| `backoffice/src/modules/order-payments/order-payments.interface.ts:54` | `prop:check` | `Chèque` |
| `backoffice/src/modules/order-payments/order-payments.interface.ts:56` | `prop:credit_card` | `Carte de crédit` |
| `backoffice/src/modules/payments/payments.interface.ts:32` | `prop:cash` | `Espèce` |
| `backoffice/src/modules/payments/payments.interface.ts:33` | `prop:check` | `Chèque` |
| `backoffice/src/modules/payments/payments.interface.ts:35` | `prop:credit_card` | `Carte de crédit` |
| `backoffice/src/pages/Orders.tsx:565` | `call:toastWarning` | `Aucun numéro de téléphone pour ce client.` |
| `backoffice/src/services/pdf.service.ts:149` | `prop:receipt` | `Reçu` |
| `backoffice/src/services/toast.service.ts:141` | `call:lower.includes` | `désactiv` |
| `backoffice/src/services/toast.service.ts:144` | `call:lower.includes` | `dévalid` |
| `backoffice/src/services/toast.service.ts:145` | `call:lower.includes` | `désassign` |
| `backoffice/src/types/payment.ts:37` | `prop:cash` | `Espèce` |
| `backoffice/src/types/payment.ts:38` | `prop:check` | `Chèque` |
| `backoffice/src/types/payment.ts:40` | `prop:credit_card` | `Carte de crédit` |

---

## Reproducing

```bash
cd rtl-audit
ADMIN_PHONE=<phone> ADMIN_PASSWORD=<password> \
  npx playwright test --config=playwright.config.ts
node static-i18n.js && node static-hardcoded.js && node static-css.js
node build-report.js
```

Artifacts: `rtl-audit/out/route-results.json`, `interactive-results.json`, `i18n-static.json`, `hardcoded.json`, `physical-css.json`. Screenshots in `rtl-audit/screenshots/`.

### Caveats

- The API throttles at 60 req/min/IP ([api/src/app.module.ts:83](api/src/app.module.ts#L83)). The sweep paces itself and retries any route that returns 429, since a throttled page renders without data and would yield false findings. Any route still marked rate-limited is called out above.
- Findings are reported only where a Playwright run observed them in the DOM, or where the source line was read directly. Nothing is inferred from a screenshot alone.