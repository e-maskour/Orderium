import { describe, it, expect } from 'vitest';
import { StockMovement, StockQuant } from './stock.model';

// ─── Test Data Factories ─────────────────────────────────────────────────────

const makeMovementData = (overrides: Record<string, any> = {}) => ({
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
    product: { id: 1, name: 'Widget', code: 'WGT-001' },
    sourceWarehouse: null,
    destWarehouse: { id: 1, name: 'Main Warehouse' },
    ...overrides,
});

const makeQuantData = (overrides: Record<string, any> = {}) => ({
    id: 1,
    productId: 1,
    warehouseId: 1,
    quantity: 100,
    reservedQuantity: 10,
    availableQuantity: 90,
    incomingQuantity: 5,
    outgoingQuantity: 0,
    dateCreated: '2026-03-01T00:00:00.000Z',
    dateUpdated: '2026-03-05T00:00:00.000Z',
    product: { id: 1, name: 'Widget', code: 'WGT-001' },
    warehouse: { id: 1, name: 'Main Warehouse' },
    ...overrides,
});

// ─── StockMovement Model Tests ────────────────────────────────────────────────

describe('StockMovement model', () => {

    describe('constructor', () => {
        it('maps all fields from interface data', () => {
            const data = makeMovementData();
            const movement = new StockMovement(data as any);

            expect(movement.id).toBe(1);
            expect(movement.reference).toBe('IN/2026/00001');
            expect(movement.movementType).toBe('receipt');
            expect(movement.productId).toBe(1);
            expect(movement.quantity).toBe(50);
            expect(movement.status).toBe('draft');
        });
    });

    describe('fromApiResponse', () => {
        it('creates instance from raw API response', () => {
            const raw = makeMovementData();
            const movement = StockMovement.fromApiResponse(raw);

            expect(movement).toBeInstanceOf(StockMovement);
            expect(movement.id).toBe(1);
        });

        it('defaults movementType to "internal" when missing', () => {
            const raw = makeMovementData({ movementType: undefined });
            const movement = StockMovement.fromApiResponse(raw);

            expect(movement.movementType).toBe('internal');
        });

        it('defaults quantity to 0 when missing', () => {
            const raw = makeMovementData({ quantity: undefined });
            const movement = StockMovement.fromApiResponse(raw);

            expect(movement.quantity).toBe(0);
        });

        it('defaults status to "draft" when missing', () => {
            const raw = makeMovementData({ status: undefined });
            const movement = StockMovement.fromApiResponse(raw);

            expect(movement.status).toBe('draft');
        });

        it('coerces null optional fields', () => {
            const raw = makeMovementData({
                sourceWarehouseId: undefined,
                destWarehouseId: undefined,
                lotNumber: undefined,
                serialNumber: undefined,
            });
            const movement = StockMovement.fromApiResponse(raw);

            expect(movement.sourceWarehouseId).toBeNull();
            expect(movement.destWarehouseId).toBeNull();
            expect(movement.lotNumber).toBeNull();
            expect(movement.serialNumber).toBeNull();
        });
    });

    // ─── Status Computed Properties ─────────────────────────────────────────────

    describe('isDraft', () => {
        it('returns true for draft status', () => {
            expect(new StockMovement(makeMovementData({ status: 'draft' }) as any).isDraft).toBe(true);
        });

        it('returns false for non-draft status', () => {
            expect(new StockMovement(makeMovementData({ status: 'done' }) as any).isDraft).toBe(false);
        });
    });

    describe('isDone', () => {
        it('returns true for done status', () => {
            expect(new StockMovement(makeMovementData({ status: 'done' }) as any).isDone).toBe(true);
        });

        it('returns false for other statuses', () => {
            for (const status of ['draft', 'waiting', 'confirmed', 'assigned', 'cancelled']) {
                expect(new StockMovement(makeMovementData({ status }) as any).isDone).toBe(false);
            }
        });
    });

    describe('isCancelled', () => {
        it('returns true for cancelled status', () => {
            expect(new StockMovement(makeMovementData({ status: 'cancelled' }) as any).isCancelled).toBe(true);
        });
    });

    describe('canValidate', () => {
        it('returns true for draft/waiting/confirmed/assigned', () => {
            for (const status of ['draft', 'waiting', 'confirmed', 'assigned']) {
                expect(
                    new StockMovement(makeMovementData({ status }) as any).canValidate,
                ).toBe(true);
            }
        });

        it('returns false for done and cancelled', () => {
            for (const status of ['done', 'cancelled']) {
                expect(
                    new StockMovement(makeMovementData({ status }) as any).canValidate,
                ).toBe(false);
            }
        });
    });

    describe('canCancel', () => {
        it('returns true for non-done, non-cancelled statuses', () => {
            for (const status of ['draft', 'waiting', 'confirmed', 'assigned']) {
                expect(new StockMovement(makeMovementData({ status }) as any).canCancel).toBe(true);
            }
        });

        it('returns false for done status', () => {
            expect(new StockMovement(makeMovementData({ status: 'done' }) as any).canCancel).toBe(false);
        });

        it('returns false for cancelled status', () => {
            expect(
                new StockMovement(makeMovementData({ status: 'cancelled' }) as any).canCancel,
            ).toBe(false);
        });
    });

    // ─── Direction Computed Properties ──────────────────────────────────────────

    describe('isInbound', () => {
        it('returns true for receipt', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'receipt' }) as any).isInbound).toBe(true);
        });

        it('returns true for return_in', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'return_in' }) as any).isInbound).toBe(true);
        });

        it('returns true for production_in', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'production_in' }) as any).isInbound).toBe(true);
        });

        it('returns false for outbound types', () => {
            for (const type of ['delivery', 'return_out', 'production_out', 'scrap']) {
                expect(new StockMovement(makeMovementData({ movementType: type }) as any).isInbound).toBe(false);
            }
        });
    });

    describe('isOutbound', () => {
        it('returns true for delivery', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'delivery' }) as any).isOutbound).toBe(true);
        });

        it('returns true for scrap', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'scrap' }) as any).isOutbound).toBe(true);
        });

        it('returns false for receipt', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'receipt' }) as any).isOutbound).toBe(false);
        });

        it('returns false for internal', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'internal' }) as any).isOutbound).toBe(false);
        });
    });

    describe('isInternal', () => {
        it('returns true only for internal type', () => {
            expect(new StockMovement(makeMovementData({ movementType: 'internal' }) as any).isInternal).toBe(true);
            expect(new StockMovement(makeMovementData({ movementType: 'receipt' }) as any).isInternal).toBe(false);
        });
    });

    // ─── Display Computed Properties ────────────────────────────────────────────

    describe('displayType', () => {
        it('returns human-readable label for all known types', () => {
            const expectedMap: Record<string, string> = {
                receipt: 'Receipt',
                delivery: 'Delivery',
                internal: 'Internal Transfer',
                adjustment: 'Adjustment',
                production_in: 'Production In',
                production_out: 'Production Out',
                return_in: 'Return In',
                return_out: 'Return Out',
                scrap: 'Scrap',
            };

            for (const [type, label] of Object.entries(expectedMap)) {
                const movement = new StockMovement(makeMovementData({ movementType: type }) as any);
                expect(movement.displayType).toBe(label);
            }
        });
    });

    describe('displayStatus', () => {
        it('maps all statuses to readable labels', () => {
            const expected: Record<string, string> = {
                draft: 'Draft',
                waiting: 'Waiting',
                confirmed: 'Confirmed',
                assigned: 'Assigned',
                done: 'Done',
                cancelled: 'Cancelled',
            };

            for (const [status, label] of Object.entries(expected)) {
                const movement = new StockMovement(makeMovementData({ status }) as any);
                expect(movement.displayStatus).toBe(label);
            }
        });
    });

    describe('isTracked', () => {
        it('returns true when lotNumber is set', () => {
            const m = new StockMovement(makeMovementData({ lotNumber: 'LOT-001' }) as any);
            expect(m.isTracked).toBe(true);
        });

        it('returns true when serialNumber is set', () => {
            const m = new StockMovement(makeMovementData({ serialNumber: 'SN-001' }) as any);
            expect(m.isTracked).toBe(true);
        });

        it('returns false when neither lot nor serial number is set', () => {
            const m = new StockMovement(makeMovementData({ lotNumber: null, serialNumber: null }) as any);
            expect(m.isTracked).toBe(false);
        });
    });

    describe('productDisplayName', () => {
        it('includes code when product has a code', () => {
            const m = new StockMovement(
                makeMovementData({ product: { id: 1, name: 'Widget', code: 'WGT-001' } }) as any,
            );
            expect(m.productDisplayName).toBe('Widget (WGT-001)');
        });

        it('shows just the name when no code', () => {
            const m = new StockMovement(
                makeMovementData({ product: { id: 1, name: 'Widget', code: undefined } }) as any,
            );
            expect(m.productDisplayName).toBe('Widget');
        });

        it('falls back to Product #id when no product relation', () => {
            const m = new StockMovement(
                makeMovementData({ product: undefined, productId: 42 }) as any,
            );
            expect(m.productDisplayName).toBe('Product #42');
        });
    });
});

// ─── StockQuant Model Tests ───────────────────────────────────────────────────

describe('StockQuant model', () => {
    describe('fromApiResponse', () => {
        it('creates instance from raw API response', () => {
            const raw = makeQuantData();
            const quant = StockQuant.fromApiResponse(raw);

            expect(quant).toBeInstanceOf(StockQuant);
            expect(quant.quantity).toBe(100);
            expect(quant.availableQuantity).toBe(90);
        });

        it('defaults numeric fields to 0 when missing', () => {
            const raw = makeQuantData({
                quantity: undefined,
                reservedQuantity: undefined,
                availableQuantity: undefined,
                incomingQuantity: undefined,
                outgoingQuantity: undefined,
            });
            const quant = StockQuant.fromApiResponse(raw);

            expect(quant.quantity).toBe(0);
            expect(quant.reservedQuantity).toBe(0);
            expect(quant.availableQuantity).toBe(0);
            expect(quant.incomingQuantity).toBe(0);
            expect(quant.outgoingQuantity).toBe(0);
        });

        it('does NOT coerce string quantities — fromApiResponse uses || 0 which preserves truthy strings (known bug)', () => {
            // BUG: `data.quantity || 0` returns the raw string when it is truthy.
            // Computed properties like utilizationRate and netQuantity will produce NaN for string inputs.
            // The fix would be to use `parseFloat(data.quantity) || 0`.
            const raw = makeQuantData({
                quantity: '100.5000',
                reservedQuantity: '10.0000',
                availableQuantity: '90.5000',
            });
            const quant = StockQuant.fromApiResponse(raw);

            expect(quant.quantity).toBe('100.5000');
            expect(quant.reservedQuantity).toBe('10.0000');
            expect(quant.availableQuantity).toBe('90.5000');
        });
    });

    describe('isAvailable', () => {
        it('returns true when availableQuantity > 0', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ availableQuantity: 90 }));
            expect(quant.isAvailable).toBe(true);
        });

        it('returns false when availableQuantity is 0', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ availableQuantity: 0 }));
            expect(quant.isAvailable).toBe(false);
        });

        it('returns false when availableQuantity is negative', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ availableQuantity: -5 }));
            expect(quant.isAvailable).toBe(false);
        });
    });

    describe('utilizationRate', () => {
        it('calculates percentage of qty that is reserved', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ quantity: 100, reservedQuantity: 25 }));
            expect(quant.utilizationRate).toBe(25);
        });

        it('returns 0 when total quantity is 0 (division guard)', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ quantity: 0, reservedQuantity: 0 }));
            expect(quant.utilizationRate).toBe(0);
        });

        it('returns 100 when all stock is reserved', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ quantity: 50, reservedQuantity: 50 }));
            expect(quant.utilizationRate).toBe(100);
        });
    });

    describe('netQuantity', () => {
        it('adds incoming and subtracts outgoing', () => {
            const quant = StockQuant.fromApiResponse(
                makeQuantData({ quantity: 100, incomingQuantity: 20, outgoingQuantity: 10 }),
            );
            expect(quant.netQuantity).toBe(110);
        });

        it('equals quantity when no pending movements', () => {
            const quant = StockQuant.fromApiResponse(
                makeQuantData({ quantity: 50, incomingQuantity: 0, outgoingQuantity: 0 }),
            );
            expect(quant.netQuantity).toBe(50);
        });
    });

    describe('displayQuantity', () => {
        it('returns "available / total" format', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ availableQuantity: 90, quantity: 100 }));
            expect(quant.displayQuantity).toBe('90 / 100');
        });
    });

    describe('hasReserved', () => {
        it('returns true when reservedQuantity > 0', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ reservedQuantity: 5 }));
            expect(quant.hasReserved).toBe(true);
        });

        it('returns false when reservedQuantity is 0', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ reservedQuantity: 0 }));
            expect(quant.hasReserved).toBe(false);
        });
    });

    describe('productDisplayName', () => {
        it('shows product name', () => {
            const quant = StockQuant.fromApiResponse(
                makeQuantData({ product: { id: 1, name: 'Widget', code: 'WGT-001' } }),
            );
            expect(quant.productDisplayName).toBe('Widget');
        });

        it('falls back to "Product #id" when no product', () => {
            const quant = StockQuant.fromApiResponse(makeQuantData({ product: undefined, productId: 7 }));
            expect(quant.productDisplayName).toBe('Product #7');
        });
    });
});
