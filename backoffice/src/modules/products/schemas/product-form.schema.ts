import { z } from 'zod';

export const productFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'validationNameRequired' })
    .max(255, { message: 'validationNameMax' }),
  code: z.string().max(100, { message: 'validationCodeMax' }).optional().or(z.literal('')),
  description: z
    .string()
    .max(1000, { message: 'validationDescriptionMax' })
    .optional()
    .or(z.literal('')),
  price: z
    .number()
    .nullable()
    .superRefine((val, ctx) => {
      if (val === null || val === undefined) {
        ctx.addIssue({ code: 'custom', message: 'validationPriceRequired' });
      } else if (val <= 0) {
        ctx.addIssue({ code: 'custom', message: 'validationPriceMin' });
      }
    }),
  cost: z
    .number()
    .nullable()
    .optional()
    .superRefine((val, ctx) => {
      if (val !== null && val !== undefined && val < 0) {
        ctx.addIssue({ code: 'custom', message: 'validationCostMin' });
      }
    }),
  minPrice: z
    .number()
    .nullable()
    .optional()
    .superRefine((val, ctx) => {
      if (val !== null && val !== undefined && val < 0) {
        ctx.addIssue({ code: 'custom', message: 'validationPriceMin' });
      }
    }),
  saleTaxId: z.string().nullable().optional(),
  purchaseTaxId: z.string().nullable().optional(),
  saleUnitId: z.number().nullable().optional(),
  purchaseUnitId: z.number().nullable().optional(),
  categoryIds: z.number().array(),
  warehouseId: z
    .number()
    .nullable()
    .superRefine((val, ctx) => {
      if (val === null || val === undefined) {
        ctx.addIssue({ code: 'custom', message: 'validationWarehouseRequired' });
      }
    }),
  isService: z.boolean(),
  isEnabled: z.boolean(),
  isPriceChangeAllowed: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
