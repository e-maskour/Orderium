import { z } from 'zod';

export const createOrderItemSchema = z.object({
  ProductId: z.number().int().positive(),
  Quantity: z.number().positive(),
  Price: z.number().positive(),
  Discount: z.number().min(0).optional(),
  DiscountType: z.number().int().min(0).max(1).optional(), // 0 = amount, 1 = percentage
});

export const createOrderSchema = z.object({
  CustomerId: z.number().int().positive().optional(),
  CustomerPhone: z.string().optional(),
  UserId: z.number().int().positive().optional(),
  CashRegisterId: z.number().int().positive().optional(),
  WarehouseId: z.number().int().positive().optional(),
  DocumentTypeId: z.number().int().positive().optional(),
  Items: z.array(createOrderItemSchema).min(1, 'Order must have at least one item'),
  Note: z.string().optional(),
  InternalNote: z.string().optional(),
});
