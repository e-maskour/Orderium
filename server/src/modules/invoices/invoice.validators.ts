import { z } from 'zod';

export const createInvoiceItemSchema = z.object({
  ProductId: z.number().int().positive(),
  Description: z.string().optional(),
  Quantity: z.number().positive(),
  UnitPrice: z.number().min(0),
  Discount: z.number().min(0).optional(),
  DiscountType: z.number().int().min(0).max(1).optional(), // 0 = fixed, 1 = percentage
  TaxRate: z.number().min(0).max(100).optional(),
});

export const createInvoiceSchema = z.object({
  CustomerId: z.number().int().positive(),
  UserId: z.number().int().positive().optional(),
  Date: z.string().datetime().optional(),
  DueDate: z.string().datetime().optional(),
  Items: z.array(createInvoiceItemSchema).min(1, 'Invoice must have at least one item'),
  Note: z.string().optional(),
  Terms: z.string().optional(),
  Status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
});

export const updateInvoiceSchema = z.object({
  CustomerId: z.number().int().positive().optional(),
  Date: z.string().datetime().optional(),
  DueDate: z.string().datetime().optional(),
  Items: z.array(createInvoiceItemSchema).optional(),
  Note: z.string().optional(),
  Terms: z.string().optional(),
  Status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
});

export const recordPaymentSchema = z.object({
  InvoiceId: z.number().int().positive(),
  Amount: z.number().positive(),
  PaymentMethod: z.string().optional(),
  Reference: z.string().optional(),
  Note: z.string().optional(),
});

export const invoiceFiltersSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
  customerId: z.number().int().positive().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
});
