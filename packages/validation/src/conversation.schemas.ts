import { z } from 'zod';
import { paginationSchema } from './common.schemas';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4096),
  messageType: z.enum(['TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO']).default('TEXT'),
  mediaUrl: z.string().url().optional(),
  caption: z.string().max(1024).optional(),
});

export const conversationFilterSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'PENDING', 'ASSIGNED', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'ARCHIVED']).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  search: z.string().optional(),
});

export const assignConversationSchema = z.object({
  userId: z.string().uuid(),
});

export const updateConversationStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'ASSIGNED', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'ARCHIVED']),
});

export const addNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const toggleAiSchema = z.object({
  isAiEnabled: z.boolean(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationFilterInput = z.infer<typeof conversationFilterSchema>;
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type ToggleAiInput = z.infer<typeof toggleAiSchema>;
