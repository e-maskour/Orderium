import { ReportExportService } from '../shared/report-export.service';

describe('ReportExportService', () => {
  let service: ReportExportService;

  beforeEach(() => {
    service = new ReportExportService();
  });

  describe('buildXlsx', () => {
    it('returns a Buffer', () => {
      const buf = service.buildXlsx(
        'Test Sheet',
        [{ header: 'Name', key: 'name', width: 20 }, { header: 'Total', key: 'total', width: 15 }],
        [{ name: 'Product A', total: 100 }, { name: 'Product B', total: 200 }],
      );
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('handles empty rows array', () => {
      const buf = service.buildXlsx('Empty', [{ header: 'Col', key: 'col' }], []);
      expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('uses empty string for missing row keys', () => {
      // Should not throw even if row is missing a key
      expect(() =>
        service.buildXlsx('S', [{ header: 'X', key: 'missingKey' }], [{ other: 'val' }]),
      ).not.toThrow();
    });

    it('truncates sheet name to 31 characters', () => {
      // Should not throw with a very long sheet name
      expect(() =>
        service.buildXlsx('A'.repeat(50), [{ header: 'Col', key: 'col' }], []),
      ).not.toThrow();
    });
  });

  describe('formatMAD', () => {
    it('formats a number as MAD currency', () => {
      const result = service.formatMAD(1500.5);
      expect(result).toContain('1');
      expect(result).toContain('500');
      expect(result.toLowerCase()).toMatch(/mad|\u062f\.\u0645\./);
    });

    it('formats zero', () => {
      const result = service.formatMAD(0);
      expect(result).toContain('0');
    });

    it('formats negative values', () => {
      const result = service.formatMAD(-250);
      expect(result).toContain('250');
    });
  });
});
