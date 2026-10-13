import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES, normalizePhoneNumber } from '@whatsapp-automation/shared';
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactFilterInput,
} from '@whatsapp-automation/validation';

export class ContactService {
  async createContact(workspaceId: string, data: CreateContactInput) {
    const normalizedPhone = normalizePhoneNumber(data.phoneNumber);

    // Check if contact already exists
    const existing = await prisma.contact.findUnique({
      where: {
        workspaceId_phoneNumber: {
          workspaceId,
          phoneNumber: normalizedPhone,
        },
      },
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'Contact with this phone number already exists',
      };
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        phoneNumber: normalizedPhone,
        name: data.name,
        email: data.email,
        preferredLanguage: data.preferredLanguage,
        customFields: data.customFields,
        source: 'MANUAL',
      },
    });

    // Add tags if provided
    if (data.tags && data.tags.length > 0) {
      await prisma.contactTag.createMany({
        data: data.tags.map((tag) => ({
          contactId: contact.id,
          tag,
        })),
        skipDuplicates: true,
      });
    }

    return contact;
  }

  async getContacts(workspaceId: string, filters: ContactFilterInput) {
    const { page = 1, limit = 50, search, tags, lifecycleStage, consentStatus } = filters;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (lifecycleStage) {
      where.lifecycleStage = lifecycleStage;
    }

    if (consentStatus) {
      where.consentStatus = consentStatus;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: { in: tags },
        },
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        include: {
          tags: true,
          _count: {
            select: {
              conversations: true,
              leads: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      contacts,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + contacts.length < total,
      },
    };
  }

  async getContact(workspaceId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        workspaceId,
      },
      include: {
        tags: true,
        conversations: {
          take: 10,
          orderBy: {
            lastMessageAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            lastMessageAt: true,
            unreadCount: true,
          },
        },
        leads: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!contact) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found',
      };
    }

    return contact;
  }

  async updateContact(
    workspaceId: string,
    contactId: string,
    data: UpdateContactInput
  ) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        workspaceId,
      },
    });

    if (!contact) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found',
      };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.preferredLanguage) updateData.preferredLanguage = data.preferredLanguage;
    if (data.customFields) updateData.customFields = data.customFields;

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    // Update tags if provided
    if (data.tags) {
      // Remove existing tags
      await prisma.contactTag.deleteMany({
        where: { contactId },
      });

      // Add new tags
      if (data.tags.length > 0) {
        await prisma.contactTag.createMany({
          data: data.tags.map((tag) => ({
            contactId,
            tag,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  }

  async deleteContact(workspaceId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        workspaceId,
      },
    });

    if (!contact) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found',
      };
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });
  }
}

export const contactService = new ContactService();
