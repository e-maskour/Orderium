import { describe, it, expect } from 'vitest';
import { AdjustmentLine, InventoryAdjustment } from './inventory.model';

// ─── Test Data Factories ─────────────────────────────────────────────────────

const makeLine = (overrides: Record<string, any> = {}) => ({
  id: 1,
  productId: 1,
  productName: 'Widget',
  productCode: 'WGT-001',
  theoreticalQuantity: 100,
  countedQuantity: 95,
  difference: -5,
  ...overrides,
});

const makeAdjustmentData = (overrides: Record<string, any> = {}) => ({
  id: 1,
  reference: 'ADJ/2026/00001',
  name: 'Monthly Count',
  warehouseId: 1,
  warehouseName: 'Main Warehouse',
  status: 'draft',
  adjustmentDate: null,
  userId: null,
  notes: '',
  lines: [],
  dateCreated: '2026-03-05T10:00:00.000Z',
  dateUpdated: '2026-03-05T10:00:00.000Z',
  ...overrides,
});

// ─── AdjustmentLine Model Tests ───────────────────────────────────────────────

describe('AdjustmentLine model', () => {
  describe('hasDiscrepancy', () => {
    it('returns true when difference is not zero', () => {
      const line = new AdjustmentLine(makeLine({ difference: -5 }) as any);
      expect(line.hasDiscrepancy).toBe(true);
    });

    it('returns false when difference is zero', () => {
      const line = new AdjustmentLine(makeLine({ difference: 0 }) as any);
      expect(line.hasDiscrepancy).toBe(false);
    });

    it('returns true for positive difference', () => {
      const line = new AdjustmentLine(makeLine({ difference: 10 }) as any);
      expect(line.hasDiscrepancy).toBe(true);
    });
  });

  describe('absoluteDifference', () => {
    it('returns absolute value of negative difference', () => {
      const line = new AdjustmentLine(makeLine({ difference: -5 }) as any);
      expect(line.absoluteDifference).toBe(5);
    });

    it('returns absolute value of positive difference', () => {
      const line = new AdjustmentLine(makeLine({ difference: 20 }) as any);
      expect(line.absoluteDifference).toBe(20);
    });

    it('returns 0 for zero difference', () => {
      const line = new AdjustmentLine(makeLine({ difference: 0 }) as any);
      expect(line.absoluteDifference).toBe(0);
    });
  });

  describe('discrepancyType', () => {
    it('returns "under" when difference is negative', () => {
      const line = new AdjustmentLine(makeLine({ difference: -10 }) as any);
      expect(line.discrepancyType).toBe('under');
    });

    it('returns "over" when difference is positive', () => {
      const line = new AdjustmentLine(makeLine({ difference: 5 }) as any);
      expect(line.discrepancyType).toBe('over');
    });

    it('returns "exact" when difference is zero', () => {
      const line = new AdjustmentLine(makeLine({ difference: 0 }) as any);
      expect(line.discrepancyType).toBe('exact');
    });
  });

  describe('fromApiResponse', () => {
    it('parses numeric strings from decimal DB columns', () => {
      const raw = {
        id: 1,
        productId: 1,
        theoreticalQuantity: '100.0000',
        countedQuantity: '95.0000',
        difference: '-5.0000',
      };
      const line = AdjustmentLine.fromApiResponse(raw);

      expect(line.theoreticalQuantity).toBe(100);
      expect(line.countedQuantity).toBe(95);
      expect(line.difference).toBe(-5);
    });

    it('defaults to 0 when quantity fields are undefined', () => {
      const raw = { id: 1, productId: 1 };
      const line = AdjustmentLine.fromApiResponse(raw);

      expect(line.theoreticalQuantity).toBe(0);
      expect(line.countedQuantity).toBe(0);
      expect(line.difference).toBe(0);
    });

    it('preserves string fields (productName, productCode, lotNumber)', () => {
      const raw = {
        id: 1,
        productId: 1,
        productName: 'Gadget',
        productCode: 'GDG-002',
        theoreticalQuantity: 10,
        countedQuantity: 10,
        difference: 0,
        lotNumber: 'LOT-ABC',
      };
      const line = AdjustmentLine.fromApiResponse(raw);

      expect(line.productName).toBe('Gadget');
      expect(line.productCode).toBe('GDG-002');
      expect(line.lotNumber).toBe('LOT-ABC');
    });
  });

  describe('toJSON', () => {
    it('serializes all fields back to interface shape', () => {
      const line = new AdjustmentLine(makeLine() as any);
      const json = line.toJSON();

      expect(json.productId).toBe(1);
      expect(json.theoreticalQuantity).toBe(100);
      expect(json.countedQuantity).toBe(95);
      expect(json.difference).toBe(-5);
    });
  });
});

// ─── InventoryAdjustment Model Tests ─────────────────────────────────────────

describe('InventoryAdjustment model', () => {
  describe('status computed properties', () => {
    it('isDraft returns true for draft status', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ status: 'draft' }) as any);
      expect(adj.isDraft).toBe(true);
    });

    it('isInProgress returns true for in_progress status', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ status: 'in_progress' }) as any);
      expect(adj.isInProgress).toBe(true);
    });

    it('isDone returns true for done status', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ status: 'done' }) as any);
      expect(adj.isDone).toBe(true);
    });

    it('isCancelled returns true for cancelled status', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ status: 'cancelled' }) as any);
      expect(adj.isCancelled).toBe(true);
    });
  });

  describe('action guard computed properties', () => {
    it('canStartCounting is true only when draft', () => {
      expect(
        new InventoryAdjustment(makeAdjustmentData({ status: 'draft' }) as any).canStartCounting,
      ).toBe(true);
      expect(
        new InventoryAdjustment(makeAdjustmentData({ status: 'in_progress' }) as any)
          .canStartCounting,
      ).toBe(false);
    });

    it('canValidate is true only when in_progress', () => {
      expect(
        new InventoryAdjustment(makeAdjustmentData({ status: 'in_progress' }) as any).canValidate,
      ).toBe(true);
      expect(
        new InventoryAdjustment(makeAdjustmentData({ status: 'draft' }) as any).canValidate,
      ).toBe(false);
    });

    it('canCancel is true for draft and in_progress', () => {
      for (const status of ['draft', 'in_progress']) {
        expect(new InventoryAdjustment(makeAdjustmentData({ status }) as any).canCancel).toBe(true);
      }
    });

    it('canCancel is false for done and cancelled', () => {
      for (const status of ['done', 'cancelled']) {
        expect(new InventoryAdjustment(makeAdjustmentData({ status }) as any).canCancel).toBe(
          false,
        );
      }
    });
  });

  describe('displayStatus', () => {
    it('maps statuses to human-readable labels', () => {
      const expected: Record<string, string> = {
        draft: 'Draft',
        in_progress: 'In Progress',
        done: 'Done',
        cancelled: 'Cancelled',
      };
      for (const [status, label] of Object.entries(expected)) {
        const adj = new InventoryAdjustment(makeAdjustmentData({ status }) as any);
        expect(adj.displayStatus).toBe(label);
      }
    });
  });

  describe('lines computed properties', () => {
    const lineData1 = makeLine({ id: 1, difference: -5 });
    const lineData2 = makeLine({ id: 2, difference: 0 });
    const lineData3 = makeLine({ id: 3, difference: 10 });

    it('totalLines returns the correct line count', () => {
      const adj = new InventoryAdjustment(
        makeAdjustmentData({ lines: [lineData1, lineData2, lineData3] }) as any,
      );
      expect(adj.totalLines).toBe(3);
    });

    it('linesWithDiscrepancy filters to lines with non-zero difference', () => {
      const adj = new InventoryAdjustment(
        makeAdjustmentData({ lines: [lineData1, lineData2, lineData3] }) as any,
      );
      expect(adj.linesWithDiscrepancy).toHaveLength(2);
    });

    it('discrepancyCount shows count of discrepant lines', () => {
      const adj = new InventoryAdjustment(
        makeAdjustmentData({ lines: [lineData1, lineData2] }) as any,
      );
      expect(adj.discrepancyCount).toBe(1);
    });

    it('returns 0 discrepancies when all lines match', () => {
      const exactLine = makeLine({ difference: 0 });
      const adj = new InventoryAdjustment(makeAdjustmentData({ lines: [exactLine] }) as any);
      expect(adj.discrepancyCount).toBe(0);
    });
  });

  describe('fromApiResponse', () => {
    it('creates instance from raw API data', () => {
      const raw = {
        ...makeAdjustmentData(),
        lines: [
          {
            id: 1,
            productId: 1,
            theoreticalQuantity: '100.0000',
            countedQuantity: '95.0000',
            difference: '-5.0000',
          },
        ],
      };
      const adj = InventoryAdjustment.fromApiResponse(raw);

      expect(adj).toBeInstanceOf(InventoryAdjustment);
      expect(adj.lines[0]).toBeInstanceOf(AdjustmentLine);
      expect(adj.lines[0].difference).toBe(-5);
    });

    it('defaults status to draft when missing', () => {
      const raw = makeAdjustmentData({ status: undefined });
      const adj = InventoryAdjustment.fromApiResponse(raw);
      expect(adj.status).toBe('draft');
    });

    it('defaults notes to empty string when missing', () => {
      const raw = makeAdjustmentData({ notes: undefined });
      const adj = InventoryAdjustment.fromApiResponse(raw);
      expect(adj.notes).toBe('');
    });
  });

  describe('toUpdateDTO', () => {
    it('returns serializable update payload', () => {
      const line = new AdjustmentLine(makeLine() as any);
      const adj = new InventoryAdjustment(
        makeAdjustmentData({ name: 'Test', notes: 'some note', lines: [makeLine()] }) as any,
      );
      const dto = adj.toUpdateDTO();

      expect(dto.name).toBe('Test');
      expect(dto.notes).toBe('some note');
      expect(dto.status).toBe('draft');
      expect(Array.isArray(dto.lines)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('constructs adjustment with no lines (empty array)', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ lines: [] }) as any);
      expect(adj.totalLines).toBe(0);
      expect(adj.discrepancyCount).toBe(0);
    });

    it('handles undefined lines by defaulting to empty array', () => {
      const adj = new InventoryAdjustment(makeAdjustmentData({ lines: undefined }) as any);
      expect(adj.lines).toEqual([]);
    });
  });
});
