/**
 * Worker Service Entry Point
 * Processes background jobs with BullMQ
 */

import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@whatsapp-automation/observability';
import { QueueName } from './queues';

// Import processors
import { processWebhook } from './processors/webhook.processor';
import { processMessageSending } from './processors/message-sending.processor';
import { processAI } from './processors/ai-processing.processor';
import { processCampaign } from './processors/campaign.processor';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const workers: Worker[] = [];

// Webhook processing worker
const webhookWorker = new Worker(QueueName.WEBHOOK_PROCESSING, processWebhook, {
  connection,
  concurrency: parseInt(process.env.WEBHOOK_CONCURRENCY || '5', 10),
});
workers.push(webhookWorker);

// Message sending worker
const messageSendingWorker = new Worker(QueueName.MESSAGE_SENDING, processMessageSending, {
  connection,
  concurrency: parseInt(process.env.MESSAGE_CONCURRENCY || '3', 10),
});
workers.push(messageSendingWorker);

// AI processing worker
const aiWorker = new Worker(QueueName.AI_PROCESSING, processAI, {
  connection,
  concurrency: parseInt(process.env.AI_CONCURRENCY || '2', 10),
});
workers.push(aiWorker);

// Campaign execution worker
const campaignWorker = new Worker(QueueName.CAMPAIGN_EXECUTION, processCampaign, {
  connection,
  concurrency: parseInt(process.env.CAMPAIGN_CONCURRENCY || '1', 10),
});
workers.push(campaignWorker);

// Worker event handlers
workers.forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info(
      {
        queue: worker.name,
        jobId: job.id,
        duration: Date.now() - job.processedOn!,
      },
      'Job completed'
    );
  });

  worker.on('failed', (job, error) => {
    logger.error(
      {
        queue: worker.name,
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
      },
      'Job failed'
    );
  });

  worker.on('error', (error) => {
    logger.error({ queue: worker.name, error }, 'Worker error');
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers...');

  await Promise.all(workers.map((worker) => worker.close()));
  await connection.quit();

  logger.info('Workers shut down successfully');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(
  {
    workers: workers.map((w) => w.name),
    concurrency: {
      webhook: process.env.WEBHOOK_CONCURRENCY || 5,
      message: process.env.MESSAGE_CONCURRENCY || 3,
      ai: process.env.AI_CONCURRENCY || 2,
      campaign: process.env.CAMPAIGN_CONCURRENCY || 1,
    },
  },
  'Worker service started'
);
