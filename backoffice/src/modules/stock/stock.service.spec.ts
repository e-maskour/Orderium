import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockService, stockService } from './stock.service';

// ─── Mock apiClient & API_ROUTES ──────────────────────────────────────────────

vi.mock('../../common', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
    API_ROUTES: {
        STOCK: {
            MOVEMENTS: '/inventory/movements',
            MOVEMENT_DETAIL: (id: number) => `/inventory/movements/${id}`,
            MOVEMENT_VALIDATE: '/inventory/movements/validate',
            MOVEMENT_TRANSFER: '/inventory/movements/transfer',
            BY_PRODUCT: (id: number) => `/inventory/stock/product/${id}`,
            BY_WAREHOUSE: (id: number) => `/inventory/stock/warehouse/${id}`,
            ALL: '/inventory/stock',
            LOW: '/inventory/stock/low',
            VALUE: '/inventory/stock/value',
        },
    },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { apiClient } from '../../common';

// ─── Response Stubs ───────────────────────────────────────────────────────────

const movementApiData = {
    id: 1,
    reference: 'IN/2026/00001',
    movementType: 'receipt',
    productId: 1,
    sourceWarehouseId: null,
    destWarehouseId: 1,
    quantity: 50,
    status: 'draft',
    dateCreated: '2026-03-05T10:00:00.000Z',
    dateUpdated: '2026-03-05T10:00:00.000Z',
};

const quantApiData = {
    id: 1,
    productId: 1,
    warehouseId: 1,
    quantity: 100,
    reservedQuantity: 10,
    availableQuantity: 90,
    incomingQuantity: 0,
    outgoingQuantity: 0,
    dateCreated: '2026-03-01T00:00:00.000Z',
    dateUpdated: '2026-03-05T00:00:00.000Z',
};

const apiRes = (data: any) => ({ data });
const apiResList = (items: any[]) => ({ data: items });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockService (backoffice)', () => {
    let service: StockService;

    beforeEach(() => {
        service = new StockService();
        vi.clearAllMocks();
    });

    // ─── getAllMovements ─────────────────────────────────────────────────────────

    describe('getAllMovements', () => {
        it('fetches all movements from API and maps to StockMovement instances', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([movementApiData]));

            const result = await service.getAllMovements();

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements', { params: {} });
            expect(result).toHaveLength(1);
            expect(result[0].reference).toBe('IN/2026/00001');
        });

        it('returns empty array when API returns null data', async () => {
            (apiClient.get as any).mockResolvedValue({ data: null });

            const result = await service.getAllMovements();

            expect(result).toEqual([]);
        });

        it('passes productId filter to API params', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getAllMovements({ productId: 5 });

            expect(apiClient.get).toHaveBeenCalledWith(
                '/inventory/movements',
                { params: expect.objectContaining({ productId: 5 }) },
            );
        });

        it('passes status filter to API params', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getAllMovements({ status: 'done' });

            expect(apiClient.get).toHaveBeenCalledWith(
                '/inventory/movements',
                { params: expect.objectContaining({ status: 'done' }) },
            );
        });

        it('passes movementType filter to API params', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getAllMovements({ movementType: 'receipt' });

            expect(apiClient.get).toHaveBeenCalledWith(
                '/inventory/movements',
                { params: expect.objectContaining({ movementType: 'receipt' }) },
            );
        });

        it('passes combined filters to API params', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getAllMovements({ productId: 1, warehouseId: 2, status: 'draft' });

            const params = (apiClient.get as any).mock.calls[0][1].params;
            expect(params).toMatchObject({ productId: 1, warehouseId: 2, status: 'draft' });
        });

        it('does not include undefined filter keys in params', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getAllMovements({ productId: undefined });

            const params = (apiClient.get as any).mock.calls[0][1].params;
            expect(params).not.toHaveProperty('productId');
        });
    });

    // ─── getMovementById ─────────────────────────────────────────────────────────

    describe('getMovementById', () => {
        it('fetches a single movement by ID', async () => {
            (apiClient.get as any).mockResolvedValue(apiRes(movementApiData));

            const result = await service.getMovementById(1);

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements/1');
            expect(result.id).toBe(1);
        });
    });

    // ─── createMovement ──────────────────────────────────────────────────────────

    describe('createMovement', () => {
        it('posts create payload and returns new movement', async () => {
            (apiClient.post as any).mockResolvedValue(apiRes(movementApiData));

            const result = await service.createMovement({
                movementType: 'receipt',
                productId: 1,
                destWarehouseId: 1,
                quantity: 50,
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                '/inventory/movements',
                expect.objectContaining({ productId: 1, quantity: 50 }),
            );
            expect(result.status).toBe('draft');
        });
    });

    // ─── validateMovement ────────────────────────────────────────────────────────

    describe('validateMovement', () => {
        it('posts validate payload and returns done movement', async () => {
            const done = { ...movementApiData, status: 'done' };
            (apiClient.post as any).mockResolvedValue(apiRes(done));

            const result = await service.validateMovement({ movementId: 1 });

            expect(apiClient.post).toHaveBeenCalledWith(
                '/inventory/movements/validate',
                { movementId: 1 },
            );
            expect(result.status).toBe('done');
        });
    });

    // ─── cancelMovement ──────────────────────────────────────────────────────────

    describe('cancelMovement', () => {
        it('sends DELETE request and returns cancelled movement', async () => {
            const cancelled = { ...movementApiData, status: 'cancelled' };
            (apiClient.delete as any).mockResolvedValue(apiRes(cancelled));

            const result = await service.cancelMovement(1);

            expect(apiClient.delete).toHaveBeenCalledWith('/inventory/movements/1');
            expect(result.status).toBe('cancelled');
        });
    });

    // ─── internalTransfer ────────────────────────────────────────────────────────

    describe('internalTransfer', () => {
        it('posts transfer payload and returns done internal movement', async () => {
            const done = { ...movementApiData, movementType: 'internal', status: 'done' };
            (apiClient.post as any).mockResolvedValue(apiRes(done));

            const result = await service.internalTransfer({
                productId: 1,
                sourceWarehouseId: 1,
                destWarehouseId: 2,
                quantity: 30,
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                '/inventory/movements/transfer',
                expect.objectContaining({ sourceWarehouseId: 1, destWarehouseId: 2 }),
            );
            expect(result.movementType).toBe('internal');
        });
    });

    // ─── getProductStock ─────────────────────────────────────────────────────────

    describe('getProductStock', () => {
        it('fetches stock quants for a product', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([quantApiData]));

            const result = await service.getProductStock(1);

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/stock/product/1');
            expect(result).toHaveLength(1);
            expect(result[0].quantity).toBe(100);
        });

        it('returns empty array when product has no stock', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            const result = await service.getProductStock(99);

            expect(result).toEqual([]);
        });
    });

    // ─── getWarehouseStock ───────────────────────────────────────────────────────

    describe('getWarehouseStock', () => {
        it('fetches all stock quants in a warehouse', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([quantApiData]));

            const result = await service.getWarehouseStock(1);

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/stock/warehouse/1');
            expect(result[0].warehouseId).toBe(1);
        });
    });

    // ─── getAllStock ─────────────────────────────────────────────────────────────

    describe('getAllStock', () => {
        it('fetches aggregated stock for all products', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([quantApiData]));

            const result = await service.getAllStock();

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/stock');
            expect(result).toHaveLength(1);
        });
    });

    // ─── getLowStockProducts ─────────────────────────────────────────────────────

    describe('getLowStockProducts', () => {
        it('calls API with default threshold 10', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getLowStockProducts();

            expect(apiClient.get).toHaveBeenCalledWith(
                '/inventory/stock/low',
                { params: { threshold: 10 } },
            );
        });

        it('passes custom threshold', async () => {
            (apiClient.get as any).mockResolvedValue(apiResList([]));

            await service.getLowStockProducts(25);

            expect(apiClient.get).toHaveBeenCalledWith(
                '/inventory/stock/low',
                { params: { threshold: 25 } },
            );
        });
    });

    // ─── getStockValue ───────────────────────────────────────────────────────────

    describe('getStockValue', () => {
        it('returns total value and product count', async () => {
            (apiClient.get as any).mockResolvedValue(apiRes({ totalValue: 15000, productCount: 80 }));

            const result = await service.getStockValue();

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/stock/value');
            expect(result.totalValue).toBe(15000);
            expect(result.productCount).toBe(80);
        });
    });

    // ─── Singleton export ────────────────────────────────────────────────────────

    describe('singleton export', () => {
        it('exports stockService as a StockService instance', () => {
            expect(stockService).toBeInstanceOf(StockService);
        });
    });
});
