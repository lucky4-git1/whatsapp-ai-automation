import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES } from '@whatsapp-automation/shared';
import type { ConversationFilterInput } from '@whatsapp-automation/validation';

export class ConversationService {
  async getConversations(workspaceId: string, filters: ConversationFilterInput) {
    const {
      page = 1,
      limit = 50,
      status,
      assignedTo,
      priority,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignments = {
        some: {
          userId: assignedTo,
          unassignedAt: null,
        },
      };
    }

    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
              profilePictureUrl: true,
            },
          },
          whatsappAccount: {
            select: {
              id: true,
              name: true,
              displayPhoneNumber: true,
            },
          },
          assignments: {
            where: { unassignedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            take: 1,
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              content: true,
              direction: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + conversations.length < total,
      },
    };
  }

  async getConversation(workspaceId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
      include: {
        contact: {
          include: {
            tags: true,
          },
        },
        whatsappAccount: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        assignments: {
          where: { unassignedAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!conversation) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found',
      };
    }

    return conversation;
  }

  async updateConversationStatus(
    workspaceId: string,
    conversationId: string,
    status: string
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found',
      };
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: status as any,
        closedAt: status === 'RESOLVED' || status === 'ARCHIVED' ? new Date() : null,
      },
    });

    return updated;
  }

  async assignConversation(
    workspaceId: string,
    conversationId: string,
    userId: string,
    assignedBy: string
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found',
      };
    }

    // Unassign current assignments
    await prisma.conversationAssignment.updateMany({
      where: {
        conversationId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
      },
    });

    // Create new assignment
    const assignment = await prisma.conversationAssignment.create({
      data: {
        conversationId,
        userId,
        assignedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update conversation status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'ASSIGNED' },
    });

    return assignment;
  }

  async toggleAi(
    workspaceId: string,
    conversationId: string,
    isAiEnabled: boolean
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found',
      };
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { isAiEnabled },
    });

    return updated;
  }

  async addNote(
    workspaceId: string,
    conversationId: string,
    userId: string,
    content: string
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found',
      };
    }

    const note = await prisma.internalNote.create({
      data: {
        conversationId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return note;
  }
}

export const conversationService = new ConversationService();
