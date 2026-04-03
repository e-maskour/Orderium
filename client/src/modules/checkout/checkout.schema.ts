import { z } from 'zod';
import { validateMoroccanPhone } from '@/lib/i18n';

export const checkoutSchema = z.object({
  name: z.string().min(1, { message: 'nameRequired' }),
  phone: z
    .string()
    .min(1, { message: 'phoneRequired' })
    .refine(validateMoroccanPhone, { message: 'phoneInvalid' }),
  address: z.string().min(1, { message: 'addressRequired' }),
  note: z.string().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
