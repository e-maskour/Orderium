import { z } from 'zod';

export const partnerFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'validationNameRequired' })
    .max(255, { message: 'validationNameMax' }),
  phoneNumber: z.string().min(1, { message: 'validationPhoneRequired' }),
  email: z
    .string()
    .email({ message: 'validationEmailInvalid' })
    .nullable()
    .or(z.literal(''))
    .optional()
    .transform((val) => (val === '' ? null : (val ?? null))),
  address: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  deliveryAddress: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  isCompany: z.boolean(),
  isEnabled: z.boolean(),
  isCustomer: z.boolean(),
  isSupplier: z.boolean(),
  // Company-only fields (optional)
  ice: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  if: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  cnss: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  rc: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  patente: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  tvaNumber: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  // Location (optional)
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  googleMapsUrl: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
  wazeUrl: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
});

export type PartnerFormValues = z.infer<typeof partnerFormSchema>;
export type PartnerFormInput = z.input<typeof partnerFormSchema>;
