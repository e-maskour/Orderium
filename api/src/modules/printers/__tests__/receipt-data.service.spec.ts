import { NotFoundException } from '@nestjs/common';
import { ReceiptDataService } from '../receipt-data.service';

const make = (findOne = jest.fn()) => {
  const svc = new ReceiptDataService(
    { getRepository: () => ({ findOne }) } as never,
    {
      findByEntity: jest
        .fn()
        .mockResolvedValue({ values: { companyName: 'ACME', phone: '0600' } }),
    } as never,
  );
  return { svc, findOne };
};

describe('ReceiptDataService.build', () => {
  it('returns a sample receipt for the test-page marker', async () => {
    const { svc } = make();
    const data = await svc.build(0);
    expect(data.orderNumber).toBe('TEST-0001');
    expect(data.storeName).toBe('ACME');
    expect(data.items).toHaveLength(1);
  });

  it('does not look up an order for the test page', async () => {
    // documentRef 0 must never hit the orders table — there is no order 0.
    const { svc, findOne } = make();
    await svc.build(0);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('throws for a real order that does not exist', async () => {
    const { svc } = make(jest.fn().mockResolvedValue(null));
    await expect(svc.build(42)).rejects.toThrow(NotFoundException);
  });

  it('maps a real order onto the receipt', async () => {
    const { svc } = make(
      jest.fn().mockResolvedValue({
        id: 42,
        receiptNumber: 'R-42',
        date: new Date('2026-01-02T10:00:00Z'),
        customerName: 'Yassine',
        customerPhone: '0611',
        items: [
          { product: { name: 'Coca' }, quantity: 2, unitPrice: 6, total: 12 },
        ],
        subtotal: 12,
        total: 12,
      }),
    );
    const data = await svc.build(42);
    expect(data.orderNumber).toBe('R-42');
    expect(data.clientName).toBe('Yassine');
    expect(data.items[0]).toMatchObject({ name: 'Coca', qty: 2, total: 12 });
  });
});
