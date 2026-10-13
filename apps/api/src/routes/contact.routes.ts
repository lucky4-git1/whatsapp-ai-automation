import { FastifyInstance } from 'fastify';
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
import { PERMISSIONS } from '@whatsapp-automation/shared';

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
}
