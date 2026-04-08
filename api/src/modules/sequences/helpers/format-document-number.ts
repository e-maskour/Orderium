/**
 * Formats a document number from its components.
 *
 * Rules:
 * - All date components are zero-padded (month → 01-12, day → 01-31)
 * - Parts are joined with '-'
 * - Trimester uses 'T1' / 'T2' / 'T3' / 'T4' notation
 * - The sequence number is zero-padded to `numberLength` digits
 *
 * Examples:
 *   formatDocumentNumber('FA', '', 1,  4, date, { year: true,  month: true,  day: false, trimester: false }) → 'FA-2026-04-0001'
 *   formatDocumentNumber('',   '', 1,  4, date, { year: true,  month: true,  day: true,  trimester: false }) → '2026-04-04-0001'
 *   formatDocumentNumber('CMD','', 128,4, date, { year: true,  month: true,  day: false, trimester: false }) → 'CMD-2026-04-0128'
 */
export function formatDocumentNumber(
  prefix: string,
  suffix: string,
  assignedNumber: number,
  numberLength: number,
  date: Date,
  options: {
    year: boolean;
    month: boolean;
    day: boolean;
    trimester: boolean;
  },
): string {
  const parts: string[] = [];

  if (prefix) parts.push(prefix);

  if (options.year) parts.push(date.getFullYear().toString());

  if (options.trimester) {
    const trimesterNum = Math.ceil((date.getMonth() + 1) / 3);
    parts.push(`T${trimesterNum}`);
  } else if (options.month) {
    parts.push((date.getMonth() + 1).toString().padStart(2, '0'));
  }

  if (options.day) {
    parts.push(date.getDate().toString().padStart(2, '0'));
  }

  parts.push(assignedNumber.toString().padStart(numberLength, '0'));

  if (suffix) parts.push(suffix);

  return parts.join('-');
}

/**
 * Builds a human-readable format template for display purposes.
 * Example: 'FA-YYYY-MM-XXXX'
 */
export function buildFormatTemplate(options: {
  prefix: string;
  suffix: string;
  numberLength: number;
  yearInFormat: boolean;
  monthInFormat: boolean;
  dayInFormat: boolean;
  trimesterInFormat: boolean;
}): string {
  const parts: string[] = [];

  if (options.prefix) parts.push(options.prefix);
  if (options.yearInFormat) parts.push('YYYY');

  if (options.trimesterInFormat) {
    parts.push('QQ');
  } else if (options.monthInFormat) {
    parts.push('MM');
  }

  if (options.dayInFormat) parts.push('DD');

  parts.push('X'.repeat(options.numberLength || 4));

  if (options.suffix) parts.push(options.suffix);

  return parts.join('-');
}
