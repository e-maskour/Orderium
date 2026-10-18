import { z } from 'zod';
import { getMoroccanPhoneError, isValidMoroccanPhone, normalizeMoroccanPhone } from '@orderium/ui';

// Kept under the old names for existing callers
const normalizePhoneNumber = normalizeMoroccanPhone;

export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, { message: 'phoneNumberRequired' })
    .superRefine((value, ctx) => {
      const error = getMoroccanPhoneError(value);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
  password: z
    .string()
    .min(1, { message: 'passwordRequired' })
    .min(6, { message: 'passwordMinLength' }),
  // fullName is conditionally required — validated at submit time via setError
  fullName: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export { normalizePhoneNumber, isValidMoroccanPhone };
