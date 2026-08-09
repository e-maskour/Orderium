# `pdf-report`

Reusable, branded PDF reporting for every report type in the app. One engine,
one layout, one API client — report types are just data mappers.

```
pdf-report/
├── core/          engine, formatter, config resolution, API client + vendor adapters
├── templates/     base layout, running header/footer, styles, reusable components
├── reports/       per-report data mappers (the only place a report type lives)
├── types/         exported interfaces + typed errors
└── __tests__/     mapper, client, engine and module tests
```

## Usage

```ts
@Module({ imports: [PdfReportModule] })
export class SalesModule {}
```

```ts
constructor(private readonly pdfReports: PdfReportService) {}

const report = await this.pdfReports.generateReport<SalesSummaryData>(
  {
    reportType: SALES_SUMMARY_REPORT_TYPE,
    branding: {
      companyName: 'Acme SARL',
      logo: { url: tenantLogoUrl },              // or { base64, mimeType }
      address: { line1: '12 rue des Fleurs', city: 'Casablanca' },
      contact: { phone: '+212 5 22 00 00 00', email: 'contact@acme.ma' },
      identifiers: { commonCompanyId: '001234567000089', taxId: '45678912' },
      theme: { primary: '#0f766e' },             // optional per-tenant re-skin
    },
    footer: { note: 'Document confidentiel — usage interne.' },
    meta: [{ label: 'Période', value: 'Janvier 2026' }],
  },
  salesData,
);

res
  .set('Content-Type', report.contentType)
  .set('Content-Disposition', `attachment; filename="${report.fileName}"`)
  .send(report.buffer);
```

`PdfReportService.renderHtml(config, data)` returns the composed HTML without
calling the API — useful for previewing a template locally.

## Adding a report type

1. Add `reports/<name>/<name>.types.ts` — the payload interface.
2. Add `reports/<name>/<name>.mapper.ts` — implement `ReportMapper<TData>`,
   returning `ReportDocument` blocks (`kpi-grid`, `section`, `table`,
   `key-values`, `text`, `page-break`, `html`).
3. Add the class to `REPORT_MAPPER_CLASSES` in `pdf-report.module.ts`.

Nothing in `core/` or `templates/` changes. The branded header, footer, page
numbering, theming and API transport come for free.

## Configuration

**None required.** Reports render in-process with the Chromium that Playwright
already ships for the invoice renderer in `modules/pdf`, so there is no API key,
no per-document cost, and report HTML — which carries tenant financial data —
never leaves the deployment.

`PlaywrightPdfApiClient` pools one headless browser per process, launched lazily
on the first report and closed on module destroy.

## Swapping in a hosted vendor

`PdfApiClient` is a one-method seam. To render through a third-party service
instead, rebind `PDF_API_CLIENT` in `pdf-report.module.ts`:

```ts
const pdfApiClientProvider: Provider = {
  provide: PDF_API_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PdfApiClient =>
    new HttpPdfApiClient({
      authProvider: () => resolvePdfApiAuth(config),
      adapter: new GenericHtmlToPdfAdapter(resolveGenericAdapterOptions(config)),
      retry: resolvePdfApiRetryOptions(config),
    }),
};
```

Then set these variables:

| Variable                | Required | Default         | Purpose                                |
| ----------------------- | -------- | --------------- | -------------------------------------- |
| `PDF_API_KEY`           | yes      | —               | API credential                          |
| `PDF_API_URL`           | yes      | —               | Render endpoint                         |
| `PDF_API_AUTH_HEADER`   | no       | `Authorization` | Header carrying the key                 |
| `PDF_API_AUTH_SCHEME`   | no       | `Bearer`        | Value prefix; empty sends the raw key   |
| `PDF_API_RESPONSE_MODE` | no       | `binary`        | `binary` \| `base64` \| `url`           |
| `PDF_API_RESPONSE_PATH` | no       | `data`          | JSON dot-path for `base64`/`url` modes  |
| `PDF_API_TIMEOUT_MS`    | no       | `30000`         | Per-attempt timeout                     |
| `PDF_API_MAX_ATTEMPTS`  | no       | `3`             | Total attempts including the first      |
| `PDF_API_RETRY_BASE_MS` | no       | `500`           | First backoff delay                     |

`GenericHtmlToPdfAdapter` sends the flat Chromium option set (`html`, `format`,
`margin`, `headerTemplate`, `footerTemplate`). Most vendors nest those under an
`options` object or rename `html`; when a contract diverges, implement
`PdfApiVendorAdapter` in `core/vendors/` and pass it to the client instead.

## Page numbering

- `native` (default) — the header/footer are sent as separate page templates and
  the service substitutes `.pageNumber` / `.totalPages`. Works with
  Chromium-backed APIs.
- `css-paged` — running elements live in the document and page numbers come from
  `counter(page)` / `counter(pages)`. Use with PrinceXML/WeasyPrint-style engines.

Set it per report via `ReportConfig.pageNumbering`.
