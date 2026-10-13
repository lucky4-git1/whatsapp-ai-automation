import { z } from 'zod';

export const workflowNodeSchema = z.object({
  id: z.string(),
  nodeType: z.string(),
  label: z.string(),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional(),
  condition: z.record(z.any()).optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  triggerType: z.string(),
  triggerConfig: z.record(z.any()).optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export const updateWorkflowSchema = createWorkflowSchema.partial().extend({
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
});

export const publishWorkflowSchema = z.object({
  version: z.number().int().positive().optional(),
});

export type WorkflowNodeInput = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdgeInput = z.infer<typeof workflowEdgeSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type PublishWorkflowInput = z.infer<typeof publishWorkflowSchema>;
