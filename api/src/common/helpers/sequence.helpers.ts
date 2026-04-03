/**
 * Shared pure helpers for document-number sequence generation.
 * Used by orders, quotes, and invoices services.
 * These functions are stateless — no database access, no injected dependencies.
 */
import { SequenceConfig } from '../types/sequence-config.interface';

/**
 * Generates a short unique ID for a new sequence config entry.
 */
export function generateSequenceId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Computes the trimester marker for a given month (1-12).
 * Returns the first month of the current quarter: '01', '04', '07', or '10'.
 */
function getTrimester(month: number): string {
  if (month <= 3) return '01';
  if (month <= 6) return '04';
  if (month <= 9) return '07';
  return '10';
}

/**
 * Builds the prefix pattern used for matching document numbers in the DB.
 * Example output: "BL 2026-04-"
 */
export function buildSequencePattern(
  sequence: SequenceConfig,
  documentDate?: string | Date,
): string {
  const now = documentDate ? new Date(documentDate) : new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const trimester = getTrimester(now.getMonth() + 1);

  let pattern = sequence.prefix || '';
  const dateComponents: string[] = [];

  if (sequence.yearInPrefix) dateComponents.push(year.toString());

  if (sequence.trimesterInPrefix) {
    dateComponents.push(trimester);
  } else if (sequence.monthInPrefix) {
    dateComponents.push(month);
  }

  if (sequence.dayInPrefix) dateComponents.push(day);

  if (pattern && dateComponents.length > 0) pattern += ' ';
  if (dateComponents.length > 0) pattern += dateComponents.join('-') + '-';

  return pattern;
}

/**
 * Generates a full document number from a sequence config.
 * Example output: "BL 2026-04-0042"
 */
export function generateSequenceNumber(
  sequence: SequenceConfig,
  documentDate?: string | Date,
): string {
  const now = documentDate ? new Date(documentDate) : new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const trimester = getTrimester(now.getMonth() + 1);

  let result = sequence.prefix || '';
  const dateComponents: string[] = [];

  if (sequence.yearInPrefix) dateComponents.push(year.toString());

  if (sequence.trimesterInPrefix) {
    dateComponents.push(trimester);
  } else if (sequence.monthInPrefix) {
    dateComponents.push(month);
  }

  if (sequence.dayInPrefix) dateComponents.push(day);

  if (result && dateComponents.length > 0) result += ' ';
  if (dateComponents.length > 0) result += dateComponents.join('-') + '-';

  const numberPart = sequence.nextNumber
    .toString()
    .padStart(sequence.numberLength || 4, '0');
  result += numberPart;
  result += sequence.suffix || '';

  return result;
}

/**
 * Builds a human-readable format pattern for display purposes.
 * Example output: "BL YYYY-MM-XXXX"
 */
export function buildFormatPattern(sequence: SequenceConfig): string {
  let result = sequence.prefix || '';
  const dateComponents: string[] = [];

  if (sequence.yearInPrefix) dateComponents.push('YYYY');

  if (sequence.trimesterInPrefix) {
    dateComponents.push('QQ');
  } else if (sequence.monthInPrefix) {
    dateComponents.push('MM');
  }

  if (sequence.dayInPrefix) dateComponents.push('DD');

  if (result && dateComponents.length > 0) result += ' ';
  if (dateComponents.length > 0) result += dateComponents.join('-') + '-';

  result += 'X'.repeat(sequence.numberLength || 4);
  result += sequence.suffix || '';

  return result;
}
