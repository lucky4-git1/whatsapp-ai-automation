/**
 * Queue Service
 * Interface for adding jobs to background queues
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@whatsapp-automation/observability';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue names
export enum QueueName {
  WEBHOOK_PROCESSING = 'webhook-processing',
  MESSAGE_SENDING = 'message-sending',
  AI_PROCESSING = 'ai-processing',
  CAMPAIGN_EXECUTION = 'campaign-execution',
}

class QueueService {
  private queues: Map<string, Queue> = new Map();

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues() {
    Object.values(QueueName).forEach((queueName) => {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);
    });

    logger.info({ queues: Array.from(this.queues.keys()) }, 'Queues initialized');
  }

  async addWebhookJob(payload: any, signature: string) {
    const queue = this.queues.get(QueueName.WEBHOOK_PROCESSING);
    if (!queue) throw new Error('Webhook queue not initialized');

    return await queue.add(
      'process-webhook',
      {
        payload,
        signature,
        timestamp: Date.now(),
      },
      {
        priority: 10,
        attempts: 3,
      }
    );
  }

  async addMessageSendingJob(data: {
    messageId: string;
    conversationId: string;
    content: string;
    type: string;
    templateData?: any;
    mediaUrl?: string;
  }) {
    const queue = this.queues.get(QueueName.MESSAGE_SENDING);
    if (!queue) throw new Error('Message sending queue not initialized');

    return await queue.add('send-message', data, {
      priority: 5,
      attempts: 3,
    });
  }

  async addAIProcessingJob(data: {
    conversationId: string;
    messageId: string;
    messageContent: string;
  }) {
    const queue = this.queues.get(QueueName.AI_PROCESSING);
    if (!queue) throw new Error('AI processing queue not initialized');

    return await queue.add('process-ai', data, {
      priority: 8,
      attempts: 2,
    });
  }

  async addCampaignJob(campaignId: string) {
    const queue = this.queues.get(QueueName.CAMPAIGN_EXECUTION);
    if (!queue) throw new Error('Campaign queue not initialized');

    return await queue.add(
      'execute-campaign',
      { campaignId },
      {
        priority: 3,
        attempts: 1,
      }
    );
  }

  async getQueueStats(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async close() {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
    await connection.quit();
  }
}

export const queueService = new QueueService();
