/**
 * Workflow Execution Engine
 */

import { prisma } from '@whatsapp-automation/database';
import { v4 as uuidv4 } from 'uuid';
import type { Workflow, ExecutionContext, ExecutionResult, WorkflowNode } from './types';
import { NodeExecutor } from './nodes/executor';

export class WorkflowEngine {
  private executor: NodeExecutor;

  constructor() {
    this.executor = new NodeExecutor();
  }

  /**
   * Execute workflow from trigger
   */
  async executeWorkflow(
    workflow: Workflow,
    context: Partial<ExecutionContext>
  ): Promise<string> {
    const executionId = uuidv4();

    const fullContext: ExecutionContext = {
      workflowId: workflow.id,
      executionId,
      variables: {},
      metadata: {},
      ...context,
    };

    // Create execution record
    await prisma.workflowExecution.create({
      data: {
        id: executionId,
        workflowId: workflow.id,
        workspaceId: workflow.workspaceId,
        status: 'RUNNING',
        context: fullContext as any,
      },
    });

    // Execute asynchronously
    this.runWorkflow(workflow, fullContext).catch((error) => {
      console.error('Workflow execution error:', error);
    });

    return executionId;
  }

  /**
   * Run workflow nodes in sequence
   */
  private async runWorkflow(workflow: Workflow, context: ExecutionContext) {
    try {
      // Find trigger node
      const triggerNode = workflow.nodes.find((n) => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      let currentNodeId: string | undefined = triggerNode.id;
      const executedNodes: string[] = [];

      // Execute nodes until no next node
      while (currentNodeId && executedNodes.length < 100) {
        const node = workflow.nodes.find((n) => n.id === currentNodeId);
        if (!node) break;

        executedNodes.push(currentNodeId);

        // Execute node
        const result = await this.executor.execute(node, context);

        // Save step
        await prisma.workflowExecutionStep.create({
          data: {
            executionId: context.executionId,
            nodeId: node.id,
            nodeName: node.name,
            status: result.success ? 'COMPLETED' : 'FAILED',
            output: result.output as any,
            error: result.error,
          },
        });

        if (!result.success) {
          throw new Error(`Node ${node.name} failed: ${result.error}`);
        }

        // Find next node
        currentNodeId = this.getNextNode(workflow, currentNodeId, result);
      }

      // Mark as completed
      await prisma.workflowExecution.update({
        where: { id: context.executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      await prisma.workflowExecution.update({
        where: { id: context.executionId },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date(),
        },
      });
    }
  }

  private getNextNode(
    workflow: Workflow,
    currentNodeId: string,
    result: ExecutionResult
  ): string | undefined {
    if (result.nextNodeId) {
      return result.nextNodeId;
    }

    const outgoingEdges = workflow.edges.filter((e) => e.source === currentNodeId);

    if (outgoingEdges.length === 0) {
      return undefined;
    }

    // If multiple edges, evaluate conditions
    for (const edge of outgoingEdges) {
      if (!edge.condition || this.evaluateCondition(edge.condition, result.output)) {
        return edge.target;
      }
    }

    return outgoingEdges[0]?.target;
  }

  private evaluateCondition(condition: string, data: any): boolean {
    // Simple condition evaluation (can be enhanced)
    try {
      return eval(condition);
    } catch {
      return false;
    }
  }
}

export const workflowEngine = new WorkflowEngine();
