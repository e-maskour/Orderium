import { z } from 'zod';

export const registerSchema = z.object({
  PhoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  Password: z.string().min(6, 'Password must be at least 6 characters'),
  CustomerId: z.number().optional(),
  IsCustomer: z.boolean().optional(),
  IsDelivery: z.boolean().optional(),
  DeliveryId: z.number().optional(),
});

export const loginSchema = z.object({
  PhoneNumber: z.string().min(1, 'Phone number is required'),
  Password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  PhoneNumber: z.string().min(1, 'Phone number is required'),
  NewPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
