import { Injectable } from '@nestjs/common';
import {
  KpiCard,
  ReportBlock,
  ReportDocument,
  ReportMapper,
  ReportMapperContext,
  TableBlock,
  TableColumn,
  TableRow,
  Tone,
} from '../../types';
import {
  TabularColumnSpec,
  TabularReportPayload,
  TabularReportSpec,
} from './tabular-report.types';

/** Report type key — matches `ReportConfig.reportType`. */
export const TABULAR_REPORT_TYPE = 'tabular-report';

/**
 * Generic KPI-and-table report.
 *
 * Renders any `{ kpis, rows, meta }` payload against a caller-supplied
 * presentation spec. Because the spec carries only *presentation* (headers,
 * formats, order) and never values, the rendered figures always come from the
 * server's own query.
 */
@Injectable()
export class TabularReportMapper implements ReportMapper<TabularReportPayload> {
  readonly reportType = TABULAR_REPORT_TYPE;
  readonly defaultTitle = 'Rapport';

  map(payload: TabularReportPayload, ctx: ReportMapperContext): ReportDocument {
    const { spec, data } = payload;
    const blocks: ReportBlock[] = [];

    const cards = this.buildKpiCards(spec, data.kpis);
    if (cards.length) {
      blocks.push({ kind: 'kpi-grid', cards });
    }

    const table = this.buildTable(payload, ctx);

    // A table section gets a heading only when the caller named it; otherwise
    // the table sits directly under the title block.
    if (spec.tableTitle) {
      blocks.push({
        kind: 'section',
        title: spec.tableTitle,
        blocks: [table],
      });
    } else {
      blocks.push(table);
    }

    return {
      title: spec.title,
      subtitle: spec.subtitle,
      blocks,
    };
  }

  /** Resolves each KPI spec against the report's `kpis` object. */
  private buildKpiCards(
    spec: TabularReportSpec,
    kpis: TabularReportPayload['data']['kpis'],
  ): KpiCard[] {
    if (!spec.kpis?.length || !kpis) return [];

    return spec.kpis
      .filter((kpi) => kpis[kpi.key] !== undefined && kpis[kpi.key] !== null)
      .map((kpi) => ({
        label: kpi.label,
        value: kpis[kpi.key] as string | number,
        format: kpi.format,
        hint: kpi.hint,
      }));
  }

  /** Builds the data table, including a totals row for `total: true` columns. */
  private buildTable(
    payload: TabularReportPayload,
    ctx: ReportMapperContext,
  ): TableBlock {
    const { spec, data } = payload;
    const rows = data.rows ?? [];

    const columns: TableColumn[] = spec.columns.map((column) =>
      this.toTableColumn(column),
    );

    const totalColumns = spec.columns.filter((column) => column.total);
    const totals: TableRow | undefined = totalColumns.length
      ? Object.fromEntries(
          totalColumns.map((column) => [
            column.key,
            rows.reduce((sum, row) => sum + toNumber(row[column.key]), 0),
          ]),
        )
      : undefined;

    return {
      kind: 'table',
      columns,
      rows,
      totals,
      zebra: true,
      emptyMessage: spec.emptyMessage,
      note: this.buildNote(payload, ctx),
    };
  }

  /** Translates a wire-format column spec into an engine column. */
  private toTableColumn(column: TabularColumnSpec): TableColumn {
    const badgeMap = column.badgeMap;

    return {
      key: column.key,
      header: column.header,
      format: column.format,
      align: column.align,
      width: column.width,
      emphasis: column.emphasis,
      signed: column.signed,
      badgeTone: badgeMap
        ? (value: unknown): Tone =>
            badgeMap[String(value).toUpperCase()] ??
            badgeMap[String(value)] ??
            'neutral'
        : undefined,
    };
  }

  /**
   * Combines the caller's note with a truncation warning, so a row cap is
   * always visible on the document itself.
   */
  private buildNote(
    payload: TabularReportPayload,
    ctx: ReportMapperContext,
  ): string | undefined {
    const { spec, data, totalRowCount } = payload;
    const shown = data.rows?.length ?? 0;

    const truncated =
      totalRowCount !== undefined && totalRowCount > shown
        ? `${ctx.format.integer(shown)} / ${ctx.format.integer(totalRowCount)} ligne(s) — export tronqué.`
        : undefined;

    return [spec.note, truncated].filter(Boolean).join(' ') || undefined;
  }
}

/** Coerces string decimals from SQL aggregates into numbers for summing. */
function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}
