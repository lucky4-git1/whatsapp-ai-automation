import { z } from 'zod';
import { emailSchema, phoneNumberSchema, paginationSchema } from './common.schemas';

export const createContactSchema = z.object({
  phoneNumber: phoneNumberSchema,
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  preferredLanguage: z.enum(['en', 'te', 'hi']).optional(),
  customFields: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactFilterSchema = paginationSchema.extend({
  search: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  tags: z.array(z.string()).optional(),
  lifecycleStage: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  consentStatus: z.preprocess((val) => (val === '' ? undefined : val), z.enum(['EXPLICIT_OPT_IN', 'IMPLIED_OPT_IN', 'OPT_OUT', 'UNKNOWN']).optional()),
});

export const updateConsentSchema = z.object({
  status: z.enum(['EXPLICIT_OPT_IN', 'IMPLIED_OPT_IN', 'OPT_OUT']),
  source: z.string(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactFilterInput = z.infer<typeof contactFilterSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
