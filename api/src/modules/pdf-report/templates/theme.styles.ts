import { ResolvedReportConfig } from '../types';

/**
 * The single stylesheet for every report.
 *
 * Design decisions encoded here:
 *  - **Spacing scale** — a 4px base (`--sp-1` … `--sp-8`); nothing uses ad-hoc
 *    values, so vertical rhythm stays consistent across report types.
 *  - **Type scale** — six steps derived from the theme's base size, in points
 *    (print units) rather than pixels.
 *  - **Colour** — only the tokens from `ReportTheme`. Meaning is never carried
 *    by colour alone; badges also carry text.
 *  - **Paged media** — `@page` owns the geometry, and every block declares its
 *    break behaviour so tables and cards never split badly.
 */
export function renderThemeStyles(config: ResolvedReportConfig): string {
  const { theme, page, direction } = config;
  const size = theme.baseFontSizePt;

  return `
:root {
  --c-primary: ${theme.primary};
  --c-primary-dark: ${theme.primaryDark};
  --c-accent: ${theme.accent};
  --c-text-strong: ${theme.textStrong};
  --c-text: ${theme.textBase};
  --c-muted: ${theme.textMuted};
  --c-border: ${theme.border};
  --c-surface: ${theme.surface};
  --c-surface-alt: ${theme.surfaceAlt};
  --c-bg: ${theme.background};
  --c-positive: ${theme.positive};
  --c-negative: ${theme.negative};

  --fs-xs: ${(size * 0.78).toFixed(2)}pt;
  --fs-sm: ${(size * 0.89).toFixed(2)}pt;
  --fs-base: ${size}pt;
  --fs-md: ${(size * 1.15).toFixed(2)}pt;
  --fs-lg: ${(size * 1.45).toFixed(2)}pt;
  --fs-xl: ${(size * 2).toFixed(2)}pt;

  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-8: 48px;

  --radius: ${theme.radiusPx}px;
  --radius-sm: ${Math.max(2, Math.round(theme.radiusPx / 2))}px;
}

@page {
  size: ${page.format} ${page.landscape ? 'landscape' : 'portrait'};
  margin: ${page.margins.top} ${page.margins.right} ${page.margins.bottom} ${page.margins.left};
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--c-bg);
}

body {
  font-family: ${theme.fontFamily};
  font-size: var(--fs-base);
  line-height: 1.45;
  color: var(--c-text);
  direction: ${direction};
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ---------------------------------------------------------------- headings */

.doc-title {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--c-text-strong);
}

.doc-subtitle {
  margin: var(--sp-1) 0 0;
  font-size: var(--fs-md);
  font-weight: 400;
  color: var(--c-muted);
}

.doc-summary {
  margin: var(--sp-3) 0 0;
  max-width: 62em;
  font-size: var(--fs-sm);
  color: var(--c-text);
}

.title-block {
  padding-bottom: var(--sp-4);
  margin-bottom: var(--sp-5);
  border-bottom: 2px solid var(--c-primary);
}

/* Filter/criteria chips under the title. */
.meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}

.meta-chip {
  padding: 3px var(--sp-2);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface-alt);
  font-size: var(--fs-xs);
  color: var(--c-text);
  white-space: nowrap;
}

.meta-chip strong {
  color: var(--c-muted);
  font-weight: 600;
  margin-inline-end: var(--sp-1);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ---------------------------------------------------------------- sections */

.section {
  margin-bottom: var(--sp-5);
  break-inside: auto;
}

.section--break-before { break-before: page; }

.section-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
  /* Never leave a section title stranded at the bottom of a page. */
  break-after: avoid;
}

.section-title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 650;
  color: var(--c-primary-dark);
  letter-spacing: -0.01em;
}

.section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 0.85em;
  margin-inline-end: var(--sp-2);
  border-radius: 2px;
  background: var(--c-primary);
  vertical-align: baseline;
}

.section-desc {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--c-muted);
}

.section-body > *:last-child { margin-bottom: 0; }

/* -------------------------------------------------------------- KPI cards */

.kpi-grid {
  display: grid;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}

.kpi-card {
  position: relative;
  padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  break-inside: avoid;
}

/* Accent bar — inline-start so it flips correctly in RTL. */
.kpi-card::before {
  content: '';
  position: absolute;
  inset-block: var(--sp-2);
  inset-inline-start: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--kpi-accent, var(--c-primary));
}

.kpi-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--c-muted);
}

.kpi-value {
  margin-top: var(--sp-1);
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.kpi-hint {
  margin-top: 2px;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

.kpi-delta {
  display: inline-block;
  margin-top: var(--sp-2);
  padding: 1px var(--sp-2);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  font-weight: 600;
}

/* ----------------------------------------------------------------- tables */

.table-wrap { margin-bottom: var(--sp-4); }

.table-caption {
  margin-bottom: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-strong);
  break-after: avoid;
}

.table-note {
  margin-top: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

table.data {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  /* Required for the rounded corners to clip the header fill. */
  overflow: hidden;
}

table.data thead th {
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-primary);
  color: #ffffff;
  font-size: var(--fs-xs);
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: start;
  white-space: nowrap;
}

table.data tbody td {
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border);
  vertical-align: top;
  font-variant-numeric: tabular-nums;
}

table.data tbody tr { break-inside: avoid; }

table.data.zebra tbody tr:nth-child(even) { background: var(--c-surface-alt); }

table.data tfoot td {
  padding: var(--sp-2) var(--sp-3);
  border-top: 2px solid var(--c-primary);
  background: var(--c-surface-alt);
  font-weight: 700;
  color: var(--c-text-strong);
  font-variant-numeric: tabular-nums;
}

.cell-emphasis { font-weight: 650; color: var(--c-text-strong); }
.cell-positive { color: var(--c-positive); }
.cell-negative { color: var(--c-negative); }
.align-left   { text-align: start; }
.align-center { text-align: center; }
.align-right  { text-align: end; }

.table-empty {
  padding: var(--sp-5);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface-alt);
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--c-muted);
}

/* ----------------------------------------------------------------- badges */

.badge {
  display: inline-block;
  padding: 1px var(--sp-2);
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 600;
  white-space: nowrap;
}

.badge--neutral  { background: #f1f5f9; color: #334155; }
.badge--positive { background: #dcfce7; color: var(--c-positive); }
.badge--negative { background: #fee2e2; color: var(--c-negative); }
.badge--warning  { background: #fef3c7; color: #92400e; }
.badge--info     { background: #dbeafe; color: var(--c-primary-dark); }

/* ------------------------------------------------------------ key/values */

.kv-grid {
  display: grid;
  gap: var(--sp-2) var(--sp-4);
  margin-bottom: var(--sp-4);
  padding: var(--sp-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface-alt);
  break-inside: avoid;
}

.kv-label {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-muted);
}

.kv-value {
  font-size: var(--fs-sm);
  color: var(--c-text-strong);
  font-variant-numeric: tabular-nums;
}

.kv-value--emphasis { font-weight: 700; font-size: var(--fs-md); }

/* ------------------------------------------------------------ misc blocks */

.text-block { margin: 0 0 var(--sp-3); font-size: var(--fs-sm); }
.text-block--muted { color: var(--c-muted); font-size: var(--fs-xs); }
.page-break { break-after: page; }
`;
}
