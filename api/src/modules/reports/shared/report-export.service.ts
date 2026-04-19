import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
}

@Injectable()
export class ReportExportService {
  /**
   * Generates an XLSX workbook Buffer from a flat array of row objects.
   * @param sheetName  Name of the worksheet tab
   * @param columns    Column definitions (header label + data key + optional width)
   * @param rows       Array of plain objects containing the data
   */
  buildXlsx(sheetName: string, columns: XlsxColumn[], rows: Record<string, unknown>[]): Buffer {
    const wb = XLSX.utils.book_new();

    // Build data rows from column keys
    const data = rows.map((row) => {
      const r: Record<string, unknown> = {};
      for (const col of columns) {
        r[col.header] = row[col.key] ?? '';
      }
      return r;
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Apply column widths
    ws['!cols'] = columns.map((c) => ({ wch: c.width ?? 20 }));

    // Style header row bold (XLSX doesn't support rich styling in SheetJS community edition,
    // but we can set the header row height)
    ws['!rows'] = [{ hpt: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Formats a number as Moroccan currency string.
   */
  formatMAD(value: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
