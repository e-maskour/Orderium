import { z } from 'zod';

export const createDeliveryPersonSchema = z.object({
  Name: z.string().min(2, 'Name must be at least 2 characters'),
  PhoneNumber: z.string().regex(/^0[67]\d{8}$/, 'Invalid Moroccan phone number'),
  Email: z.string().email('Invalid email').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  Password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateDeliveryPersonSchema = z.object({
  Name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  Email: z.string().email('Invalid email').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  IsActive: z.boolean().optional(),
});

export const deliveryLoginSchema = z.object({
  PhoneNumber: z.string().min(1, 'Phone number is required'),
  Password: z.string().min(1, 'Password is required'),
});

export const updateOrderStatusSchema = z.object({
  Status: z.enum(['confirmed', 'picked_up', 'in_delivery', 'delivered']),
});

export const assignOrderSchema = z.object({
  OrderId: z.number().positive(),
  DeliveryPersonId: z.number().positive(),
});
