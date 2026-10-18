import { z } from 'zod';
import { getMoroccanPhoneError } from '@orderium/ui';

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, { message: 'validationPhoneRequired' })
    .superRefine((value, ctx) => {
      const error = getMoroccanPhoneError(value);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
  password: z.string().min(1, { message: 'validationPasswordRequired' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
