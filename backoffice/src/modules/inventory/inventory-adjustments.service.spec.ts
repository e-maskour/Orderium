import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InventoryAdjustmentService,
  inventoryAdjustmentService,
} from './inventory-adjustments.service';

// ─── Mock apiClient & API_ROUTES ──────────────────────────────────────────────

vi.mock('../../common', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  API_ROUTES: {
    INVENTORY_ADJUSTMENTS: {
      LIST: '/inventory/adjustments',
      DETAIL: (id: number) => `/inventory/adjustments/${id}`,
      CREATE: '/inventory/adjustments',
      GENERATE_LIST: (warehouseId: number) => `/inventory/adjustments/generate-list/${warehouseId}`,
      START: (id: number) => `/inventory/adjustments/${id}/start`,
      VALIDATE: '/inventory/adjustments/validate',
      CANCEL: (id: number) => `/inventory/adjustments/${id}/cancel`,
      DELETE: (id: number) => `/inventory/adjustments/${id}`,
    },
  },
}));

import { apiClient } from '../../common';

// ─── Response Stubs ───────────────────────────────────────────────────────────

const adjustmentApiData = {
  id: 1,
  reference: 'ADJ/2026/00001',
  name: 'Monthly Count',
  warehouseId: 1,
  warehouseName: 'Main Warehouse',
  status: 'draft',
  adjustmentDate: null,
  userId: null,
  notes: '',
  lines: [
    {
      id: 1,
      productId: 1,
      productName: 'Widget',
      theoreticalQuantity: '100.0000',
      countedQuantity: '95.0000',
      difference: '-5.0000',
    },
  ],
  dateCreated: '2026-03-05T10:00:00.000Z',
  dateUpdated: '2026-03-05T10:00:00.000Z',
};

const apiRes = (data: any) => ({ data });
const apiResList = (items: any[]) => ({ data: items });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InventoryAdjustmentService (backoffice)', () => {
  let service: InventoryAdjustmentService;

  beforeEach(() => {
    service = new InventoryAdjustmentService();
    vi.clearAllMocks();
  });

  // ─── getAll ──────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('fetches all adjustments and maps to model instances', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([adjustmentApiData]));

      const result = await service.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/adjustments');
      expect(result).toHaveLength(1);
      expect(result[0].reference).toBe('ADJ/2026/00001');
    });

    it('returns empty array when API returns null', async () => {
      (apiClient.get as any).mockResolvedValue({ data: null });

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('passes warehouseId filter as query param', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([]));

      await service.getAll({ warehouseId: 2 });

      const url = (apiClient.get as any).mock.calls[0][0];
      expect(url).toContain('warehouseId=2');
    });

    it('passes status filter as query param', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([]));

      await service.getAll({ status: 'done' });

      const url = (apiClient.get as any).mock.calls[0][0];
      expect(url).toContain('status=done');
    });

    it('passes date range filters as query params', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([]));

      await service.getAll({ startDate: '2026-01-01', endDate: '2026-03-31' });

      const url = (apiClient.get as any).mock.calls[0][0];
      expect(url).toContain('startDate=2026-01-01');
      expect(url).toContain('endDate=2026-03-31');
    });

    it('uses base URL when no filters provided', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([]));

      await service.getAll();

      const url = (apiClient.get as any).mock.calls[0][0];
      expect(url).toBe('/inventory/adjustments');
    });

    it('correctly parses lines with numeric strings', async () => {
      (apiClient.get as any).mockResolvedValue(apiResList([adjustmentApiData]));

      const result = await service.getAll();

      const line = result[0].lines[0];
      expect(line.theoreticalQuantity).toBe(100);
      expect(line.countedQuantity).toBe(95);
      expect(line.difference).toBe(-5);
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('fetches adjustment by ID', async () => {
      (apiClient.get as any).mockResolvedValue(apiRes(adjustmentApiData));

      const result = await service.getById(1);

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/adjustments/1');
      expect(result.id).toBe(1);
    });

    it('returns InventoryAdjustment instance with correct status properties', async () => {
      (apiClient.get as any).mockResolvedValue(
        apiRes({ ...adjustmentApiData, status: 'in_progress' }),
      );

      const result = await service.getById(1);

      expect(result.isInProgress).toBe(true);
      expect(result.isDraft).toBe(false);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts create payload and returns new adjustment', async () => {
      (apiClient.post as any).mockResolvedValue(apiRes(adjustmentApiData));

      const result = await service.create({ name: 'Monthly Count', warehouseId: 1 });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/inventory/adjustments',
        expect.objectContaining({ name: 'Monthly Count', warehouseId: 1 }),
      );
      expect(result.status).toBe('draft');
    });
  });

  // ─── generateCountingList ─────────────────────────────────────────────────────

  describe('generateCountingList', () => {
    it('fetches counting list for warehouse', async () => {
      const listData = [{ productId: 1, theoreticalQuantity: 100 }];
      (apiClient.get as any).mockResolvedValue(apiRes(listData));

      const result = await service.generateCountingList(1);

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/adjustments/generate-list/1');
      expect(result).toEqual(listData);
    });
  });

  // ─── startCounting ────────────────────────────────────────────────────────────

  describe('startCounting', () => {
    it('posts to start endpoint and returns in_progress adjustment', async () => {
      const inProgress = { ...adjustmentApiData, status: 'in_progress' };
      (apiClient.post as any).mockResolvedValue(apiRes(inProgress));

      const result = await service.startCounting(1);

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/adjustments/1/start');
      expect(result.isInProgress).toBe(true);
    });
  });

  // ─── validate ─────────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('posts validate payload with lines and returns done adjustment', async () => {
      const done = { ...adjustmentApiData, status: 'done' };
      (apiClient.post as any).mockResolvedValue(apiRes(done));

      const result = await service.validate({
        adjustmentId: 1,
        lines: [{ productId: 1, countedQuantity: 95 }],
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/inventory/adjustments/validate',
        expect.objectContaining({
          adjustmentId: 1,
          lines: expect.arrayContaining([expect.objectContaining({ productId: 1 })]),
        }),
      );
      expect(result.isDone).toBe(true);
    });
  });

  // ─── cancel ──────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('posts to cancel endpoint and returns cancelled adjustment', async () => {
      const cancelled = { ...adjustmentApiData, status: 'cancelled' };
      (apiClient.post as any).mockResolvedValue(apiRes(cancelled));

      const result = await service.cancel(1);

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/adjustments/1/cancel');
      expect(result.isCancelled).toBe(true);
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('sends DELETE request to API', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await service.delete(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/inventory/adjustments/1');
    });
  });

  // ─── Singleton export ────────────────────────────────────────────────────────

  describe('singleton export', () => {
    it('exports inventoryAdjustmentService as a valid instance', () => {
      expect(inventoryAdjustmentService).toBeInstanceOf(InventoryAdjustmentService);
    });
  });
});
