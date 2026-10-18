import {
  formatAmount,
  formatDate,
  formatDateTime,
  formatQuantity,
} from '../french-format';

describe('french-format', () => {
  describe('formatAmount', () => {
    it('uses dot thousands and comma decimals', () => {
      expect(formatAmount(12374.9)).toBe('12.374,90');
      expect(formatAmount(12374123.9)).toBe('12.374.123,90');
      expect(formatAmount(14230.12)).toBe('14.230,12');
    });

    it('accepts numeric strings (decimal columns)', () => {
      expect(formatAmount('1500.5')).toBe('1.500,50');
    });

    it('handles small, negative and zero values', () => {
      expect(formatAmount(0)).toBe('0,00');
      expect(formatAmount(999.999)).toBe('1.000,00');
      expect(formatAmount(-1234.5)).toBe('-1.234,50');
    });

    it('supports custom decimals', () => {
      expect(formatAmount(1234.5678, 3)).toBe('1.234,568');
      expect(formatAmount(1234.5, 0)).toBe('1.235');
    });

    it('renders invalid input as zero', () => {
      expect(formatAmount(null)).toBe('0,00');
      expect(formatAmount(undefined)).toBe('0,00');
      expect(formatAmount('abc')).toBe('0,00');
      expect(formatAmount(Infinity, 0)).toBe('0');
    });
  });

  describe('formatQuantity', () => {
    it('drops trailing zeros', () => {
      expect(formatQuantity(2)).toBe('2');
      expect(formatQuantity(2.5)).toBe('2,5');
      expect(formatQuantity('3.000')).toBe('3');
    });

    it('groups thousands', () => {
      expect(formatQuantity(1250)).toBe('1.250');
      expect(formatQuantity(1250.75)).toBe('1.250,75');
    });

    it('rounds to maxDecimals', () => {
      expect(formatQuantity(1.23456)).toBe('1,235');
      expect(formatQuantity(1.23456, 2)).toBe('1,23');
      expect(formatQuantity(-0.0001)).toBe('0');
    });

    it('renders invalid input as zero', () => {
      expect(formatQuantity(null)).toBe('0');
      expect(formatQuantity('x')).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('formats as dd/MM/yyyy', () => {
      expect(formatDate(new Date(2026, 0, 5, 10, 30))).toBe('05/01/2026');
    });

    it('honours an explicit time zone', () => {
      const instant = '2026-01-31T23:30:00Z';
      expect(formatDate(instant, { timeZone: 'UTC' })).toBe('31/01/2026');
      expect(formatDate(instant, { timeZone: 'Africa/Casablanca' })).toBe(
        '01/02/2026',
      );
    });

    it('returns empty string for invalid input', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('')).toBe('');
      expect(formatDate('not a date')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('formats as dd/MM/yyyy HH:mm (24h)', () => {
      expect(formatDateTime(new Date(2026, 1, 1, 9, 5))).toBe(
        '01/02/2026 09:05',
      );
      expect(formatDateTime('2026-02-01T22:15:00Z', { timeZone: 'UTC' })).toBe(
        '01/02/2026 22:15',
      );
    });

    it('returns empty string for invalid input', () => {
      expect(formatDateTime(undefined)).toBe('');
    });
  });
});
