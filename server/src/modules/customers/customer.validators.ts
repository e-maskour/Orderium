import { z } from 'zod';

// Moroccan phone regex: 06/07 followed by 8 digits
const moroccanPhoneRegex = /^(06|07)\d{8}$/;

export const createCustomerSchema = z.object({
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .refine(
      (phone) => moroccanPhoneRegex.test(phone.replace(/[\s\-()]/g, '')),
      'Invalid Moroccan phone number (format: 06XXXXXXXX or 07XXXXXXXX)'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googleMapsUrl: z.string().url().optional(),
  wazeUrl: z.string().url().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googleMapsUrl: z.string().url().optional(),
  wazeUrl: z.string().url().optional(),
});

export const searchCustomerSchema = z.object({
  phone: z.string().min(2, 'Phone must be at least 2 digits'),
});
