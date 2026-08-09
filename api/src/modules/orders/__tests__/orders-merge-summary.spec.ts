import { buildOrdersMergeSummary } from '../orders.helpers';
import { Order } from '../entities/order.entity';

/**
 * Minimal order shape — buildOrdersMergeSummary only reads the fields below,
 * so the cast keeps the fixtures readable instead of building full entities.
 */
function makeOrder(partial: Partial<Order>): Order {
  return partial as Order;
}

describe('buildOrdersMergeSummary', () => {
  it('shapes orders with their items and aggregates the totals', () => {
    const orders = [
      makeOrder({
        id: 1,
        orderNumber: 'CMD-001',
        customerName: 'Alice',
        total: 150 as unknown as number,
        items: [
          {
            description: 'Widget',
            quantity: 2,
            unitPrice: 50,
            total: 100,
          },
          {
            description: null,
            product: { name: 'Gadget' },
            quantity: 1,
            unitPrice: 50,
            total: 50,
          },
        ] as never,
      }),
      makeOrder({
        id: 2,
        orderNumber: 'CMD-002',
        customerName: 'Bob',
        total: 30 as unknown as number,
        items: [
          { description: 'Bolt', quantity: 3, unitPrice: 10, total: 30 },
        ] as never,
      }),
    ];

    const result = buildOrdersMergeSummary(orders, [1, 2]);

    expect(result.orderCount).toBe(2);
    expect(result.grandTotal).toBe(180);
    expect(result.totalQuantity).toBe(6);
    expect(result.missingIds).toEqual([]);
    expect(result.orders[0].partnerName).toBe('Alice');
    expect(result.orders[0].items).toHaveLength(2);
    // description falls back to the product name
    expect(result.orders[0].items[1].description).toBe('Gadget');
  });

  it('follows the requested id order rather than the query order', () => {
    const orders = [
      makeOrder({ id: 2, orderNumber: 'CMD-002', items: [] }),
      makeOrder({ id: 1, orderNumber: 'CMD-001', items: [] }),
    ];

    const result = buildOrdersMergeSummary(orders, [1, 2]);

    expect(result.orders.map((order) => order.orderNumber)).toEqual([
      'CMD-001',
      'CMD-002',
    ]);
  });

  it('reports requested ids that no longer exist instead of dropping them', () => {
    const orders = [makeOrder({ id: 1, orderNumber: 'CMD-001', items: [] })];

    const result = buildOrdersMergeSummary(orders, [1, 42, 99]);

    expect(result.orderCount).toBe(1);
    expect(result.missingIds).toEqual([42, 99]);
  });

  it('uses the supplier as partner for purchase orders', () => {
    const orders = [
      makeOrder({
        id: 1,
        supplierId: 7,
        supplierName: 'Acme Supplies',
        customerName: 'ignored',
        documentNumber: 'BA-001',
        items: [],
      }),
    ];

    const result = buildOrdersMergeSummary(orders, [1]);

    expect(result.orders[0].partnerName).toBe('Acme Supplies');
    // no orderNumber → falls back to documentNumber, matching the list column
    expect(result.orders[0].orderNumber).toBe('BA-001');
  });

  it('falls back to #id when the order has no number at all', () => {
    const orders = [makeOrder({ id: 55, items: [] })];

    const result = buildOrdersMergeSummary(orders, [55]);

    expect(result.orders[0].orderNumber).toBe('#55');
  });

  it('coerces decimal string columns to numbers', () => {
    const orders = [
      makeOrder({
        id: 1,
        orderNumber: 'CMD-001',
        total: '99.50' as unknown as number,
        items: [
          {
            description: 'X',
            quantity: '2',
            unitPrice: '49.75',
            total: '99.50',
          },
        ] as never,
      }),
    ];

    const result = buildOrdersMergeSummary(orders, [1]);

    expect(result.grandTotal).toBe(99.5);
    expect(result.totalQuantity).toBe(2);
    expect(result.orders[0].items[0].unitPrice).toBe(49.75);
  });
});
