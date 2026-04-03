import { z } from 'zod';

export const loginSchema = z.object({
  phoneNumber: z.string().min(1, { message: 'validationPhoneRequired' }),
  password: z.string().min(1, { message: 'validationPasswordRequired' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
