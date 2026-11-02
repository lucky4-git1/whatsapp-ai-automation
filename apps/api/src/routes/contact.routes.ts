import { FastifyInstance } from 'fastify';
import { prisma } from '@whatsapp-automation/database';
import { contactService } from '../services/contact.service';
import {
  createContactSchema,
  updateContactSchema,
  contactFilterSchema,
} from '@whatsapp-automation/validation';
import {
  authenticate,
  requireWorkspace,
  requirePermission,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { PERMISSIONS, ERROR_CODES } from '@whatsapp-automation/shared';

export async function contactRoutes(server: FastifyInstance) {
  // All routes require authentication and workspace context
  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  // Create contact
  server.post(
    '/',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_CREATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const data = createContactSchema.parse(request.body);
      
      const contact = await contactService.createContact(request.workspaceId!, data);
      
      return reply.status(201).send({
        success: true,
        data: { contact },
      });
    }
  );

  // List contacts
  server.get(
    '/',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const filters = contactFilterSchema.parse(request.query);
      
      const result = await contactService.getContacts(request.workspaceId!, filters);
      
      return reply.send({
        success: true,
        data: result.contacts,
        meta: result.meta,
      });
    }
  );

  // Get contact
  server.get(
    '/:contactId',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const { contactId } = request.params as { contactId: string };
      
      const contact = await contactService.getContact(request.workspaceId!, contactId);
      
      return reply.send({
        success: true,
        data: { contact },
      });
    }
  );

  // Update contact
  server.patch(
    '/:contactId',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { contactId } = request.params as { contactId: string };
      const data = updateContactSchema.parse(request.body);
      
      const contact = await contactService.updateContact(
        request.workspaceId!,
        contactId,
        data
      );
      
      return reply.send({
        success: true,
        data: { contact },
      });
    }
  );

  // Delete contact
  server.delete(
    '/:contactId',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_DELETE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { contactId } = request.params as { contactId: string };
      
      await contactService.deleteContact(request.workspaceId!, contactId);
      
      return reply.send({
        success: true,
        data: { message: 'Contact deleted successfully' },
      });
    }
  );

  // Bulk Import Contacts
  server.post(
    '/import',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_CREATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { contacts } = request.body as {
        contacts: Array<{
          phoneNumber: string;
          name?: string;
          email?: string;
          tags?: string[];
          consentStatus?: string;
        }>;
      };

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Contacts array is required',
          },
        });
      }

      let imported = 0;
      let duplicatesUpdated = 0;
      let invalid = 0;
      const workspaceId = request.workspaceId!;

      for (const item of contacts) {
        let rawPhone = (item.phoneNumber || '').toString().trim().replace(/[\s\-\(\)]/g, '');
        
        // E.164 normalization (Support Indian numbers without code)
        if (rawPhone.length === 10 && /^[6-9]\d{9}$/.test(rawPhone)) {
          rawPhone = `+91${rawPhone}`;
        } else if (!rawPhone.startsWith('+') && rawPhone.length > 0) {
          rawPhone = `+${rawPhone}`;
        }

        if (!/^\+\d{10,15}$/.test(rawPhone)) {
          invalid++;
          continue;
        }

        try {
          const existing = await prisma.contact.findUnique({
            where: {
              workspaceId_phoneNumber: {
                workspaceId,
                phoneNumber: rawPhone,
              },
            },
          });

          if (existing) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                name: item.name || existing.name,
                email: item.email || existing.email,
                consentStatus: (item.consentStatus as any) || existing.consentStatus,
              },
            });
            duplicatesUpdated++;
          } else {
            const created = await prisma.contact.create({
              data: {
                workspaceId,
                phoneNumber: rawPhone,
                name: item.name || null,
                email: item.email || null,
                consentStatus: (item.consentStatus as any) || 'IMPLIED_OPT_IN',
              },
            });

            if (Array.isArray(item.tags)) {
              for (const tag of item.tags) {
                if (tag && tag.trim()) {
                  await prisma.contactTag.create({
                    data: {
                      contactId: created.id,
                      tag: tag.trim(),
                    },
                  }).catch(() => {});
                }
              }
            }
            imported++;
          }
        } catch {
          invalid++;
        }
      }

      return reply.send({
        success: true,
        data: {
          imported,
          duplicatesUpdated,
          invalid,
          totalProcessed: contacts.length,
        },
      });
    }
  );

  // Export Contacts
  server.get(
    '/export',
    { preHandler: [requirePermission(PERMISSIONS.CONTACT_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const contacts = await prisma.contact.findMany({
        where: { workspaceId: request.workspaceId! },
        include: {
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: {
          contacts: contacts.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            phoneNumber: c.phoneNumber,
            email: c.email || '',
            consentStatus: c.consentStatus,
            tags: c.tags.map((t: any) => t.tag).join(', '),
            createdAt: c.createdAt,
          })),
        },
      });
    }
  );
}
