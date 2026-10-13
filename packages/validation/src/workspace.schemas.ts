import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  description: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().length(2).optional(),
  timezone: z.string().default('UTC'),
  defaultLanguage: z.enum(['en', 'te', 'hi']).default('en'),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'SUPERVISOR', 'AGENT', 'MARKETING_MANAGER', 'ANALYST']),
  workspaceId: z.string().uuid().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
