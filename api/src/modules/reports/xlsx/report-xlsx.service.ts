import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { GenerateReportPdfDto } from '../pdf/dto/report-pdf.dto';
import { ReportPdfFilterDto } from '../pdf/dto/report-pdf-filter.dto';
import { ReportPdfResolver } from '../pdf/report-pdf.resolver';

/** Upper bound on rows in one spreadsheet — XLSX is the full-extract path. */
const MAX_XLSX_ROWS = 10_000;

/** Excel number formats per presentation format. */
const NUMBER_FORMATS: Record<string, string> = {
  number: '#,##0.00',
  integer: '#,##0',
  currency: '#,##0.00 "MAD"',
  percent: '0.0 "%"',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
};

const NUMERIC_FORMATS = new Set(['number', 'integer', 'currency', 'percent']);
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export interface GeneratedXlsx {
  buffer: Buffer;
  fileName: string;
  rowCount: number;
}

/**
 * Turns any analytics report into a spreadsheet.
 *
 * Uses the same report key, filter and column spec as the PDF export, so the
 * two downloads always contain the same columns as the screen. Cells are
 * typed (numbers stay numbers, dates stay dates) so the file can be summed,
 * sorted and pivoted in Excel without cleanup.
 */
@Injectable()
export class ReportXlsxService {
  private readonly logger = new Logger(ReportXlsxService.name);

  constructor(private readonly resolver: ReportPdfResolver) {}

  async generate(
    reportKey: string,
    filter: ReportPdfFilterDto,
    spec: GenerateReportPdfDto,
  ): Promise<GeneratedXlsx> {
    const data = await this.resolver.resolve(reportKey, {
      ...filter,
      page: 1,
      perPage: MAX_XLSX_ROWS,
    });

    const columns = spec.columns;
    const aoa: XLSX.CellObject[][] = [];
    const text = (v: string): XLSX.CellObject => ({ t: 's', v });

    // ── Title block ────────────────────────────────────────────
    aoa.push([text(spec.title)]);
    if (spec.subtitle) aoa.push([text(spec.subtitle)]);
    for (const m of spec.meta ?? []) aoa.push([text(m.label), text(m.value)]);
    aoa.push([]);

    // ── Table ─────────────────────────────────────────────────
    const headerRow = aoa.length;
    aoa.push(columns.map((c) => text(c.header)));

    for (const row of data.rows) {
      aoa.push(columns.map((c) => toCell(row[c.key], c.format)));
    }

    // ── Totals ────────────────────────────────────────────────
    if (columns.some((c) => c.total) && data.rows.length > 0) {
      aoa.push(
        columns.map((c, i) => {
          if (c.total) {
            const sum = data.rows.reduce(
              (s, r) => s + (toNumber(r[c.key]) ?? 0),
              0,
            );
            return {
              t: 'n',
              v: round(sum),
              z: NUMBER_FORMATS[c.format ?? 'number'] ?? NUMBER_FORMATS.number,
            };
          }
          return i === 0 ? text('Total') : text('');
        }),
      );
    }

    const ws = XLSX.utils.aoa_to_sheet([]);
    aoa.forEach((cells, r) =>
      cells.forEach((cell, c) => {
        ws[XLSX.utils.encode_cell({ r, c })] = cell;
      }),
    );
    const lastRow = Math.max(aoa.length - 1, headerRow);
    const lastCol = Math.max(columns.length - 1, 1);
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastCol },
    });
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRow, c: 0 },
        e: { r: headerRow + data.rows.length, c: columns.length - 1 },
      }),
    };
    ws['!cols'] = columns.map((c) => ({
      wch: columnWidth(c.header, data.rows, c.key, c.format),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName(spec.title));
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    this.logger.log(
      `Report XLSX "${reportKey}" generated — ${data.rows.length} row(s), ${buffer.byteLength} bytes`,
    );

    return {
      buffer,
      fileName: `${safeFileName(spec.fileName || reportKey)}.xlsx`,
      rowCount: data.rows.length,
    };
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Excel serial date (days since 1899-12-30), timezone-stable for date-only values. */
function toExcelDate(value: unknown, withTime: boolean): number | null {
  if (typeof value === 'string') {
    const m = DATE_ONLY_RE.exec(value);
    if (m) return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - EXCEL_EPOCH) / DAY_MS;
  }
  const d =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const local = Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    withTime ? d.getHours() : 0,
    withTime ? d.getMinutes() : 0,
  );
  return (local - EXCEL_EPOCH) / DAY_MS;
}

function toCell(value: unknown, format?: string): XLSX.CellObject {
  if (value === null || value === undefined || value === '') {
    return { t: 's', v: '' };
  }
  if (format && NUMERIC_FORMATS.has(format)) {
    const n = toNumber(value);
    if (n !== null) return { t: 'n', v: n, z: NUMBER_FORMATS[format] };
  }
  if (format === 'date' || format === 'datetime') {
    const serial = toExcelDate(value, format === 'datetime');
    if (serial !== null)
      return { t: 'n', v: serial, z: NUMBER_FORMATS[format] };
  }
  if (typeof value === 'number') return { t: 'n', v: value };
  if (typeof value === 'boolean') return { t: 'b', v: value };
  return { t: 's', v: cellText(value) };
}

/** Text for a non-numeric cell; objects become JSON rather than "[object Object]". */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return value instanceof Date ? value.toISOString() : JSON.stringify(value);
  }
  return String(value as string | number | boolean | bigint);
}

function columnWidth(
  header: string,
  rows: Array<Record<string, unknown>>,
  key: string,
  format?: string,
): number {
  if (format === 'date') return Math.max(12, header.length + 2);
  if (format === 'datetime') return Math.max(17, header.length + 2);
  let max = header.length;
  for (const r of rows.slice(0, 200)) {
    const len = cellText(r[key]).length + (format === 'currency' ? 6 : 0);
    if (len > max) max = len;
  }
  return Math.min(Math.max(max + 2, 10), 50);
}

/** Sheet names: ≤ 31 chars, none of : \ / ? * [ ]. */
function sheetName(title: string): string {
  return title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Rapport';
}

/** ASCII-only file name safe for a Content-Disposition header. */
function safeFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'rapport'
  );
}
