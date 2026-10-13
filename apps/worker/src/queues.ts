/**
 * Queue definitions and initialization
 */

import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

// Queue names
export enum QueueName {
  WEBHOOK_PROCESSING = 'webhook-processing',
  MESSAGE_SENDING = 'message-sending',
  AI_PROCESSING = 'ai-processing',
  CAMPAIGN_EXECUTION = 'campaign-execution',
  TEMPLATE_SYNC = 'template-sync',
  ANALYTICS_AGGREGATION = 'analytics-aggregation',
  NOTIFICATION = 'notification',
}

// Initialize queues
export const webhookQueue = new Queue(QueueName.WEBHOOK_PROCESSING, defaultQueueOptions);
export const messageSendingQueue = new Queue(QueueName.MESSAGE_SENDING, defaultQueueOptions);
export const aiProcessingQueue = new Queue(QueueName.AI_PROCESSING, defaultQueueOptions);
export const campaignQueue = new Queue(QueueName.CAMPAIGN_EXECUTION, defaultQueueOptions);
export const templateSyncQueue = new Queue(QueueName.TEMPLATE_SYNC, defaultQueueOptions);
export const analyticsQueue = new Queue(QueueName.ANALYTICS_AGGREGATION, defaultQueueOptions);
export const notificationQueue = new Queue(QueueName.NOTIFICATION, defaultQueueOptions);

export const allQueues = [
  webhookQueue,
  messageSendingQueue,
  aiProcessingQueue,
  campaignQueue,
  templateSyncQueue,
  analyticsQueue,
  notificationQueue,
];
