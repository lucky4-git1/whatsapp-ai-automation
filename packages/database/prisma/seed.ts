import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding presentation demo data...');

  const passwordHash = await bcrypt.hash('DemoPassword2026!', 10);

  // Upsert Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'alex@enterprise-demo.io' },
    update: {
      passwordHash,
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: 'alex@enterprise-demo.io',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Mercer',
      isActive: true,
      emailVerified: true,
    },
  });

  // Upsert Organization
  let org = await prisma.organization.findFirst({
    where: { ownerId: demoUser.id },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Enterprise AI Global',
        slug: 'enterprise-ai-global',
        ownerId: demoUser.id,
      },
    });
  }

  // Upsert Workspace
  let workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Enterprise Production Workspace',
        slug: 'enterprise-prod',
        industry: 'Software & Technology',
        website: 'https://enterprise-demo.io',
        timezone: 'America/New_York',
        defaultLanguage: 'en',
      },
    });
  }

  // Assistant Configuration
  await prisma.assistantConfiguration.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      assistantName: 'Enterprise AI Concierge',
      businessDescription: 'Autonomous 24/7 client onboarding and VIP support agent',
      welcomeMessage: 'Hello! How can I assist you with your enterprise operations today?',
      fallbackResponse: 'I am connecting you with one of our enterprise specialist agents.',
      supportedLanguages: ['en', 'es', 'de'],
      allowedCapabilities: ['knowledge_lookup', 'lead_capture', 'appointment_booking'],
    },
  });

  // Membership
  await prisma.membership.upsert({
    where: {
      userId_organizationId_workspaceId: {
        userId: demoUser.id,
        organizationId: org.id,
        workspaceId: workspace.id,
      },
    },
    update: { role: 'OWNER', isActive: true },
    create: {
      userId: demoUser.id,
      organizationId: org.id,
      workspaceId: workspace.id,
      role: 'OWNER',
      isActive: true,
      joinedAt: new Date(),
    },
  });

  // WhatsApp Account
  const existingWA = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: workspace.id },
  });

  let waAccount = existingWA;
  if (!existingWA) {
    waAccount = await prisma.whatsAppAccount.create({
      data: {
        workspaceId: workspace.id,
        name: 'Primary Enterprise Line',
        businessAccountId: 'WABA-109823482390234',
        phoneNumberId: 'PHONE-293840293840293',
        phoneNumber: '+15550199842',
        displayPhoneNumber: '+1 (555) 019-9842',
        verifiedName: 'Enterprise AI Solutions',
        qualityRating: 'GREEN',
        status: 'CONNECTED',
        isConnected: true,
      },
    });
  }

  // Approved Message Templates
  const template1 = await prisma.messageTemplate.upsert({
    where: {
      whatsappAccountId_name_language: {
        whatsappAccountId: waAccount.id,
        name: 'seasonal_vip_promotion',
        language: 'en',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      whatsappAccountId: waAccount.id,
      externalId: 'meta_tpl_901928301',
      name: 'seasonal_vip_promotion',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Exclusive Enterprise Offer' },
        { type: 'BODY', text: 'Hi {{1}}, upgrade your automation tier before the end of the quarter and receive 30% off additional WhatsApp Business numbers. Reply YES to claim.' },
        { type: 'FOOTER', text: 'Reply STOP to unsubscribe' },
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Claim Discount' }] },
      ],
    },
  });

  const template2 = await prisma.messageTemplate.upsert({
    where: {
      whatsappAccountId_name_language: {
        whatsappAccountId: waAccount.id,
        name: 'appointment_confirmation',
        language: 'en',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      whatsappAccountId: waAccount.id,
      externalId: 'meta_tpl_901928302',
      name: 'appointment_confirmation',
      category: 'UTILITY',
      language: 'en',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Hello {{1}}, your demo session with {{2}} is confirmed for {{3}} at {{4}}. Please let us know if you need to reschedule.' },
        { type: 'FOOTER', text: 'WhatsApp AI Customer Operations' },
      ],
    },
  });

  // Sample Campaign
  const existingCamp = await prisma.campaign.findFirst({
    where: { workspaceId: workspace.id, name: 'Q4 Enterprise VIP Outreach' },
  });

  if (!existingCamp) {
    await prisma.campaign.create({
      data: {
        workspaceId: workspace.id,
        templateId: template1.id,
        name: 'Q4 Enterprise VIP Outreach',
        description: 'Targeted broadcast to high-value enterprise pilot accounts',
        status: 'COMPLETED',
        totalRecipients: 2,
        sentCount: 2,
        deliveredCount: 2,
        readCount: 1,
        failedCount: 0,
        audienceFilter: { tags: ['VIP'] },
        startedAt: new Date(Date.now() - 172800000),
        completedAt: new Date(Date.now() - 172700000),
      },
    });
  }

  // Sample Contacts
  const contact1 = await prisma.contact.upsert({
    where: {
      workspaceId_phoneNumber: {
        workspaceId: workspace.id,
        phoneNumber: '+15552345678',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      phoneNumber: '+15552345678',
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.corp',
    },
  });

  const contact2 = await prisma.contact.upsert({
    where: {
      workspaceId_phoneNumber: {
        workspaceId: workspace.id,
        phoneNumber: '+15559876543',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      phoneNumber: '+15559876543',
      name: 'David Chen',
      email: 'd.chen@apextechnologies.com',
    },
  });

  // Sample Conversations
  if (waAccount) {
    let conv1 = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        whatsappAccountId: waAccount.id,
        contactId: contact1.id,
      },
    });

    if (!conv1) {
      conv1 = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          whatsappAccountId: waAccount.id,
          contactId: contact1.id,
          status: 'OPEN',
          priority: 'HIGH',
          unreadCount: 1,
          lastMessageAt: new Date(),
          isAiEnabled: true,
        },
      });
    }

    const msgCount1 = await prisma.message.count({ where: { conversationId: conv1.id } });
    if (msgCount1 === 0) {
      await prisma.message.createMany({
        data: [
          {
            conversationId: conv1.id,
            whatsappAccountId: waAccount.id,
            direction: 'INBOUND',
            messageType: 'TEXT',
            content: 'Hello, we are interested in deploying the autonomous WhatsApp agent for our 50k customer base.',
            status: 'READ',
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            conversationId: conv1.id,
            whatsappAccountId: waAccount.id,
            direction: 'OUTBOUND',
            messageType: 'TEXT',
            content: 'Hi Sarah! Thank you for reaching out. Our enterprise AI engine can easily handle 50k+ active sessions with sub-second response times. Would you like to schedule a 15-minute executive demo?',
            status: 'DELIVERED',
            createdAt: new Date(Date.now() - 3500000),
          },
          {
            conversationId: conv1.id,
            whatsappAccountId: waAccount.id,
            direction: 'INBOUND',
            messageType: 'TEXT',
            content: 'Yes, please! Does Thursday at 2 PM EST work?',
            status: 'READ',
            createdAt: new Date(Date.now() - 120000),
          },
        ],
      });
    }

    let conv2 = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        whatsappAccountId: waAccount.id,
        contactId: contact2.id,
      },
    });

    if (!conv2) {
      conv2 = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          whatsappAccountId: waAccount.id,
          contactId: contact2.id,
          status: 'RESOLVED',
          priority: 'NORMAL',
          unreadCount: 0,
          lastMessageAt: new Date(Date.now() - 86400000),
          isAiEnabled: true,
        },
      });
    }

    const msgCount2 = await prisma.message.count({ where: { conversationId: conv2.id } });
    if (msgCount2 === 0) {
      await prisma.message.createMany({
        data: [
          {
            conversationId: conv2.id,
            whatsappAccountId: waAccount.id,
            direction: 'INBOUND',
            messageType: 'TEXT',
            content: 'Can you confirm our API rate limit tier?',
            status: 'READ',
            createdAt: new Date(Date.now() - 90000000),
          },
          {
            conversationId: conv2.id,
            whatsappAccountId: waAccount.id,
            direction: 'OUTBOUND',
            messageType: 'TEXT',
            content: 'Hi David! Your current tier is Enterprise Unlimited (up to 1,000 req/sec). Everything is healthy!',
            status: 'DELIVERED',
            createdAt: new Date(Date.now() - 89000000),
          },
        ],
      });
    }
  }

  console.log('Seed completed successfully!');
  console.log('Demo Login: alex@enterprise-demo.io / DemoPassword2026!');
  console.log('Workspace ID:', workspace.id);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
