# API Refactor Audit — Phase 1

**Scope:** `api/src` (NestJS 11, TypeORM, PostgreSQL), excluding migrations and seeders.
**Date:** 2026-10-18. **Code changes made:** none.

---

## 0. Before Phase 2: decisions needed

| # | Question | Why it matters | My recommendation |
|---|---|---|---|
| Q1 | **There is uncommitted work in the tree.** 18 API files are modified and 2 are untracked. They look like the in-progress French number/date formatting work. Several overlap my top targets: `orders.service.ts`, `orders.helpers.ts`, `pdf.service.ts`, `statistics.service.ts` and `quotes.helpers.ts`. | Phase 3 makes one commit per step. If that WIP is still in the tree, my commits would either include it or be tangled with it. | You commit (or stash) the WIP first. I then branch `refactor/api-cleanup` from that commit. |
| Q2 | **20 unit tests fail before any change.** `warehouse.service.spec.ts` has 12 failures because its test module has no `CACHE_MANAGER` provider. `inventory-adjustment.service.spec.ts` has 8 failures because a mocked query result is `undefined` and the code reads `[0]` from it. The **e2e suite can't load at all**: it fails importing `minio.provider`, and it would also need a real database. | The prompt says "never continue with failing tests". | I fix only the **test setup** for these two specs (mocks and providers; no production code), so the baseline is green. E2E stays out of scope unless a database is available (see Q3). |
| Q3 | **Is the dev PostgreSQL (`docker-compose.dev.yml`) available to tests?** | Characterization tests with mocked repositories can't prove that SQL-heavy code is unchanged (reports, statistics, `filterOrders`). | If yes: HTTP-level characterization tests against a seeded tenant DB. If no: snapshot the **generated SQL and parameters** (`qb.getQueryAndParameters()`) next to service-level tests. That still catches any change to the query text. |
| Q4 | **Some fixes from the brief are behavior changes.** (a) Wrapping the non-`ApiRes` controllers (tenant, tenant-lifecycle, subscription-billing, health) changes the response `code` field, because the interceptor fallback currently emits `GEN200_00`. (b) Turning `throw new Error()` into Nest exceptions changes 500 responses to 4xx. (c) Unifying the two min-price checks changes outcomes. | Your constraints forbid behavior changes. | Leave all three as they are and list them in the summary for you to decide. |
| Q5 | **There are serious security bugs (§7).** | They are out of scope for a behavior-preserving refactor. | Fix them on a separate track. Several are urgent: cross-tenant JWTs, portal tokens bypassing `@RequirePermission`, self privilege escalation, unescaped HTML in PDFs, and public buckets. |

---

## 1. Baseline

| Check | Result |
|---|---|
| `jest` (unit) | **28/30 suites, 377/397 tests pass.** 20 failures, all pre-existing (see Q2). |
| `jest --config test/jest-e2e.json` | **Fails to load** (`minio.provider` import). 0 tests run. |
| `tsc -p tsconfig.build.json --noEmit` | ✅ passes |
| Size | 409 source files, **60,886 lines**, 49 controllers, **418 endpoints** |
| Functions over 50 lines | **155** (excluding migrations). Full list in Appendix A. |
| Duplicate-block groups (8-line clone detector) | 50 raw hits. Consolidated into 30 real groups in §3. |
| `console.log` in production code | 0 ✅ |
| `@InjectRepository` | Only on master-DB entities (Tenant, ActivityLog, Plan, …), which is allowed ✅. One violation: `configurations.controller.ts:46` injects the **root** `DataSource`. |

---

## 2. Top problem files (ranked by severity)

Severity combines size, longest function, duplication, misplaced logic and risk.

| Rank | File | Lines | Longest fn | Main problems |
|---|---|---|---|---|
| 1 | `modules/orders/orders.service.ts` | 1537 | 195 (`createOrder` 210-404) | `filterOrders` 455-561 takes 13 positional params; its query builder is rebuilt 4× (491-608); PROV numbering duplicated 128-138 / 969-981; `isPosOrigin` re-coded inline 5×; stock processing 809-946. |
| 2 | `modules/portal/portal.controller.ts` | 835 | 68 | Fat controller: JWT payload building 89-190, partner mapping 252-357, "linked customer" lookup copied 7× (443-630, 821). |
| 3 | `modules/configurations/configurations.controller.ts` | 721 | 71 | About 500 lines of service logic in the controller: sequence CRUD 196-362, raw SQL 364-434, number formatting copied 3× 436-692. |
| 4 | `modules/inventory/stock.service.ts` | 1169 | 152 | `updateStockQuant` 172-219 is a dead copy of 566-610; transaction boilerplate repeated 5×; four functions over 70 lines. |
| 5 | `modules/reports/partners/{client,supplier}-reports.service.ts` | 465 / ~350 | 115 | Near copy-paste (VENTE↔ACHAT); aging logic copied 3× together with invoice-reports. |
| 6 | `modules/reports/invoices/invoice-reports.service.ts` | 569 | 133 | `getJournalVente` 53-136 ≡ `getJournalAchat` 139-222; aging 392-524. |
| 7 | `modules/sequences/sequences.service.ts` | 773 | 187 (`generateNext` 203-389) | One huge locking/period function; highest concurrency risk. |
| 8 | `modules/pdf/pdf.service.ts` + `pdf.controller.ts` | 1059 / ~300 | 86 | Controller has the same try/send/catch 5×; service repeats cache and browser lifecycle 3×; `getDocumentTitle` ≈ `getDocumentLabel`. |
| 9 | `modules/invoices/*` vs `modules/quotes/*` | 770+704 | 102 | Controllers nearly identical (2-148); direction parsing 7×; export rows 3×; min-price check 2× (behavior differs); share-token 3×. |
| 10 | `modules/statistics/statistics.service.ts` | 921 | 114 | Long dashboard functions; sequential independent queries. |
| 11 | `modules/platform-metrics/platform-metrics.service.ts` | 980 | 90 | `buildAlerts`, `getHealth`, `exportCsv` and `getTenantRows` are each 75-90 lines; metric column list repeated 4×. |
| 12 | `modules/notifications/*` | 510+473+393 | 145 | `sendToTokens` 145 lines; 3 near-identical dispatch branches; controller repeats user-id resolution 4×. |
| 13 | `modules/tenant/tenant.service.ts` vs `tenant-lifecycle.service.ts` | 645 / 483 | 66 | `buildMinioClient`, Redis status/key helpers and the activity query are duplicated verbatim. |
| 14 | `main.ts` / `tenant.middleware.ts` | — | 147 / 90 | `bootstrap` does 6 jobs; tenant-exclusion list duplicated with `app.module.ts` and the two have drifted. |
| 15 | `modules/products/products.controller.ts` | 439 | 71 | Image replace/delete workflow lives in the controller (234-344). |

PDF templates (`receipt.template.ts` 395-line function, `orders-merge.template.ts` 314, `document.template.ts` 150, `theme.styles.ts` 353, `document.styles.ts` 246) are long mostly because they are HTML/CSS literals. **Splitting them adds little value.** I propose extracting only the shared CSS tokens and the consolidated vs detailed views in orders-merge, and justifying the rest in the summary.

---

## 3. Duplication groups

Paths are relative to `src/modules/`. **Proposed home** prefers a file that already exists.

### Orders / invoices / quotes / partners / products
| ID | Where | What | Proposed home | Risk |
|---|---|---|---|---|
| D1 | `orders/orders.helpers.ts:113-159` vs `163-205` | Detail vs list DTO mapping; only delivery-person and paid/remaining fields differ. | `mapOrderBase()` in the same file | Low |
| D2 | `orders.helpers.ts:315-404`, `quotes/quotes.helpers.ts:67-146`, `invoices/invoices.helpers.ts:44-107` | Export rows: partner block, empty item, discount label, column widths. | `common/helpers/document-export.helpers.ts`. Must keep quotes' `''` for a null price. | Low-Med |
| D3 | `invoices.helpers.ts:15-28` vs `quotes.helpers.ts:37-49`; `invoices.service.ts:113-134` vs `quotes.service.ts:57-81` | Min-price check. **Behaviors differ** (null `unitPrice`). | Share the scaffolding only, with a flag that preserves each behavior. Otherwise leave as is (Q4). | Med |
| D4 | `invoices.controller.ts:36-148,266-290` vs `quotes.controller.ts:36-146,326-350`, `orders.controller.ts:64-69,120-125,184-189` | Direction parsing (7×), page/limit clamping, pagination meta, export filename. | `common/utils/query-parsing.ts` | Low |
| D5 | `invoices.service.ts:283-308` vs `quotes.service.ts:226-252` | Partner fields copied from a DTO onto the entity. | Shared helper | Low |
| D6 | `invoices.service.ts:231-243`, `quotes.service.ts:177-189`, `orders.service.ts:610-622` | `getRawOne` aggregate parsing. | `parseAggregates()` | Low |
| D7 | `orders.service.ts:491-509, 514-526, 535-547, 595-608` | Same filtered query builder built 4× (date filter re-applied each time). | Private `buildFilteredOrderQuery()` | Low |
| D8 | `orders.service.ts:128-138, 969-981`; `invoices.service.ts:93-109, 260-271`; `quotes.service.ts:206-217, 431-443` | PROV numbering, 6 copies using **2 different algorithms** ("last id" vs "max scan"). | `common/helpers/sequence.helpers.ts`, keeping each algorithm where it is used today. | Med |
| D9 | `orders.service.ts:769-786,954-963`; `invoices.service.ts:464-471,556-564`; `quotes.service.ts:385-390,419-425` | Validate/devalidate sequence and release flow. | `SequencesService` helper | Med |
| D10 | `orders.service.ts:1451-1535`, `invoices.service.ts:701-757`, `quotes.service.ts:491-532` | Share-link token creation and expiry check. | `common/helpers/share-token.ts` | Low |
| D11 | `invoices.service.ts:61-76`, `payments/payments.service.ts:128-158`, `orders/order-payments.service.ts:130-141` | Paid/remaining/status recalculation. The invoices copy is dead (§6). | Keep `PaymentsService`'s copy | Low |
| D12 | `orders.service.ts:809-892` vs `898-946` vs `invoices.service.ts:482-539` | Inventory config read and stock-item filtering. | `StockService` helper | Med |
| D13 | `partners/partners.service.ts:225-284, 288-348` vs `350-410` | Customer and supplier analytics differ only in the id column. | `getPartnerAnalytics(id, year, role)` | Low |
| D14 | `orders.service.ts:68-70` vs inline at 249, 372, 1257, 1293, 1306 | `isPosOrigin` re-coded. | Use the existing helper | Low |
| D15 | `products/products.controller.ts:248-258` vs `312-323` | Storage key extracted from an image URL. | `ImageService` | Low |

### Inventory / portal / PDF / notifications / configurations / storage
| ID | Where | What | Proposed home | Risk |
|---|---|---|---|---|
| D16 | `inventory/stock.service.ts:172-219` vs `566-610`; transaction boilerplate at 324-375, 685-705, 778-890, 932-1028 | Dead copy of the quant update; queryRunner connect/start/commit/rollback/release repeated 5×. | Delete the dead copy; private `runInTransaction()` | Low |
| D17 | `stock.service.ts:1042-1080` vs `inventory/inventory-adjustment.service.ts:439-472` | Two `ADJ/YYYY/NNNNN` reference generators. | Shared helper (only if output is byte-identical) | Med |
| D18 | `portal/portal.controller.ts` 263-349 (partner summary 3×), 107-189 (login response 2×), 443-630 & 821 (linked customer 7×), 485-637 (ownership check 3×) | Portal identity plumbing. | `PortalService` methods | Low |
| D19 | `configurations/configurations.controller.ts:436-485, 509-570, 634-692`; branches 205-231 ≡ 233-252 | Date-prefix and trimester builder, which already exists in `sequences/helpers/format-document-number.ts`. | Move to the service and reuse the sequences helper | Low |
| D20 | `pdf/pdf.controller.ts` 44-66, 87-109, 130-152, 172-194, 251-270 | Identical try / `res.set` / `res.send` / catch. | Private `sendPdf()` | Low |
| D21 | `pdf/pdf.service.ts` 903-938 vs 940-975; cache 211-299; browser page lifecycle 309-357, 645-753; invoice vs quote fetchers 519-582 | Title/label lookups, cache wrapper, page lifecycle. | Private helpers in the same service | Low |
| D22 | `pdf/templates/document.styles.ts:22-44` vs `orders-merge.template.ts:195-215`; `esc` (orders-merge:52) vs `pdf-report/core/html.util.ts:41` | Shared CSS tokens; two HTML-escape helpers. | Export the shared tokens; reuse `escapeHtml` (only if output is identical) | Low |
| D23 | `drive/drive-storage.service.ts:22-52, 75-78` vs `images/providers/minio.provider.ts:41-76, 119-122`; `tenant/tenant.service.ts:527-537` ≡ `tenant-lifecycle/tenant-lifecycle.service.ts:471-481` | MinIO client built from env 4×; `getTenantBucket` 2×. | One MinIO client factory. Moving it across modules needs your OK. | Med |
| D24 | `notifications/notification-template.service.ts:193-253` | Three near-identical "push + in-app" branches. | Resolve recipients once, then one code path | Low |
| D25 | `tenant.service.ts` 541-563, 111-117, 204-208 vs `tenant-lifecycle.service.ts` 428-444, 306-312, 465-469 (+ `subscription-billing.service.ts:832-836`) | Redis status setter, key clearing, activity query, find-or-404. | Shared helpers in the tenant module | Low |
| D26 | `onboarding/onboarding.controller.ts:63-79` vs `tenant/tenant.middleware.ts:141-160` | Tenant slug extraction. | Export from the middleware file | Low |

### Reports / metrics / platform
| ID | Where | What | Proposed home | Risk |
|---|---|---|---|---|
| D27 | `reports/partners/client-reports.service.ts` vs `supplier-reports.service.ts` (whole files) | Near copies parameterized by direction, id/name columns and labels. Client has an extra `getInactiveCustomers`; client top also selects `MAX(date)`. | Shared helpers in `reports/shared/` | Low (client has tests; supplier needs characterization tests) |
| D28 | `client-reports:65-91` ≈ `sales-reports:236-260`; `supplier-reports:65-89` ≈ `purchases-reports:150-172`; product aggregation at `product-reports:56-86,144-177`, `sales:149-184,306-334`, `purchases:220-247` | Aggregations grouped by partner and by product. | `reports/shared/*-aggregates.ts` | Low |
| D29 | `invoice-reports.service.ts:53-136` ≡ `139-222`; aging in `invoice-reports:436-522`, `client:167-240`, `supplier:167-240` | Journal by direction; aging bucketing and chart. **Chart labels differ between copies** ('À échéance' vs "À l'échéance"). They must be preserved, so labels become parameters. | Private `getJournal(direction)`; `reports/shared/aging.util.ts` | Med |
| D30 | All 8 report services | `TTL`, `cacheKey`, `withCache`, slice pagination, date WHERE, XLSX export tail. | `reports/shared/` helpers | Low |
| D31 | `platform-metrics/metrics-collector.service.ts:36-57, 487-509, 543-566` vs `platform-metrics.service.ts:48-56` | Metric column list 4×. | One exported constant | Low |
| D32 | `super-admin/migrations.service.ts:56,180` & `seeders.service.ts:115,319`; find-or-404 at `migrations.service.ts:88,173,206` | Same tenant listing and lookup; `seeders` already has `requireTenant`. | Reuse | Low |
| D33 | `app.module.ts:119-136` vs `database/master-data-source.ts:26-42`; tenant-exclusion routes `app.module.ts:220-236` vs `tenant.middleware.ts:44-59` | Master DB config and entity list; tenantless routes. **The two exclusion lists have already drifted**, so unifying them would change behavior. | `MASTER_ENTITIES` constant (safe). Report the route lists only. | Low / ⚠️ |

Not worth extracting: the import/decorator headers of the inventory controllers (D-noise), and the subscription-billing DTO import list.

---

## 4. Functions over 50 lines

There are **155**; the full list is in Appendix A. The top 25 with the proposed split:

| Lines | Function | Proposed split |
|---|---|---|
| 195 | `OrdersService.createOrder` (orders.service.ts:210-404) | `resolveCustomer` → `allocateOrderNumbers` → `buildOrderEntity` → `applyInitialStatus` → `insertItems` → `loadOrderDetail` → `runPostCreateSideEffects` |
| 187 | `SequencesService.generateNext` (203-389) | `lockActiveSequence` → `mapRawSequence` → `classifyPeriod` (advance/backdated/same) → `applyCounterUpdate` → `formatFor` |
| 152 | `StockService.processDocumentStockMovementsOnce` (740-891) | `findDoneMovements`, `isOutgoingType`, `resolveUomId`, `warnIfGoingNegative`, `createDocMovement`, `applyQuantAndClearPending` |
| 147 | `bootstrap` (main.ts:12-158) | `buildCorsOriginValidator`, `registerRootInfoRoute`, `configureHelmet`, `configureBodyLimits`, `registerGlobalPipes…`, `registerProcessErrorHandlers` |
| 145 | `PushNotificationService.sendToTokens` (220-364) | `buildDataOnlyMessage`, `buildFullMessage`, `collectInvalidTokens`, `handleFcmError` |
| 133 | `InvoiceReportsService.getAgingBalance` (392-524) | `fetchOpenInvoices`, `groupByPartner`, `bucketize` (shared), `buildAgingChart` (shared) |
| 125 | `StockService.reverseDocumentStockMovements` (905-1029) | `REVERSAL_TYPE_MAP`, `buildReversal`, `undoQuant`, `restorePending` |
| 115 | `Client/SupplierReportsService.get*Aging` (128-242) | shared aging util |
| 114 | `StatisticsService.getRecentActivities` (414-527) | `fetchRecentOrderActivities`, `fetchNewCustomerActivities`, `fetchLowStockActivities`, `fetchDailyGoalActivity`, `sortAndLimit` |
| 107 | `OrdersService.filterOrders` (455-561) | `buildFilteredOrderQuery`, `fetchOrderPage`, `countByColumn`, `assembleFilterResult` |
| 104/103 | `get{Customer,Supplier}Statement` | `fetchLedgerEntries`, `computeRunningBalance` (keep each side's sign convention) |
| 102 | `InvoicesService.validate` (446-547) | `assertPartnerHasIce`, `assignFinalNumber`, `markValidated`, `processInvoiceStock`, `finalizeValidation` |
| 100 | `PurchasesReportsService.getPurchasesByPeriod` (37-136) | `baseQb`, `kpis`, `daily`, `paged` |
| 98 | `InventoryAdjustmentService.validate` (206-303) | `assertValidatable`, `buildAdjustmentMovement`, `applyLine`, `markDone` |
| 98 | `renderHeaderTemplate` (document.template.ts:49-146) | HTML; see the note on templates |
| 95 | `StockService.validateMovement` (282-376) | `loadMovementOrFail`, `assertValidatable`, `assertAvailable`, `applyMovementQuants` |
| 95 | `SalesReportsService.getRevenueReport` (41-135) | `buildOrderBase`, `fetchKpis`, `fetchDailySeries`, `fetchPagedRows` |
| 94 | `ProductReportsService.getMarginAnalysis` (133-226) | `productAggregateQb` (shared), `mapRow`, `computeMargin` |
| 93 | `ClientReportsService.getInactiveCustomers` (245-337) | `fetchActiveIds`, `fetchLastOrders`, `attachPartners` |
| 92 | `InvoicesService.update` (332-423) | `resolveDirection`, `syncInvoiceItems`, `buildInvoicePatch`, `reloadFresh` |
| 90 | `PlatformMetricsService.buildAlerts` (588-677) | `collectionAlert`, `quotaAlerts`, `dormantAlert`, `errorRateAlert`, `sortBySeverity` |
| 90 | `TenantMiddleware.use` (42-131) | `isTenantlessRoute`, `resolveTenantOrThrow`, `assertTenantAccessible`, `runInTenantContext` |
| 89 | `NotificationsService.findAll` (27-115) | `applyNotificationFilters` |
| 88 | `DeliveryService.updateOrderStatus` (343-430) | `DELIVERY_TO_ORDER_STATUS` map, `updateDeliveryRow`, `syncOrderFromDelivery`, `notifyStatusChange` |
| 84 | `OrdersService.processOrderStockIfConfigured` (809-892) | `loadInventoryContext`, `extractStockItems`, `applyPhysicalMovement`, `applyForecastQuantities` |

Expected exceptions, to be justified in the summary rather than split: PDF/CSS template literals, `access-control.seeder.ts` (seed data), and `test/seed-test-data.ts`.

---

## 5. Unclear and inconsistent patterns

**Fat controllers** (logic to move into services):
- `configurations.controller.ts`: about 500 lines; uses the root `DataSource`.
- `portal.controller.ts`: auth payloads, partner mapping, ownership checks.
- `products.controller.ts`: lines 234-344, image workflow.
- `notifications.controller.ts`: user-id resolution, portal type filtering, re-computed pagination meta.
- `orders.controller.ts`:
  - 247-269: ownership check.
  - 64-131: date and page-size logic.
- `pdf.controller.ts`: lines 224-249, id parsing.
- `statistics.controller.ts`: repeated query clamping; `GET /statistics` ≡ `/statistics/orders`.
- `migrations.controller.ts`: lines 51-64, manual query parsing.

**Magic values.** Each becomes a named constant in its module, with values kept exactly:
- Cache TTLs: `300_000`, `600_000`, `120_000`.
- Day length: `86_400_000` and `1000*60*60*24`.
- Aging buckets: `30/60/90`.
- Page size: `perPage ?? 50` (about 25×).
- XLSX row cap: `10_000`.
- Stock thresholds: `5` and `10` (inconsistent; kept as-is).
- `'PROV'` (about 15×).
- Sequence type strings.
- Tenant status literals.
- `'paid'`/`'unpaid'`/`'partial'`, bypassing `InvoiceStatus` (partners.service.ts:320-386).
- bcrypt cost `10`.
- `padStart(5)`.
- FCM chunk size `500`.

**Inconsistencies.** Recorded, not changed:
- **Not found:** `invoices` and `quotes` `findOne` return `null`, so the endpoint answers 200 with null. Products, partners and categories throw 404 instead.
- **Plain `throw new Error()` (gives a 500):**
  - quotes.service ×9
  - invoices.service:328
  - categories.service:183
  - notifications.service:165, 191
  - bulk.service:43
- **Bypasses the global filter:** pdf.controller catch blocks write raw `res.status().json()`. They also use the inline code `PDF400_01`, which is not in response-codes.
- **Controllers not using `ApiRes`:**
  - tenant, tenant-lifecycle, subscription-billing and health. All are wrapped by the interceptor fallback as `GEN…_00` (Q4).
  - Delete handlers return void in warehouse, unit-of-measure, inventory-adjustment and configurations.
- **Missing `@ApiResponse`:** XLSX endpoints in reports; `orders.controller.ts:519-546`; `sequences.controller.ts:70, 102`; `health.controller.ts`.
- **Swagger is never mounted:** `SwaggerModule` is not set up anywhere, but `main.ts:70` advertises `/api/docs`.
- **Inline body types instead of DTOs:** `orders.controller.ts:387, 466, 483`, `quotes.controller.ts:263, 294, 307`, `partners.controller.ts:50`.
- **Mixed error log levels** for stock-processing failures (`error` vs `warn`).
- **Long positional signatures:** `filterOrders` takes 13 params; `getOrderAggregates` 11; `invoices.findAll` 9; `quotes.findAll` takes them in a **different order** from invoices.
- **Vague names:** `r`, `q`, `m`, `h`, `num`, `json`, `bucketed`, `fill`, `range`. Also `_updateStockQuantWithManager` and its public alias.

---

## 6. Dead code candidates

**I will not remove any of these without your approval.** Each was confirmed with a grep of `api/src`; the frontend was checked where noted.

| Item | Location | Notes |
|---|---|---|
| **Whole file** `OrdersServiceTenantAware` | `orders/orders-tenant-migration-example.ts` (241 lines) | Never imported; file deletion needs your OK. |
| **Whole file** `TransformInterceptor` | `common/interceptors/transform.interceptor.ts` | Never referenced; file deletion needs your OK. |
| `StockService.updateStockQuant` | `stock.service.ts:172-219` | 0 callers |
| `InvoicesService.recalculateStatus` + `calculateInvoiceStatus` | `invoices.service.ts:761`, `61-76` | 0 callers |
| `enrichSequenceForResponse` | `quotes.helpers.ts:15` | 0 callers |
| `ProductsService.hardDelete` | `products.service.ts:226` | 0 callers |
| `CategoriesService.getHierarchy` | `categories.service.ts:236` | Alias of `getRootCategories`; check callers first |
| `TenantLifecycleService.transition` | `tenant-lifecycle.service.ts:65-79` | 0 callers |
| `PermissionsService.findByKey`, re-export `DEFAULT_PERMISSIONS` | `permissions.service.ts:65-67, 15` | 0 callers |
| `AccessControlService.hasPermission` | `access-control.service.ts:117-120` | 0 callers |
| `StatisticsService.invalidateStatsCache` | `statistics.service.ts:178-194` | 0 callers |
| `generateSequenceId`, `buildSequencePattern` | `common/helpers/sequence.helpers.ts:11, 30` | 0 callers |
| `groupByMonth` | `reports/shared/date-range.util.ts:96` | Used only by its spec |
| `ReportExportService` | `reports/shared/report-export.service.ts` | Registered but never injected. **It is in your current WIP**, so ask before touching it. |
| `getUserIdByDeliveryId` (identity fn) + dead check | `push-notification.service.ts:213-215, 440` | |
| Unreachable `getCompanyInfo` route | `configurations.controller.ts:699-707` | Shadowed by `GET entity/:entity` (101). Removing it is safe, but it is still an API-surface edit. |
| `configurations.controller` sequence endpoints | 195-696 | The backoffice uses `/api/sequences` instead. **Not dead from the API's point of view**, so I will move them, not delete them. |
| Unreachable empty-items check | `quotes.service.ts:298-303` | |
| Unused DTO exports | `PortalProfileResponseDto`; images `DeleteImageDto`, `DeleteProductImageDto`, `GetOptimizedImageDto`, `UploadImageDto`, `UploadProductImageDto`; `UpdateCompanyDto` | |
| Unused pdf-report exports | `classAttr`, `styleAttr`, `minifyHtml`, `escapeCssUrl`, `renderReportHtml`, `resolveGenericAdapterOptions` | |
| Unused injected members (tsc `--noUnusedLocals`) | `logger` in 15 classes; `dataSource` (warehouse.service:25); 4 repositories in `order-notification.service.ts:30-42` (**WIP file**); `orderRepo` (product-reports:24); `configService` (orders.service:79); `configurationsService` (quotes.service:32); `masterDs` (migrations.service:47) | Removing a constructor parameter changes DI wiring, but it is safe. |
| ~16 response codes never referenced | `PRD.EXPORTED/TEMPLATE`, `*.DELETED` ×4, `PDF.INVOICE/QUOTE/DELIVERY_NOTE/RECEIPT`, `ACL.FORBIDDEN`, `RPT.XLSX/PDF`, … | Keep them; they serve as documentation. The `*.EXPORTED` codes are documented as binary responses. |
| Empty if-block with only comments | `auth/guards/jwt-auth.guard.ts:40-45` | |
| Placeholder notification-preferences endpoints | `notifications.controller.ts:208-240` | They return hardcoded data. They are live endpoints, so keep them. |

---

## 7. Bugs and risky behavior found (NOT fixed)

These are reported for your decision. Fixing any of them changes behavior.

### 🔴 Security / data isolation
1. **JWTs carry no tenant claim**, and every tenant shares one secret. A token from tenant A sent with `X-Tenant-ID: B` acts as the user with the same id in B (`auth/strategies/jwt.strategy.ts:15-22`).
2. **`PermissionsGuard` returns `true` for every portal-scope token** (`auth/guards/permissions.guard.ts:70`). On all `@PortalRoute` controllers, `@RequirePermission` does nothing for customers and drivers. Exposed as a result:
   - delivery-person CRUD;
   - any PDF by id;
   - notifications for any `userId`;
   - `mark-all-read` across all users;
   - printers;
   - partners and products delete.
3. **Driver and portal-user ids collide.** Both get `scope: portal` with `sub = id` (`delivery.service.ts:97-103`), so a driver can read the portal user with the same id.
4. **Privilege escalation.** A user with `users.edit` can grant super-admin or `userType=admin`, including to themselves. A user with `roles.edit` can set `isSuperAdmin`. Sending `password` resets any password without the current one (`users.service.ts:136-192`, `roles.service.ts:94,144-151`).
5. **Deactivated users keep working tokens.** `isActive` is never checked in `JwtStrategy`; `setStatus` doesn't invalidate the ACL cache.
6. **Orders by client-supplied `customerId`.** Portal order endpoints trust it (`orders.controller.ts:247-318`), so a customer may be able to read other customers' orders.
7. **Bulk job status is not tenant-checked.** Ids are sequential, and the response includes `downloadUrl` (`bulk.service.ts:72-95`).
8. **Unescaped HTML in PDF rendering.** Names, descriptions and notes are interpolated raw and rendered by Chromium with network access (`document.template.ts:269,347`, `pdf.service.ts:787,796,865`). This allows HTML injection and SSRF.
9. **Public buckets.**
   - Tenant buckets have a public-read policy, and PDF names are deterministic (`pdfs/Facture_<n>.pdf`), so they can be enumerated.
   - Drive "private" files sit in the same bucket.
   - `GET drive/raw-url` presigns any key without an ACL check.
10. **Guessable share tokens.** Built with `Math.random`, on `@Public` routes (orders, invoices, quotes).
11. **Order cache key not tenant-scoped.** `order:${id}` (`orders.service.ts:646`, `delivery.service.ts:312,340`) can serve another tenant's order.
12. **Onboarding endpoints stay open.** `createCompany` and `complete` remain `@Public` after setup and can overwrite `my_company`.
13. **CSV export.**
    - No formula-injection guard.
    - Several fields are not escaped (`platform-metrics.service.ts:894-898, 974-978`).
14. **Unvalidated sort column.** Notifications `sortBy` goes straight into `orderBy` (`notifications.service.ts:109`).

### 🟠 Correctness
15. **`createOrder` throws 404 for an unknown phone with no `customerId`.** `findByPhone` throws, but the caller expects `null` (`orders.service.ts:222-226`).
16. **`createOrder` ignores `dto.notes` and `dto.date`.** It reads `dto.note` and sets `today` instead (295, 288).
17. **Stale order cache after updates.** `getOrderById` reads outside the transaction and re-caches pre-commit data (1065, 1098). `DeliveryService.updateOrderStatus` never invalidates it either.
18. **Stock is skipped on re-validation.** Reversal movements are `DONE` with the same source, so the idempotency guard skips them (stock.service 754-766, 945-958). Delivery cancel bypasses the stock reversal (delivery.service 401-403).
19. **Quote update can lose items.** Items are deleted before the min-price check, with no transaction. `createQuoteWithNumber` leaves an orphan draft when validation fails.
20. **Min-price check uses the old partner** (`invoices.service.ts:361`, `quotes.service.ts:308`).
21. **Invoice `remainingAmount` goes stale.** `update` doesn't recalculate it, and `validate` forces `UNPAID` even when payments exist.
22. **`signQuote`/`unsignQuote` return the cached stale quote.**
23. **Search drops the direction filter.** The VENTE list can show ACHAT orders (`orders.queries.ts:123`).
24. **Concurrent creates can duplicate numbers.**
    - PROV numbering is not atomic.
    - `releaseNumber` can decrement another period's counter.
    - Adjustment `validate` has no row lock.
25. **Reports:**
    - **Date range shifted by timezone.** `toSqlDate` uses UTC, so in UTC+1 every range is off by one day (`reports/shared/date-range.util.ts:88`).
    - **Category filter always fails.** `p.categoryId` is not a column, so filtering by category in stock reports throws a SQL error (stock-reports 68,146).
    - **Revenue double-counted.** Products in N categories are counted N times (sales 310).
    - **KPIs computed from one page.** `topProduct`, `avgMarginRate` and `overdueCount` use the current page's rows only.
    - **Drafts counted as revenue.**
    - **Supplier statement sign convention.**
    - **Opening balance ignored.**
26. **Statistics:**
    - **Status counts ignore the date range.** `.clone().where()` replaces the earlier filters (statistics.service 343-361).
    - **Wrong previous period for month-to-date at month end.**
    - **Fake data shown as real.** The low-stock activity timestamp is `Math.random()`; "daily goal" is hardcoded.
    - **Revenue mixes purchases and cancelled orders.**
27. **Platform metrics:**
    - The `activeUsers` delta compares unlike values.
    - The collector mixes timezones.
    - Concurrent collect can return 500.
    - Usage counters are lost for new tenants.
28. **Tenant lifecycle:**
    - **Transitions not enforced.** `activate` and `activateFromPayment` bypass `ALLOWED_TRANSITIONS`.
    - **Two divergent state machines.** `TenantService` and `TenantLifecycleService` each track tenant status separately.
    - **Database dropped with open connections.**
    - **Connection-pool race and eviction problems.**
    - **Multi-step create with no rollback.**
    - **`updateInstallment` re-activates.**
    - **Duplicate route.** `GET admin/tenants/:id/activity` is defined in both controllers.
29. **Tenant-exclusion lists differ** between `app.module.ts` and `tenant.middleware.ts`.
30. **Validation bypassed on some endpoints:**
    - **`supplierId` on bulk export always gets a 400.** `StartExportDto` has no validators, and `forbidNonWhitelisted` is on.
    - **`performedBy` is never accepted.** Sending it returns a 400, so the audit identity is never recorded.
31. **Crashes or failures from bad input:**
    - Invalid dates or `NaN` paging give a 500 (statistics, migrations, inventory-adjustment `LIMIT ${limit}`).
    - FCM multicast is not chunked, so it fails above 500 tokens.
    - Notification dedup drops repeated alerts.
32. **`uncaughtException` handler logs and continues** (`main.ts:149-153`).
33. **`numericTransformer` maps `null` → `0`** for nullable decimal columns.

### 🟡 Performance (fix only where results stay identical)
- **One query per item or row:**
  - stock processing: about 7 queries per item;
  - product import: `findOne` + `save` per row;
  - adjustment create: per line, while `saveLinesInBatch` exists;
  - drive browse: `findOne` per object;
  - notification insert: per admin;
  - permission seeding: per permission;
  - per-tenant `logRepo.findOne` in seeders and migrations.
- **Independent queries awaited one after another:**
  - statistics: 235-253, 424-500;
  - platform-metrics `getHealth`;
  - notifications `getStats`.
  - These are safe to run in `Promise.all` (results unchanged).
- **Rebuilt or repeated queries:**
  - `filterOrders` runs 3 round trips and re-applies the date filter 4×;
  - reports rebuild their WHERE clause 3×;
  - an unused query builder is created in purchases and invoice reports.
- **Loads everything, pages in memory:** grouped reports use `slice` pagination; anti-join reports load whole tables; analytics load all rows into JS.
- **Over-fetching:** list endpoints join items; `categories.findOne` loads and caches all products.

---

## 8. Test coverage per endpoint

418 endpoints across 49 controllers. **Endpoint-level (controller) tests exist for only 4 controllers.** Service-level specs exist for a few more.

| Area | Controller spec | Service spec | Endpoints |
|---|---|---|---|
| access | ✅ | ✅ | 3 |
| products | ✅ | ✅ | 12 |
| inventory stock / stock-movement | ✅ / ✅ | ✅ stock.service | 8 / 7 |
| inventory adjustment / warehouse | ❌ | ⚠️ spec exists but is currently failing | 9 / 5 |
| portal | ❌ | ✅ portal.service | 24 |
| orders | ❌ | only `orders-merge-summary` helper | 24 + 8 payments |
| reports: client, invoice, payment, purchases, sales, stock | ❌ | ✅ | 32 |
| reports: supplier, product | ❌ | ❌ | 8 |
| pdf-report (builder/mappers/clients) | n/a | ✅ | — |
| **Everything else** (invoices, quotes, partners, configurations, sequences, notifications, delivery, drive, pdf, statistics, platform-metrics, tenant, tenant-lifecycle, subscription-billing, users, roles, permissions, onboarding, super-admin, categories, brands, payments, printers, bulk, images, health) | ❌ | ❌ | ~290 |

**Phase 2 consequence.** Every target in §9 apart from products, stock and the 6 tested report services needs characterization tests first. My planned approach (pending Q3):
- **Services:** Nest `TestingModule` specs with a mocked `TenantConnectionService`. They assert returned shapes, thrown exception types and messages, and the repository calls made.
- **Query builders:** snapshot `getQueryAndParameters()`.
- **Controllers being slimmed:** controller specs that assert the `ApiRes` code and payload.

---

## 9. Proposed refactoring order (highest impact, lowest risk first)

Each step = one commit, with the full test suite run before and after.

| # | Step | Impact | Risk | Tests to add first |
|---|---|---|---|---|
| 1 | **Dead code removal** (§6, approved items only) + unused injected members | Med | Very low | none (tsc + existing suite) |
| 2 | **Reports shared helpers**: D27-D30 (client/supplier, journals, aging, cache/pagination boilerplate) and splitting their long methods | High (about 600 duplicated lines) | Low | supplier-reports, product-reports specs + SQL snapshots for all 8 |
| 3 | **`pdf.controller` `sendPdf`** + `pdf.service` private helpers (D20-D21) | Med | Low | pdf.controller spec (headers, status, error JSON) |
| 4 | **`portal.controller` → `PortalService`** (D18) | High (fat controller, 24 endpoints) | Low-Med | portal.controller spec |
| 5 | **`configurations.controller` → service** (D19), reusing the sequences format helper | High | Med | configurations.controller spec (sequence endpoints) |
| 6 | **Invoices/quotes/orders controller query parsing** (D4) + export rows (D2) + aggregates (D6) + share-token (D10) | High | Low | invoices/quotes controller specs; export-row specs |
| 7 | **`orders.service`**: D7, D14, the `createOrder`/`filterOrders`/`processOrderStock` splits, D1 | Very high | Med | orders.service spec + `filterOrders` SQL snapshots. **Blocked on Q1** (WIP in the same file). |
| 8 | **`stock.service`**: `runInTransaction`, long-function splits, D16/D17 | High | Med | extend stock.service.spec; fix adjustment spec (Q2) |
| 9 | **`products.controller` image workflow → service** (D15) | Med | Low | existing products specs |
| 10 | **Notifications**: controller user-id helper, D24, `sendToTokens` split | Med | Low-Med | notifications controller and service specs |
| 11 | **Tenant/lifecycle helpers** D25/D26; `TenantMiddleware.use` split; `main.ts` `bootstrap` split; `MASTER_ENTITIES` | Med | Med (boot path) | middleware spec; boot smoke test (`createNestApplication`) |
| 12 | **Statistics / platform-metrics** splits + D31/D32 | Med | Low-Med | service specs + SQL snapshots. Statistics is **WIP** (Q1). |
| 13 | **`SequencesService.generateNext`/`releaseNumber`** split | Med | **High** (locking, concurrency) | dedicated spec covering advance/backdated/same-period paths |
| 14 | **Partners analytics** D13; **invoices/quotes** service splits; D5, D8, D9 | Med | Med | invoices/quotes/partners service specs |
| 15 | **Named constants** for magic values (module-local, values unchanged) | Low-Med | Very low | none |

Checkpoint after steps 1 and 2 for your style review, as requested.

---

## Appendix A: all functions over 50 lines (excluding migrations)

| Lines | Function | Location |
|---|---|---|
| 395 | `renderReceiptTemplate` | src/modules/pdf/templates/receipt.template.ts:22-416 |
| 353 | `renderThemeStyles` | src/modules/pdf-report/templates/theme.styles.ts:16-368 |
| 314 | `renderOrdersMergeTemplate` | src/modules/pdf/templates/orders-merge.template.ts:68-381 |
| 246 | `getDocumentStyles` | src/modules/pdf/templates/document.styles.ts:1-246 |
| 195 | `OrdersService.createOrder` | src/modules/orders/orders.service.ts:210-404 |
| 195 | `seedTestData` | src/test/seed-test-data.ts:214-408 |
| 187 | `SequencesService.generateNext` | src/modules/sequences/sequences.service.ts:203-389 |
| 184 | `syncAccessControl` | src/database/seeders/access-control.seeder.ts:100-283 |
| 152 | `StockService.processDocumentStockMovementsOnce` | src/modules/inventory/stock.service.ts:740-891 |
| 150 | `renderDocumentTemplate` | src/modules/pdf/templates/document.template.ts:209-358 |
| 147 | `bootstrap` | src/main.ts:12-158 |
| 145 | `PushNotificationService.sendToTokens` | src/modules/notifications/push-notification.service.ts:220-364 |
| 133 | `InvoiceReportsService.getAgingBalance` | src/modules/reports/invoices/invoice-reports.service.ts:392-524 |
| 125 | `StockService.reverseDocumentStockMovements` | src/modules/inventory/stock.service.ts:905-1029 |
| 115 | `ClientReportsService.getCustomerAging` | src/modules/reports/partners/client-reports.service.ts:128-242 |
| 115 | `SupplierReportsService.getSupplierAging` | src/modules/reports/partners/supplier-reports.service.ts:128-242 |
| 114 | `StatisticsService.getRecentActivities` | src/modules/statistics/statistics.service.ts:414-527 |
| 107 | `OrdersService.filterOrders` | src/modules/orders/orders.service.ts:455-561 |
| 104 | `ClientReportsService.getCustomerStatement` | src/modules/reports/partners/client-reports.service.ts:340-443 |
| 103 | `SupplierReportsService.getSupplierStatement` | src/modules/reports/partners/supplier-reports.service.ts:245-347 |
| 102 | `InvoicesService.validate` | src/modules/invoices/invoices.service.ts:446-547 |
| 100 | `PurchasesReportsService.getPurchasesByPeriod` | src/modules/reports/purchases/purchases-reports.service.ts:37-136 |
| 98 | `InventoryAdjustmentService.validate` | src/modules/inventory/inventory-adjustment.service.ts:206-303 |
| 98 | `renderHeaderTemplate` | src/modules/pdf/templates/document.template.ts:49-146 |
| 95 | `StockService.validateMovement` | src/modules/inventory/stock.service.ts:282-376 |
| 95 | `SalesReportsService.getRevenueReport` | src/modules/reports/sales/sales-reports.service.ts:41-135 |
| 94 | `ProductReportsService.getMarginAnalysis` | src/modules/reports/products/product-reports.service.ts:133-226 |
| 93 | `ClientReportsService.getInactiveCustomers` | src/modules/reports/partners/client-reports.service.ts:245-337 |
| 92 | `InvoicesService.update` | src/modules/invoices/invoices.service.ts:332-423 |
| 90 | `PlatformMetricsService.buildAlerts` | src/modules/platform-metrics/platform-metrics.service.ts:588-677 |
| 90 | `TenantMiddleware.use` | src/modules/tenant/tenant.middleware.ts:42-131 |
| 89 | `NotificationsService.findAll` | src/modules/notifications/notifications.service.ts:27-115 |
| 88 | `DeliveryService.updateOrderStatus` | src/modules/delivery/delivery.service.ts:343-430 |
| 88 | `renderTable` | src/modules/pdf-report/templates/components/data-table.component.ts:73-160 |
| 87 | `buildOrdersMergeSummary` | src/modules/orders/orders.helpers.ts:456-542 |
| 87 | `StockReportsService.getMovementsJournal` | src/modules/reports/stock/stock-reports.service.ts:204-290 |
| 86 | `OnboardingService.createAdmin` | src/modules/onboarding/onboarding.service.ts:127-212 |
| 86 | `PDFService.renderDocumentHTML` | src/modules/pdf/pdf.service.ts:756-841 |
| 86 | `ProductReportsService.getProductPerformance` | src/modules/reports/products/product-reports.service.ts:45-130 |
| 86 | `SalesReportsService.getSalesByPos` | src/modules/reports/sales/sales-reports.service.ts:365-450 |
| 85 | `SalesReportsService.getTopProducts` | src/modules/reports/sales/sales-reports.service.ts:138-222 |
| 84 | `OrdersService.processOrderStockIfConfigured` | src/modules/orders/orders.service.ts:809-892 |
| 84 | `renderHeader` | src/modules/pdf-report/templates/header.template.ts:67-150 |
| 84 | `InvoiceReportsService.getJournalVente` | src/modules/reports/invoices/invoice-reports.service.ts:53-136 |
| 84 | `InvoiceReportsService.getJournalAchat` | src/modules/reports/invoices/invoice-reports.service.ts:139-222 |
| 84 | `StatisticsService.getSalesSeries` | src/modules/statistics/statistics.service.ts:666-749 |
| 82 | `NotificationTemplateService.dispatchToRecipient` | src/modules/notifications/notification-template.service.ts:174-255 |
| 82 | `InvoiceReportsService.getTvaSummary` | src/modules/reports/invoices/invoice-reports.service.ts:225-306 |
| 82 | `StatisticsService.getDashboard` | src/modules/statistics/statistics.service.ts:536-617 |
| 81 | `InvoiceReportsService.getOutstanding` | src/modules/reports/invoices/invoice-reports.service.ts:309-389 |
| 80 | `PlatformMetricsService.getHealth` | src/modules/platform-metrics/platform-metrics.service.ts:739-818 |
| 79 | `applyOrderFilters` | src/modules/orders/orders.queries.ts:100-178 |
| 78 | `renderBaseLayout` | src/modules/pdf-report/templates/base-layout.template.ts:29-106 |
| 78 | `mapImportRow` | src/modules/products/products.helpers.ts:60-137 |
| 77 | `QuotesService.update` | src/modules/quotes/quotes.service.ts:279-355 |
| 76 | `MigrationsService.getTenantMigrationStatus` | src/modules/super-admin/migrations.service.ts:93-168 |
| 75 | `PlatformMetricsService.getTenantRows` | src/modules/platform-metrics/platform-metrics.service.ts:359-433 |
| 75 | `PlatformMetricsService.exportCsv` | src/modules/platform-metrics/platform-metrics.service.ts:854-928 |
| 75 | `ProductsService.importFromXlsx` | src/modules/products/products.service.ts:295-369 |
| 75 | `StockReportsService.getStockValuation` | src/modules/reports/stock/stock-reports.service.ts:52-126 |
| 75 | `SequencesService.releaseNumber` | src/modules/sequences/sequences.service.ts:444-518 |
| 75 | `UsersService.update` | src/modules/users/users.service.ts:124-198 |
| 74 | `StockService.findAllMovements` | src/modules/inventory/stock.service.ts:431-504 |
| 74 | `NotificationsController.getNotifications` | src/modules/notifications/notifications.controller.ts:60-133 |
| 73 | `ConfigurationsService.findByEntity` | src/modules/configurations/configurations.service.ts:70-142 |
| 73 | `StockReportsService.getLowStock` | src/modules/reports/stock/stock-reports.service.ts:129-201 |
| 72 | `ClientReportsService.getTopCustomers` | src/modules/reports/partners/client-reports.service.ts:54-125 |
| 72 | `SupplierReportsService.getTopSuppliers` | src/modules/reports/partners/supplier-reports.service.ts:54-125 |
| 72 | `resolveDateRange` | src/modules/reports/shared/date-range.util.ts:12-83 |
| 71 | `ConfigurationsController.calculateNextSequenceNumber` | src/modules/configurations/configurations.controller.ts:364-434 |
| 71 | `PDFService.generateA5PDF` | src/modules/pdf/pdf.service.ts:640-710 |
| 71 | `ProductsController.uploadProductImage` | src/modules/products/products.controller.ts:222-292 |
| 71 | `StockReportsService.getSlowDeadStock` | src/modules/reports/stock/stock-reports.service.ts:293-363 |
| 70 | `PDFController.generateOrdersMergePDF` | src/modules/pdf/pdf.controller.ts:202-271 |
| 68 | `DriveService.getStats` | src/modules/drive/drive.service.ts:719-786 |
| 68 | `PortalController.getUserByPhone` | src/modules/portal/portal.controller.ts:290-357 |
| 68 | `PurchasesReportsService.getTopSuppliers` | src/modules/reports/purchases/purchases-reports.service.ts:139-206 |
| 68 | `PurchasesReportsService.getPurchasesByProduct` | src/modules/reports/purchases/purchases-reports.service.ts:209-276 |
| 68 | `SalesReportsService.getSalesByCustomer` | src/modules/reports/sales/sales-reports.service.ts:225-292 |
| 68 | `SalesReportsService.getSalesByCategory` | src/modules/reports/sales/sales-reports.service.ts:295-362 |
| 68 | `SeedersService.execute` | src/modules/super-admin/seeders.service.ts:371-438 |
| 67 | `AllExceptionsFilter.catch` | src/common/filters/all-exceptions.filter.ts:16-82 |
| 67 | `createReportFormatter` | src/modules/pdf-report/core/report-formatter.ts:54-120 |
| 67 | `ProductsController.findAll` | src/modules/products/products.controller.ts:110-176 |
| 67 | `SubscriptionBillingService.updateInstallment` | src/modules/tenant-lifecycle/subscription-billing.service.ts:445-511 |
| 66 | `TenantService.getStats` | src/modules/tenant/tenant.service.ts:331-396 |
| 65 | `UsageTrackerService.flushDailyEntry` | src/modules/platform-metrics/usage-tracker.service.ts:238-302 |
| 64 | `ProductReportsService.getNeverSoldProducts` | src/modules/reports/products/product-reports.service.ts:229-292 |
| 63 | `DriveStorageService.listObjects` | src/modules/drive/drive-storage.service.ts:145-207 |
| 63 | `OrdersService.devalidate` | src/modules/orders/orders.service.ts:948-1010 |
| 63 | `renderFooter` | src/modules/pdf-report/templates/footer.template.ts:14-76 |
| 63 | `MetricsCollectorService.collectAll` | src/modules/platform-metrics/metrics-collector.service.ts:114-176 |
| 63 | `PlatformMetricsService.toMetricRow` | src/modules/platform-metrics/platform-metrics.service.ts:435-497 |
| 63 | `StatisticsService.getOrderStatistics` | src/modules/statistics/statistics.service.ts:212-274 |
| 63 | `SubscriptionBillingService.addInstallment` | src/modules/tenant-lifecycle/subscription-billing.service.ts:381-443 |
| 62 | `ConfigurationsController.generateSequenceWithNumber` | src/modules/configurations/configurations.controller.ts:509-570 |
| 62 | `SeedersService.buildStatus` | src/modules/super-admin/seeders.service.ts:164-225 |
| 61 | `OrdersService.getOrderAggregates` | src/modules/orders/orders.service.ts:563-623 |
| 61 | `PartnersService.getCustomerAnalytics` | src/modules/partners/partners.service.ts:288-348 |
| 61 | `PartnersService.getSupplierAnalytics` | src/modules/partners/partners.service.ts:350-410 |
| 61 | `PaymentReportsService.getCashflow` | src/modules/reports/payments/payment-reports.service.ts:37-97 |
| 61 | `TenantService.create` | src/modules/tenant/tenant.service.ts:212-272 |
| 60 | `applyPaymentTrigger` | src/database/init-scripts/payment-trigger.init.ts:12-71 |
| 60 | `OrdersController.filterOrders` | src/modules/orders/orders.controller.ts:51-110 |
| 60 | `aggregatePartnerInvoices` | src/modules/partners/partners.helpers.ts:39-98 |
| 59 | `ConfigurationsController.generateSequenceExample` | src/modules/configurations/configurations.controller.ts:634-692 |
| 59 | `InventoryAdjustmentService.generateCountingList` | src/modules/inventory/inventory-adjustment.service.ts:335-393 |
| 59 | `buildInvoiceExportRows` | src/modules/invoices/invoices.helpers.ts:44-102 |
| 59 | `ReportPdfResolver.constructor` | src/modules/reports/pdf/report-pdf.resolver.ts:32-90 |
| 58 | `ConfigurationsController.createSequence` | src/modules/configurations/configurations.controller.ts:196-253 |
| 58 | `DeliveryService.assignOrderToDelivery` | src/modules/delivery/delivery.service.ts:257-314 |
| 58 | `InvoicesService.getAnalytics` | src/modules/invoices/invoices.service.ts:603-660 |
| 58 | `SalesSummaryMapper.buildOrdersTable` | src/modules/pdf-report/reports/sales-summary/sales-summary.mapper.ts:127-184 |
| 58 | `UsageTrackerService.record` | src/modules/platform-metrics/usage-tracker.service.ts:89-146 |
| 58 | `UsageTrackerService.flushHourlyEntry` | src/modules/platform-metrics/usage-tracker.service.ts:324-381 |
| 58 | `PortalController.login` | src/modules/portal/portal.controller.ts:81-138 |
| 58 | `MigrationsService.revertLastMigrationForTenant` | src/modules/super-admin/migrations.service.ts:203-260 |
| 58 | `SubscriptionBillingService.update` | src/modules/tenant-lifecycle/subscription-billing.service.ts:262-319 |
| 57 | `main` | src/scripts/migrate-all-tenants.ts:38-94 |
| 56 | `OrdersService.bulkRemove` | src/modules/orders/orders.service.ts:1281-1336 |
| 56 | `UsageTrackingInterceptor.intercept` | src/modules/platform-metrics/usage-tracking.interceptor.ts:29-84 |
| 56 | `QuotesService.createQuoteWithNumber` | src/modules/quotes/quotes.service.ts:222-277 |
| 56 | `SubscriptionBillingService.validateInstallment` | src/modules/tenant-lifecycle/subscription-billing.service.ts:513-568 |
| 55 | `PermissionsGuard.canActivate` | src/modules/auth/guards/permissions.guard.ts:58-112 |
| 55 | `InvoicesService.createInvoiceWithNumber` | src/modules/invoices/invoices.service.ts:276-330 |
| 55 | `OrdersService.updateOrder` | src/modules/orders/orders.service.ts:1014-1068 |
| 55 | `PDFService.renderOrdersMergePDF` | src/modules/pdf/pdf.service.ts:304-358 |
| 55 | `PDFService.renderReceiptHTML` | src/modules/pdf/pdf.service.ts:843-897 |
| 55 | `SequencesService.update` | src/modules/sequences/sequences.service.ts:635-689 |
| 55 | `TenantService.findAll` | src/modules/tenant/tenant.service.ts:148-202 |
| 54 | `renderFooterTemplate` | src/modules/pdf/templates/document.template.ts:151-204 |
| 54 | `buildQuoteExportRows` | src/modules/quotes/quotes.helpers.ts:67-120 |
| 54 | `QuotesService.findAll` | src/modules/quotes/quotes.service.ts:85-138 |
| 54 | `QuotesService.getAnalytics` | src/modules/quotes/quotes.service.ts:613-666 |
| 54 | `StockReportsService.getStockByWarehouse` | src/modules/reports/stock/stock-reports.service.ts:366-419 |
| 53 | `check` | src/database/seeders/access-control.seeder.ts:304-356 |
| 53 | `InvoicesService.findAll` | src/modules/invoices/invoices.service.ts:138-190 |
| 53 | `InvoicesService.getAggregates` | src/modules/invoices/invoices.service.ts:192-244 |
| 53 | `OrdersService.getCustomerOrders` | src/modules/orders/orders.service.ts:707-759 |
| 53 | `QuotesService.devalidate` | src/modules/quotes/quotes.service.ts:407-459 |
| 52 | `run` | src/database/seeders/sequences.seeder.ts:163-214 |
| 52 | `DeliveryService.getDeliveryPersonOrders` | src/modules/delivery/delivery.service.ts:204-255 |
| 52 | `DriveService.uploadFile` | src/modules/drive/drive.service.ts:247-298 |
| 52 | `StockService.createMovement` | src/modules/inventory/stock.service.ts:226-277 |
| 52 | `MetricsCollectorService.upsertSnapshot` | src/modules/platform-metrics/metrics-collector.service.ts:466-517 |
| 52 | `createQueueBoardAuthMiddleware` | src/modules/queue-board/queue-board-auth.factory.ts:20-71 |
| 51 | `DeliveryController.getDeliveryPersonOrders` | src/modules/delivery/delivery.controller.ts:145-195 |
| 51 | `InvoicesService.devalidate` | src/modules/invoices/invoices.service.ts:549-599 |
| 51 | `resolveReportConfig` | src/modules/pdf-report/core/resolve-report-config.ts:41-91 |
| 51 | `PortalController.adminLogin` | src/modules/portal/portal.controller.ts:140-190 |
| 51 | `PortalController.register` | src/modules/portal/portal.controller.ts:192-242 |
| 51 | `ProductsController.deleteProductImage` | src/modules/products/products.controller.ts:294-344 |
| 51 | `QuotesService.getAggregates` | src/modules/quotes/quotes.service.ts:140-190 |
| 51 | `RolesService.update` | src/modules/roles/roles.service.ts:112-162 |
| 51 | `SequencesService.create` | src/modules/sequences/sequences.service.ts:583-633 |

## Appendix B: files of 300 lines or more

| Lines | Longest fn | File |
|---|---|---|
| 1855 | 20 | src/common/response-codes.ts |
| 1537 | 195 | src/modules/orders/orders.service.ts |
| 1169 | 152 | src/modules/inventory/stock.service.ts |
| 1059 | 86 | src/modules/pdf/pdf.service.ts |
| 980 | 90 | src/modules/platform-metrics/platform-metrics.service.ts |
| 921 | 114 | src/modules/statistics/statistics.service.ts |
| 843 | 67 | src/modules/tenant-lifecycle/subscription-billing.service.ts |
| 837 | 68 | src/modules/drive/drive.service.ts |
| 835 | 68 | src/modules/portal/portal.controller.ts |
| 773 | 187 | src/modules/sequences/sequences.service.ts |
| 770 | 102 | src/modules/invoices/invoices.service.ts |
| 721 | 71 | src/modules/configurations/configurations.controller.ts |
| 704 | 77 | src/modules/quotes/quotes.service.ts |
| 645 | 66 | src/modules/tenant/tenant.service.ts |
| 593 | 42 | src/common/access/access-modules.ts |
| 569 | 133 | src/modules/reports/invoices/invoice-reports.service.ts |
| 568 | 63 | src/modules/platform-metrics/metrics-collector.service.ts |
| 548 | 60 | src/modules/orders/orders.controller.ts |
| 543 | 87 | src/modules/orders/orders.helpers.ts |
| 510 | 37 | src/modules/notifications/order-notification.service.ts |
| 505 | 68 | src/modules/super-admin/seeders.service.ts |
| 497 | 19 | src/modules/drive/drive.controller.ts |
| 483 | 95 | src/modules/reports/sales/sales-reports.service.ts |
| 483 | 47 | src/modules/tenant-lifecycle/tenant-lifecycle.service.ts |
| 474 | 98 | src/modules/inventory/inventory-adjustment.service.ts |
| 473 | 145 | src/modules/notifications/push-notification.service.ts |
| 465 | 115 | src/modules/reports/partners/client-reports.service.ts |
| 443 | 87 | src/modules/reports/stock/stock-reports.service.ts |
| 439 | 71 | src/modules/products/products.controller.ts |
| 432 | 88 | src/modules/delivery/delivery.service.ts |
| 430 | 40 | src/database/seeders/uom.seeder.ts |
| 420 | 65 | src/modules/platform-metrics/usage-tracker.service.ts |
| 417 | 395 | src/modules/pdf/templates/receipt.template.ts |
| 412 | 0 | src/modules/inventory/dto/inventory-response.dto.ts |
| 412 | 61 | src/modules/partners/partners.service.ts |
| 409 | 195 | src/test/seed-test-data.ts |
| 402 | 75 | src/modules/products/products.service.ts |
| 393 | 74 | src/modules/notifications/notifications.controller.ts |
| 391 | 184 | src/database/seeders/access-control.seeder.ts |
| 382 | 314 | src/modules/pdf/templates/orders-merge.template.ts |
| 377 | 0 | src/modules/notifications/notification-templates.defaults.ts |
| 369 | 353 | src/modules/pdf-report/templates/theme.styles.ts |
| 369 | 115 | src/modules/reports/partners/supplier-reports.service.ts |
| 359 | 150 | src/modules/pdf/templates/document.template.ts |
| 358 | 44 | src/modules/notifications/scheduled-notifications.service.ts |
| 352 | 44 | src/modules/quotes/quotes.controller.ts |
| 333 | 76 | src/modules/super-admin/migrations.service.ts |
| 318 | 82 | src/modules/notifications/notification-template.service.ts |
| 316 | 94 | src/modules/reports/products/product-reports.service.ts |
| 306 | 100 | src/modules/reports/purchases/purchases-reports.service.ts |
