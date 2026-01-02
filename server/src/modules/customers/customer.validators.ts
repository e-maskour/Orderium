import { z } from 'zod';

// Moroccan phone regex: 06/07 followed by 8 digits
const moroccanPhoneRegex = /^(06|07)\d{8}$/;

export const createCustomerSchema = z.object({
  PhoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .refine(
      (phone) => moroccanPhoneRegex.test(phone.replace(/[\s\-()]/g, '')),
      'Invalid Moroccan phone number (format: 06XXXXXXXX or 07XXXXXXXX)'
    ),
  Name: z.string().min(2, 'Name must be at least 2 characters'),
  Email: z.string().email().optional().or(z.literal('')),
  Address: z.string().optional(),
  City: z.string().optional(),
  PostalCode: z.string().optional(),
  Latitude: z.number().min(-90).max(90).optional(),
  Longitude: z.number().min(-180).max(180).optional(),
  GoogleMapsUrl: z.string().url().optional(),
  WazeUrl: z.string().url().optional(),
});

export const updateCustomerSchema = z.object({
  Name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  Email: z.string().email().optional().or(z.literal('')),
  Address: z.string().optional(),
  City: z.string().optional(),
  PostalCode: z.string().optional(),
  Latitude: z.number().min(-90).max(90).optional(),
  Longitude: z.number().min(-180).max(180).optional(),
  GoogleMapsUrl: z.string().url().optional(),
  WazeUrl: z.string().url().optional(),
});

export const searchCustomerSchema = z.object({
  phone: z.string().min(2, 'Phone must be at least 2 digits'),
});
