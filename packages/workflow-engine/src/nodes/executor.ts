/**
 * Node Executor
 * Executes individual workflow nodes
 */

import { prisma } from '@whatsapp-automation/database';
import type { WorkflowNode, ExecutionContext, ExecutionResult } from '../types';
import { NodeType, ActionType } from '../types';

export class NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      switch (node.type) {
        case NodeType.TRIGGER:
          return this.executeTrigger(node, context);
        case NodeType.CONDITION:
          return this.executeCondition(node, context);
        case NodeType.ACTION:
          return this.executeAction(node, context);
        case NodeType.DELAY:
          return this.executeDelay(node, context);
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
    } catch (error: any) {
      return {
        success: false,
        nodeId: node.id,
        error: error.message,
      };
    }
  }

  private async executeTrigger(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // Triggers are entry points, just pass through
    return {
      success: true,
      nodeId: node.id,
      output: { triggered: true },
    };
  }

  private async executeCondition(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { condition } = node.config;

    // Simple condition evaluation
    const result = this.evaluateExpression(condition, context);

    return {
      success: true,
      nodeId: node.id,
      output: { conditionMet: result },
      nextNodeId: result ? node.config.truePath : node.config.falsePath,
    };
  }

  private async executeAction(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { actionType } = node.config;

    switch (actionType) {
      case ActionType.SEND_MESSAGE:
        return this.sendMessage(node, context);
      case ActionType.ADD_TAG:
        return this.addTag(node, context);
      case ActionType.ASSIGN_AGENT:
        return this.assignAgent(node, context);
      case ActionType.CREATE_LEAD:
        return this.createLead(node, context);
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private async executeDelay(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { duration } = node.config; // in seconds

    await new Promise((resolve) => setTimeout(resolve, duration * 1000));

    return {
      success: true,
      nodeId: node.id,
      output: { delayed: duration },
    };
  }

  // Action implementations
  private async sendMessage(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { content } = node.config;

    if (!context.conversationId) {
      throw new Error('No conversation context');
    }

    const message = await prisma.message.create({
      data: {
        conversationId: context.conversationId,
        direction: 'OUTBOUND',
        content: this.interpolateVariables(content, context),
        type: 'TEXT',
        status: 'PENDING',
        metadata: {
          workflowGenerated: true,
          workflowId: context.workflowId,
          executionId: context.executionId,
        },
      },
    });

    return {
      success: true,
      nodeId: node.id,
      output: { messageId: message.id },
    };
  }

  private async addTag(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { tagName } = node.config;

    if (!context.contactId) {
      throw new Error('No contact context');
    }

    // Find or create tag
    let tag = await prisma.tag.findFirst({
      where: {
        workspaceId: context.metadata.workspaceId,
        name: tagName,
      },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          workspaceId: context.metadata.workspaceId,
          name: tagName,
        },
      });
    }

    // Add to contact
    await prisma.contactTag.create({
      data: {
        contactId: context.contactId,
        tagId: tag.id,
      },
    });

    return {
      success: true,
      nodeId: node.id,
      output: { tagId: tag.id },
    };
  }

  private async assignAgent(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { userId } = node.config;

    if (!context.conversationId) {
      throw new Error('No conversation context');
    }

    // Unassign current
    await prisma.conversationAssignment.updateMany({
      where: {
        conversationId: context.conversationId,
        unassignedAt: null,
      },
      data: { unassignedAt: new Date() },
    });

    // Assign new
    await prisma.conversationAssignment.create({
      data: {
        conversationId: context.conversationId,
        userId,
        assignedBy: 'SYSTEM',
      },
    });

    return {
      success: true,
      nodeId: node.id,
      output: { assignedTo: userId },
    };
  }

  private async createLead(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { title, value, stage } = node.config;

    if (!context.contactId) {
      throw new Error('No contact context');
    }

    const lead = await prisma.lead.create({
      data: {
        workspaceId: context.metadata.workspaceId,
        contactId: context.contactId,
        title: this.interpolateVariables(title, context),
        value: value || 0,
        stage: stage || 'NEW',
      },
    });

    return {
      success: true,
      nodeId: node.id,
      output: { leadId: lead.id },
    };
  }

  // Helpers
  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Simple expression evaluation
    try {
      const vars = context.variables;
      return eval(expression);
    } catch {
      return false;
    }
  }

  private interpolateVariables(text: string, context: ExecutionContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context.variables[key] || '';
    });
  }
}
