/**
 * Workflow Engine Types
 */

export enum NodeType {
  TRIGGER = 'trigger',
  CONDITION = 'condition',
  ACTION = 'action',
  DELAY = 'delay',
}

export enum TriggerType {
  MESSAGE_RECEIVED = 'message_received',
  KEYWORD = 'keyword',
  TAG_ADDED = 'tag_added',
  LEAD_CREATED = 'lead_created',
}

export enum ActionType {
  SEND_MESSAGE = 'send_message',
  SEND_TEMPLATE = 'send_template',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  ASSIGN_AGENT = 'assign_agent',
  CREATE_LEAD = 'create_lead',
  UPDATE_LEAD = 'update_lead',
  AI_RESPONSE = 'ai_response',
  WEBHOOK = 'webhook',
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  workspaceId: string;
  isActive: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggerType: TriggerType;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  conversationId?: string;
  contactId?: string;
  messageId?: string;
  variables: Record<string, any>;
  metadata: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  nodeId: string;
  output?: any;
  error?: string;
  nextNodeId?: string;
}
