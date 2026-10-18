import { z } from 'zod';
import { getMoroccanPhoneError } from '@orderium/ui';

export const checkoutSchema = z.object({
  name: z.string().min(1, { message: 'nameRequired' }),
  phone: z
    .string()
    .min(1, { message: 'phoneRequired' })
    .superRefine((value, ctx) => {
      const error = getMoroccanPhoneError(value);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
  address: z.string().min(1, { message: 'addressRequired' }),
  note: z.string().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
