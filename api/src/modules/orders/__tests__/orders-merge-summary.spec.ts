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

  describe('consolidated picking list', () => {
    it('sums the same product across orders and counts the orders', () => {
      const orders = [
        makeOrder({
          id: 1,
          orderNumber: 'CMD-001',
          items: [
            { productId: 9, description: 'Widget', quantity: 2, total: 20 },
          ] as never,
        }),
        makeOrder({
          id: 2,
          orderNumber: 'CMD-002',
          items: [
            { productId: 9, description: 'Widget', quantity: 3, total: 30 },
          ] as never,
        }),
      ];

      const result = buildOrdersMergeSummary(orders, [1, 2]);

      expect(result.consolidated).toEqual([
        { productId: 9, description: 'Widget', quantity: 5, orderCount: 2 },
      ]);
    });

    it('merges a product typed differently, keeping the first spelling', () => {
      const orders = [
        makeOrder({
          id: 1,
          items: [
            { productId: 9, description: 'Widget bleu', quantity: 1 },
          ] as never,
        }),
        makeOrder({
          id: 2,
          items: [
            { productId: 9, description: 'WIDGET BLEU (promo)', quantity: 4 },
          ] as never,
        }),
      ];

      const result = buildOrdersMergeSummary(orders, [1, 2]);

      expect(result.consolidated).toHaveLength(1);
      expect(result.consolidated[0].description).toBe('Widget bleu');
      expect(result.consolidated[0].quantity).toBe(5);
    });

    it('counts an order once when it repeats the same product on two lines', () => {
      const orders = [
        makeOrder({
          id: 1,
          items: [
            { productId: 9, description: 'Widget', quantity: 2 },
            { productId: 9, description: 'Widget', quantity: 3 },
          ] as never,
        }),
      ];

      const result = buildOrdersMergeSummary(orders, [1]);

      expect(result.consolidated).toEqual([
        { productId: 9, description: 'Widget', quantity: 5, orderCount: 1 },
      ]);
    });

    it('groups free-text lines on their normalised description', () => {
      const orders = [
        makeOrder({
          id: 1,
          items: [
            { productId: null, description: 'Frais de port', quantity: 1 },
          ] as never,
        }),
        makeOrder({
          id: 2,
          items: [
            { productId: null, description: '  frais   de PORT ', quantity: 2 },
            { productId: null, description: 'Emballage', quantity: 1 },
          ] as never,
        }),
      ];

      const result = buildOrdersMergeSummary(orders, [1, 2]);

      expect(result.consolidated).toEqual([
        {
          productId: null,
          description: 'Emballage',
          quantity: 1,
          orderCount: 1,
        },
        {
          productId: null,
          description: 'Frais de port',
          quantity: 3,
          orderCount: 2,
        },
      ]);
    });

    it('keeps distinct products apart and sorts them alphabetically', () => {
      const orders = [
        makeOrder({
          id: 1,
          items: [
            { productId: 2, description: 'Zinc', quantity: 1 },
            { productId: 1, description: 'Alu', quantity: 1 },
          ] as never,
        }),
      ];

      const result = buildOrdersMergeSummary(orders, [1]);

      expect(result.consolidated.map((line) => line.description)).toEqual([
        'Alu',
        'Zinc',
      ]);
    });

    it('is empty when none of the orders have items', () => {
      const orders = [makeOrder({ id: 1, items: [] })];

      expect(buildOrdersMergeSummary(orders, [1]).consolidated).toEqual([]);
    });
  });
});
