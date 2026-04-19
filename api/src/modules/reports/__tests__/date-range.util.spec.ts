import { DatePreset } from '../dto/report-filter.dto';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';

describe('resolveDateRange', () => {
  const DAY_MS = 86_400_000;

  describe('preset: TODAY', () => {
    it('returns start and end of the same day', () => {
      const { from, to } = resolveDateRange(DatePreset.TODAY);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(to.getHours()).toBe(23);
      expect(to.getMinutes()).toBe(59);
      expect(from.toDateString()).toBe(to.toDateString());
    });
  });

  describe('preset: YESTERDAY', () => {
    it('returns the day before today', () => {
      const { from, to } = resolveDateRange(DatePreset.YESTERDAY);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(from.toDateString()).toBe(yesterday.toDateString());
      expect(to.toDateString()).toBe(yesterday.toDateString());
    });
  });

  describe('preset: THIS_MONTH', () => {
    it('starts on the 1st of the current month', () => {
      const { from, to } = resolveDateRange(DatePreset.THIS_MONTH);
      expect(from.getDate()).toBe(1);
      expect(from.getMonth()).toBe(new Date().getMonth());
      // to is end of today
      expect(to.getHours()).toBe(23);
    });
  });

  describe('preset: LAST_MONTH', () => {
    it('starts on the 1st and ends on the last day of previous month', () => {
      const { from, to } = resolveDateRange(DatePreset.LAST_MONTH);
      const now = new Date();
      const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      expect(from.getMonth()).toBe(expectedMonth);
      expect(from.getDate()).toBe(1);
      expect(to.getMonth()).toBe(expectedMonth);
    });
  });

  describe('preset: THIS_WEEK', () => {
    it('starts on Monday and ends today', () => {
      const { from, to } = resolveDateRange(DatePreset.THIS_WEEK);
      const day = from.getDay();
      // Monday = 1 in JS
      expect(day).toBe(1);
      expect(to.toDateString()).toBe(new Date().toDateString());
    });
  });

  describe('preset: THIS_QUARTER', () => {
    it('starts on the first month of current quarter', () => {
      const { from } = resolveDateRange(DatePreset.THIS_QUARTER);
      const qStartMonth = Math.floor(new Date().getMonth() / 3) * 3;
      expect(from.getMonth()).toBe(qStartMonth);
      expect(from.getDate()).toBe(1);
    });
  });

  describe('preset: THIS_YEAR', () => {
    it('starts on Jan 1 of current year', () => {
      const { from } = resolveDateRange(DatePreset.THIS_YEAR);
      expect(from.getMonth()).toBe(0);
      expect(from.getDate()).toBe(1);
      expect(from.getFullYear()).toBe(new Date().getFullYear());
    });
  });

  describe('preset: CUSTOM', () => {
    it('uses provided startDate and endDate', () => {
      const { from, to } = resolveDateRange(
        DatePreset.CUSTOM,
        '2025-03-01',
        '2025-03-31',
      );
      expect(from.getFullYear()).toBe(2025);
      expect(from.getMonth()).toBe(2); // 0-indexed
      expect(from.getDate()).toBe(1);
      expect(to.getDate()).toBe(31);
    });

    it('falls back to this_month when dates are missing', () => {
      const { from } = resolveDateRange(
        DatePreset.CUSTOM,
        undefined,
        undefined,
      );
      // Should fall through to default (this_month)
      expect(from.getDate()).toBe(1);
    });
  });

  describe('default (no preset)', () => {
    it('defaults to this_month when preset is undefined', () => {
      const { from } = resolveDateRange(undefined);
      expect(from.getDate()).toBe(1);
    });
  });
});

describe('toSqlDate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    const d = new Date(2025, 2, 5); // March 5, 2025
    expect(toSqlDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toSqlDate(d).startsWith('2025-03-05')).toBe(true);
  });
});
