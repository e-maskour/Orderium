# Product Create / Edit — Redesign Proposal

**Status:** Phase 1 deliverable. Awaiting approval before any implementation code.
**Scope decision (confirmed):** whole `ProductDetail` page, including stock tab, dialogs and movement history.
**App:** Morocom backoffice — React 18 + Vite + PrimeReact 10.9 + primeflex, styles in `src/theme.css`.

---

## 1. Headline finding

The backoffice **already has a complete design system** in `src/theme.css` — 133 CSS custom properties covering a 4px spacing scale, a type scale, semantic text colours, a radius scale, three elevation levels and a focus ring.

**The product pages use almost none of it.** They inject a `<style>` tag at runtime and build panels from inline `CSSProperties` objects with hardcoded hex values.

This reframes the work. This is not "invent an enterprise design system". It is **"adopt the system that already exists, and delete the ad-hoc layer sitting on top of it."** That is a far lower-risk change with a far better consistency outcome, because every other page in the app already speaks these tokens.

No new tokens are required. No new dependencies are required.

---

## 2. Current state audit

### 2.1 Files

| File | Lines | Role today |
|---|---:|---|
| `backoffice/src/pages/ProductCreate.tsx` | 958 | `/products/create` |
| `backoffice/src/pages/ProductDetail.tsx` | 1894 | `/products/:id` — detail **and** edit **and** stock management |
| `backoffice/src/modules/products/schemas/product-form.schema.ts` | 61 | Zod schema — the live validation |
| `backoffice/src/modules/products/products.validation.ts` | 192 | **Dead code** — exported from barrel, imported by nothing |
| `backoffice/src/components/PartnerForm.tsx` | 516 | The in-repo precedent to match |

There is **no `ProductEdit.tsx`**. Editing lives inside the detail page.

### 2.2 The four problems being fixed

Confirmed as the acceptance bar for this redesign.

#### A. Create and edit are inconsistent

Both pages register the **identical 16 fields** against the **same** `productFormSchema`, with the same `mode: 'onBlur'` resolver config. But they present them differently:

| | Create | Edit (detail) |
|---|---|---|
| Structure | 4 stacked panels | 3 tabs |
| Sections | `basicInformation`, `salePrice`, `costPrice`, `classification` | `Information`, `pricing`, `stock` |

A user who learns the create form has to re-learn it to edit. ~2850 lines of near-duplicate markup, drifting independently.

#### B. Ad-hoc styling, no tokens

- A runtime-injected `<style>{...}</style>` block inside the component body (`ProductCreate.tsx:292`), duplicated in spirit on the detail page.
- Inline `panel` and `iconBox` `CSSProperties` objects defined inside the page file — exactly the "one-off styled element inside the page file" the brief forbids.
- Hardcoded hex throughout: `#ef4444`, `#0f172a`, `#e2e8f0`, `#f8fafc`, `#64748b`.
- Two bans in the brief are violated by current code: a **gradient** (`linear-gradient(135deg, #235ae4, #1a47b8)`) and a **decorative coloured glow** (`box-shadow: 0 4px 12px rgba(35,90,228,0.4)`).

#### C. Weak states

- **Loading is spinner-on-blank** — `ProductDetail.tsx:411-425` centres `pi-spin pi-spinner` in an empty `50vh` box. The brief explicitly requires skeletons.
- **No form-level error summary.** A validation failure below the fold gives no signal at the top.
- **No success confirmation** beyond a transient toast.
- **Required marker is colour-only** — `<span style={{color:'#ef4444'}}>*</span>`, failing "distinct by size and weight, not by colour alone".
- **No disabled-with-reason.** Warehouse is conditional on `isService` but the relationship is not communicated.

#### D. Density and hierarchy

- Panels exist, but the gap between sections is not visibly larger than the gap between fields, so grouping does not read.
- No max content width — fields stretch the full viewport at 1440px.
- Spacing is a mix of `1.25rem`, `0.875rem`, `1.5rem`, `0.75rem` inline values with no scale discipline.

### 2.3 What is already good — keep it

Worth stating, because these do **not** need changing and the brief forbids touching them:

- React Hook Form + `zodResolver`, `mode: 'onBlur'` — inline blur validation is already wired.
- `useUnsavedChanges` hook already exists and is used on create.
- `useApiErrors` for server-side error mapping.
- Full i18n through `useLanguage()` / `t()`, with `ar_MA` and `fr_FR` catalogues.
- `ProductCreate.tsx` contains **zero** physical left/right CSS properties. `ProductDetail.tsx` has 3 — to be removed.

---

## 3. Field inventory

All 16 schema fields. **Names and validation rules are unchanged** — this is a presentation-layer redesign.

| # | Field | Type | Validation | Control |
|---:|---|---|---|---|
| 1 | `name` | string | **required**, max 255 | `InputText` |
| 2 | `code` | string | optional, max 100 | `InputText` + generate button |
| 3 | `description` | string | optional, max 1000 | `InputTextarea` |
| 4 | `price` | number\|null | **required**, > 0 | `InputNumber` |
| 5 | `cost` | number\|null | optional, ≥ 0 | `InputNumber` |
| 6 | `minPrice` | number\|null | optional, ≥ 0 | `InputNumber` |
| 7 | `saleTaxId` | string\|null | optional | `Dropdown` |
| 8 | `purchaseTaxId` | string\|null | optional | `Dropdown` |
| 9 | `saleUnitId` | number\|null | optional | `Dropdown` |
| 10 | `purchaseUnitId` | number\|null | optional | `Dropdown` |
| 11 | `categoryIds` | number[] | array | `MultiSelect` |
| 12 | `brandId` | number\|null | optional | `AutoComplete` |
| 13 | `warehouseId` | number\|null | **required** | `Dropdown` |
| 14 | `isService` | boolean | — | `InputSwitch` |
| 15 | `isEnabled` | boolean | — | `InputSwitch` |
| 16 | `isPriceChangeAllowed` | boolean | — | `InputSwitch` |

Plus, edit-only and outside the schema: **product image** (`ImageUpload`), **stock quants**, **stock correction / transfer dialogs**, **movement history**.

---

## 4. Proposed field grouping

Ordered by task frequency and dependency. **Identical on create and edit.**

| # | Section | Fields | Rationale |
|---:|---|---|---|
| 1 | **Identity** | `name`, `code`, `description`, image | What the user types first and what identifies the record. `isService` sits here as a segmented control because it *gates* section 4. |
| 2 | **Pricing** | `price`, `saleTaxId`, `saleUnitId`, `minPrice` | The highest-frequency edit after name. Sale-side grouped together. |
| 3 | **Cost & purchasing** | `cost`, `purchaseTaxId`, `purchaseUnitId` | Buy-side mirror of section 2. Separated because different roles own it. Shows the live margin readout that exists today. |
| 4 | **Stock & location** | `warehouseId` | Required, but **only for physical products**. Disabled with an explicit reason when `isService` is on. |
| 5 | **Classification** | `categoryIds`, `brandId` | Optional taxonomy. Low frequency, so it goes late. |
| 6 | **Settings** | `isEnabled`, `isPriceChangeAllowed` | Toggles, not data entry. Last. |

**Type placement:** `isService` moves *up* into Identity from its current position. It is a dependency trigger for section 4, so it must be answered before the user reaches the field it disables. This is a re-ordering, not a rename or behaviour change.

---

## 5. Layout pattern

### Recommendation: **sectioned single page** for create, **tabs** retained for edit

Not the same shell for both — but the *same form component* inside both.

**Why sectioned single page for create:** six sections, 16 fields. That is one comfortable scroll. Creation is a linear, complete-it-once task; hiding half the fields behind tabs invites incomplete records and makes required-field errors land on an invisible tab. A wizard is over-engineered for 16 fields and blocks the experienced user who wants to fill it fast.

**Why edit keeps tabs:** the detail page carries genuinely separate concerns — the product form, and stock management (quants, correction, transfer, movement history). Stock is a different task with different permissions, not a section of the product form. Collapsing it into one scroll would bury the form. So:

```
/products/create                    /products/:id
┌────────────────────────┐          ┌────────────────────────┐
│ page header + actions  │          │ page header + actions  │
├────────────────────────┤          ├───────┬───────┬────────┤
│                        │          │ Details │ Stock │        │
│  <ProductForm          │          ├───────┴───────┴────────┤
│     mode="create" />   │          │  <ProductForm           │
│                        │          │     mode="edit" />      │
│  (6 sections, 1 scroll)│          │  (same 6 sections)      │
├────────────────────────┤          ├────────────────────────┤
│ sticky action bar      │          │ sticky action bar      │
└────────────────────────┘          └────────────────────────┘
```

Today's edit page has **three** tabs (Information / Pricing / Stock), which splits the *form itself* across two of them. The proposal collapses Information + Pricing into one **Details** tab holding the complete shared form, leaving **Stock** as the only genuine second concern. Net: the form is identical in both modes; only the surrounding shell differs.

### Component structure

```
components/product/
  ProductForm.tsx          ← the 6 sections, all 16 fields, mode: 'create' | 'edit'
  ProductFormSection.tsx   ← labelled section wrapper (heading + description + slot)
  FormField.tsx            ← label + control + help + error, aria wiring
```

`ProductForm` owns markup only. The RHF instance, mutations and navigation stay in the pages, passed in — so submission logic, API calls and validation are untouched.

`FormField` and `ProductFormSection` are written generically so they can later serve `PartnerForm` too. They are **not** product-specific one-offs.

### Widths

- Form content column: **max 720px** for single-column sections.
- Two-column only for genuinely short paired fields: (`price`, `saleTaxId`), (`cost`, `purchaseTaxId`), (`saleUnitId`, `purchaseUnitId`). Collapses to one column below 768px.
- `name` and `description` stay full width.

---

## 6. Design decisions as concrete tokens

Every value below **already exists** in `theme.css`. Nothing new is introduced.

### Spacing — 4px base, already defined

| Use | Token | Value |
|---|---|---|
| Label → control | `--space-2` | 0.5rem |
| Control → help/error | `--space-1` | 0.25rem |
| Between fields in a section | `--space-5` | 1.25rem |
| **Between sections** | `--space-10` | **2.5rem** |
| Section inner padding | `--space-6` | 1.5rem |
| Page gutter (desktop / mobile) | `--space-8` / `--space-4` | 2rem / 1rem |

Section gap (2.5rem) is **2× the field gap** (1.25rem), which is what makes the grouping read. This is the fix for problem D.

### Typography — 4 sizes, 3 weights

| Role | Size token | Weight | Line height |
|---|---|---|---|
| Page title | `--text-xl` (1.25rem) | 600 | `--leading-tight` |
| Section heading | `--text-md` (0.9375rem) | 600 | `--leading-snug` |
| Field label | `--text-sm` (0.8125rem) | 500 | `--leading-normal` |
| Input value / body | `--text-base` (0.875rem) | 400 | `--leading-normal` |
| Help text & errors | `--text-xs` (0.75rem) | 400 / 500 | `--leading-normal` |

Four sizes on the page (`xl`, `md`, `sm`, `base`) plus `xs` for the metadata layer — within the "no more than 4 sizes, 3 weights" bar, counting the help/error layer as metadata rather than content. Weights used: 400, 500, 600. **No 700/800.** Current code uses `font-weight: 800` on the page title; that goes.

Errors are distinguished by **weight 500 + an icon + `--text-xs`**, not by red alone. Required fields get a **text "Required" chip** at `--text-2xs`, replacing the bare red asterisk.

Numeric fields (`price`, `cost`, `minPrice`) get `font-variant-numeric: tabular-nums` via the existing `--font-mono` stack for column alignment.

### Colour

| Role | Token |
|---|---|
| Page ground | `--erp-bg` (#f0f4f8) |
| Section surface | `--erp-surface` (#ffffff) |
| Border | `--erp-border` (#e2e8f0) |
| Primary text | `--text-primary` (#0f172a) |
| Secondary / help | `--text-secondary` (#475569) |
| Label | `--text-label` (#64748b) |
| Disabled | `--text-disabled` (#94a3b8) |
| **Single accent** | `--orderium-primary` |
| Focus | `--focus-ring` |

Semantic colours reserved strictly for success / warning / error. **The gradient and the coloured glow shadow are removed.**

### Elevation — 2 levels, both existing

- Level 1: `--erp-shadow-sm` — section cards.
- Level 2: `--erp-shadow` — the sticky action bar only, to lift it off content on scroll.

`--erp-shadow-lg` is **not** used on these pages.

### Radius

`--erp-radius-md` (0.625rem) on inputs, `--erp-radius-lg` (1rem) on section cards — tighter inside, softer outside.

---

## 7. States to be implemented

| State | Treatment |
|---|---|
| **Loading (edit)** | Skeleton matching the section layout — 6 section cards with shimmer field rows. Replaces the `50vh` spinner at `ProductDetail.tsx:411`. |
| **Saving** | Action bar button shows inline progress, form inputs `disabled`, `aria-busy="true"` on the form. |
| **Inline validation** | On blur — already wired via `mode: 'onBlur'`. Error text below the control, linked by `aria-describedby`, with icon + weight, not colour alone. |
| **Form-level error summary** | On failed submit, a summary panel at the top of the form lists each invalid field as a button that focuses it. Receives focus on appearance. |
| **Success** | Existing toast retained, plus the action bar's dirty indicator clears to a "Saved" confirmation. |
| **Empty / optional sections** | Classification and Settings render with help text explaining what they do when untouched — not left as bare controls. |
| **Disabled with reason** | `warehouseId` disabled when `isService` is on, with visible help text: "Not applicable — services are not stocked." Reason is in `aria-describedby`, not a tooltip alone. |
| **Unsaved-changes guard** | `useUnsavedChanges` — already on create, extended to edit. |
| **Server error** | `useApiErrors` output surfaced into the same top-of-form summary component. |

---

## 8. Accessibility plan (WCAG 2.1 AA)

- Every control gets `htmlFor` / `id` pairing through `FormField`. PrimeReact `Dropdown`, `MultiSelect`, `AutoComplete` and `InputNumber` need `inputId`, not `id` — handled inside `FormField` so it cannot be got wrong per-field.
- Errors: `aria-describedby` pointing at both help text and error node; `aria-invalid` on the control.
- Required: `aria-required`, plus the visible "Required" chip.
- Section headings are real `<h2>`/`<h3>` in order; the form is a `<form>` with `<fieldset>`/`<legend>` per section.
- Visible focus ring via the existing `--focus-ring` on every interactive element including the sticky bar.
- Error summary is a `role="alert"` region that takes focus on submit failure.
- Contrast: `--text-label` (#64748b) on white = 4.76:1 ✓. `--text-disabled` (#94a3b8) = 2.87:1 ✗ — so disabled state will **not** rely on that colour to convey the reason; the reason is always in text at `--text-secondary`.

---

## 9. RTL plan

- **Logical properties only** — `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`. No `margin-left`, `padding-right`, `text-align: left`, `float`.
- The 3 physical properties currently in `ProductDetail.tsx` are removed.
- Existing `[dir="rtl"]` overrides in `theme.css` are the fallback pattern for PrimeReact internals that do not accept logical properties; new code should not need them.
- Verified by grep as part of the acceptance criteria.

---

## 10. Migration and risk

| Change | Risk | Note |
|---|---|---|
| Extract shared `ProductForm` | Medium | Highest-value change. Mitigated by both pages already using an identical RHF + zod setup. |
| Adopt existing tokens, delete inline styles | Low | Visual-only. |
| Collapse edit's Information + Pricing tabs into one Details tab | Medium | Changes edit page navigation. Stock tab untouched in structure. |
| Skeleton replaces spinner | Low | New component, no logic change. |
| Move `isService` into Identity | Low | Re-order only. No rename, no validation change. |
| Remove gradient / glow | Low | Required by the brief. |

**Explicitly not touched:** field names, validation rules, `productFormSchema`, API calls, mutations, routing, the product model, migrations.

**Flagged, not actioned:** `products.validation.ts` (192 lines) is dead code exported from `modules/products/index.ts`. Deleting it is outside this brief's scope and the brief forbids deleting files without asking. Recommend a separate cleanup. **Not proposed here.**

---

## 11. Open item

Before-screenshots at 1440px / 390px, LTR / RTL, default / error are **not yet captured**. Both dev servers are confirmed up (backoffice `http://localhost:3001` HTTP 200, API `:3000` HTTP 200), but login is phone + password and the portal seeder deliberately ships no default password. **Credentials needed** to populate `redesign/before/`.

---

## 12. Approval gate

Per the brief, no implementation code has been written. Requesting approval on:

1. The 6-section grouping and order (§4)
2. Sectioned page for create + Details/Stock tabs for edit, one shared `ProductForm` (§5)
3. Token decisions — adopt existing `theme.css` system, add nothing (§6)
4. The state list (§7)
