import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idSchema = z.string().uuid();

export const phoneNumberSchema = z.string().regex(/^\d{10,15}$/, 'Invalid phone number format');

export const emailSchema = z.string().email('Invalid email format');

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const languageSchema = z.enum(['en', 'te', 'hi']);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type Language = z.infer<typeof languageSchema>;
