import { z } from 'zod';

const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+2126')) return '0' + cleaned.slice(4);
  if (cleaned.startsWith('2126')) return '0' + cleaned.slice(3);
  return cleaned;
};

const isValidMoroccanPhone = (phone: string): boolean =>
  /^0[67]\d{8}$/.test(normalizePhoneNumber(phone));

export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, { message: 'phoneNumberRequired' })
    .refine(isValidMoroccanPhone, { message: 'phoneNumberInvalidFormat' }),
  password: z
    .string()
    .min(1, { message: 'passwordRequired' })
    .min(6, { message: 'passwordMinLength' }),
  // fullName is conditionally required — validated at submit time via setError
  fullName: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export { normalizePhoneNumber, isValidMoroccanPhone };
