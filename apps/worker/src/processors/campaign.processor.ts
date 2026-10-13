/**
 * Campaign Execution Worker
 * Handles bulk message campaigns
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
  const { campaignId, batchSize = 50 } = job.data;

  try {
    logger.info({ jobId: job.id, campaignId }, 'Processing campaign');

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        segments: {
          include: {
            segment: {
              include: {
                filters: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'SCHEDULED' && campaign.status !== 'RUNNING') {
      logger.warn({ campaignId, status: campaign.status }, 'Campaign not in valid state');
      return { skipped: true };
    }

    // Update status to running
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // Get target contacts based on segments
    const contacts = await getTargetContacts(campaign);

    logger.info({ campaignId, totalContacts: contacts.length }, 'Retrieved target contacts');

    let sentCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (contact) => {
          try {
            // Create conversation if not exists
            let conversation = await prisma.conversation.findFirst({
              where: {
                workspaceId: campaign.workspaceId,
                contactId: contact.id,
                whatsappAccountId: campaign.whatsappAccountId,
              },
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  workspaceId: campaign.workspaceId,
                  contactId: contact.id,
                  whatsappAccountId: campaign.whatsappAccountId!,
                  status: 'OPEN',
                  channel: 'WHATSAPP',
                },
              });
            }

            // Create message
            const message = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                direction: 'OUTBOUND',
                content: campaign.template?.body || campaign.message || '',
                type: campaign.template ? 'TEMPLATE' : 'TEXT',
                status: 'PENDING',
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
              content: campaign.template?.body || campaign.message || '',
              type: campaign.template ? 'TEMPLATE' : 'TEXT',
              templateData: campaign.template
                ? {
                    name: campaign.template.name,
                    languageCode: campaign.template.language,
                  }
                : undefined,
            });

            // Track campaign message
            await prisma.campaignMessage.create({
              data: {
                campaignId,
                contactId: contact.id,
                messageId: message.id,
                status: 'QUEUED',
              },
            });

            sentCount++;
          } catch (error) {
            logger.error({ error, contactId: contact.id }, 'Failed to queue campaign message');
            failedCount++;
          }
        })
      );

      // Update progress
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount,
          failedCount,
        },
      });

      // Rate limiting delay between batches
      if (i + batchSize < contacts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Mark as completed
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
  // If specific segments, filter by those
  if (campaign.segments && campaign.segments.length > 0) {
    const segmentIds = campaign.segments.map((s: any) => s.segmentId);

    return await prisma.contact.findMany({
      where: {
        workspaceId: campaign.workspaceId,
        segments: {
          some: {
            segmentId: { in: segmentIds },
          },
        },
        isActive: true,
      },
    });
  }

  // Otherwise, all contacts in workspace
  return await prisma.contact.findMany({
    where: {
      workspaceId: campaign.workspaceId,
      isActive: true,
    },
  });
}
