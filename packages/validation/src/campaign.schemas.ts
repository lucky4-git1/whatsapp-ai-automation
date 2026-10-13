import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  templateId: z.string().uuid(),
  audienceFilter: z.object({
    tags: z.array(z.string()).optional(),
    excludeTags: z.array(z.string()).optional(),
    lifecycleStage: z.array(z.string()).optional(),
    consentStatus: z.array(z.enum(['EXPLICIT_OPT_IN', 'IMPLIED_OPT_IN'])).optional(),
    customFilters: z.record(z.any()).optional(),
  }),
  templateParams: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const launchCampaignSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Campaign launch must be explicitly confirmed' }),
  }),
});

export const pauseCampaignSchema = z.object({
  reason: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;
export type PauseCampaignInput = z.infer<typeof pauseCampaignSchema>;
