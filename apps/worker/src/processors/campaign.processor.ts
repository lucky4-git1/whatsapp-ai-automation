/**
 * Campaign Execution Worker
 * Sends bulk messages with rate limiting
 */

import { Job } from 'bullmq';
import { prisma } from '@whatsapp-automation/database';
import { logger } from '@whatsapp-automation/observability';
import { messageSendingQueue } from '../queues';

interface CampaignJobData {
  campaignId: string;
  batchSize?: number;
}

export async function processCampaign(job: Job<CampaignJobData>) {
  const { campaignId, batchSize = 100 } = job.data;

  try {
    logger.info({ jobId: job.id, campaignId }, 'Processing campaign');

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'SCHEDULED' && campaign.status !== 'RUNNING') {
      logger.warn({ campaignId, status: campaign.status }, 'Campaign not in valid state');
      return { skipped: true };
    }

    const whatsappAccount = await prisma.whatsAppAccount.findFirst({
      where: { workspaceId: campaign.workspaceId, isConnected: true },
    });

    if (!whatsappAccount) {
      throw new Error('No connected WhatsApp account found for this workspace');
    }

    // Update status to running
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // Get target contacts
    const contacts = await getTargetContacts(campaign);

    logger.info({ campaignId, totalContacts: contacts.length }, 'Retrieved target contacts');

    let sentCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (contact: any) => {
          try {
            // Create conversation if not exists
            let conversation = await prisma.conversation.findFirst({
              where: {
                workspaceId: campaign.workspaceId,
                contactId: contact.id,
                whatsappAccountId: whatsappAccount.id,
              },
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  workspaceId: campaign.workspaceId,
                  contactId: contact.id,
                  whatsappAccountId: whatsappAccount.id,
                  status: 'OPEN',
                },
              });
            }

            // Create message
            const message = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                whatsappAccountId: whatsappAccount.id,
                direction: 'OUTBOUND',
                content: campaign.template?.name || campaign.name,
                messageType: 'TEMPLATE',
                status: 'QUEUED',
                metadata: {
                  campaignId,
                  isCampaignMessage: true,
                },
              },
            });

            // Queue for sending
            await messageSendingQueue.add('send-message', {
              messageId: message.id,
              conversationId: conversation.id,
              content: campaign.template?.name || campaign.name,
              type: 'TEMPLATE',
              templateData: campaign.template
                ? {
                    name: campaign.template.name,
                    languageCode: campaign.template.language,
                  }
                : undefined,
            });

            // Track campaign recipient
            await prisma.campaignRecipient.create({
              data: {
                campaignId,
                contactId: contact.id,
                messageId: message.id,
                status: 'PENDING',
              },
            });

            sentCount++;
          } catch (error) {
            logger.error({ error, contactId: contact.id }, 'Failed to queue campaign message');
            failedCount++;
          }
        })
      );

      // Rate limiting delay between batches (1 second)
      if (i + batchSize < contacts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign metrics
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        sentCount,
        failedCount,
      },
    });

    logger.info(
      { campaignId, sentCount, failedCount },
      'Campaign execution completed'
    );

    return { success: true, sentCount, failedCount };
  } catch (error) {
    logger.error({ error, campaignId }, 'Campaign execution failed');

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

async function getTargetContacts(campaign: any) {
  return await prisma.contact.findMany({
    where: {
      workspaceId: campaign.workspaceId,
      isUnsubscribed: false,
    },
  });
}
