import { createReportFormatter } from '../core/report-formatter';

describe('createReportFormatter', () => {
  const build = (locale: string) =>
    createReportFormatter({ locale, currency: 'MAD', timeZone: 'UTC' });

  it.each(['fr-MA', 'ar-MA', 'en-US'])(
    'always formats numbers the French way (%s)',
    (locale) => {
      const f = build(locale);
      expect(f.number(1234.5)).toBe('1.234,50');
      expect(f.number('14230.12')).toBe('14.230,12');
      expect(f.integer(1234567.4)).toBe('1.234.567');
      expect(f.percent(12.5)).toBe('12,5 %');
    },
  );

  it.each(['fr-MA', 'ar-MA', 'en-US'])(
    'always formats dates as dd/MM/yyyy (%s)',
    (locale) => {
      const f = build(locale);
      expect(f.date('2026-01-31T10:00:00Z')).toBe('31/01/2026');
      expect(f.dateTime('2026-01-31T14:05:00Z')).toBe('31/01/2026 14:05');
    },
  );

  it('respects the configured time zone', () => {
    const f = createReportFormatter({
      locale: 'fr-MA',
      currency: 'MAD',
      timeZone: 'Africa/Casablanca',
    });
    expect(f.dateTime('2026-01-31T23:30:00Z')).toBe('01/02/2026 00:30');
  });

  it('keeps French digits while the currency label follows the language', () => {
    expect(build('fr-MA').currency(1500.5)).toBe('1.500,50 MAD');
    const ar = build('ar-MA').currency(1500.5);
    expect(ar.startsWith('1.500,50 ')).toBe(true);
    expect(ar).not.toMatch(/[‎‏]/);
  });

  it('returns empty strings for missing values', () => {
    const f = build('fr-MA');
    expect(f.number(null)).toBe('');
    expect(f.currency('')).toBe('');
    expect(f.date(undefined)).toBe('');
    expect(f.apply(1234.5, 'number')).toBe('1.234,50');
  });
});
