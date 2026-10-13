import { FastifyInstance } from 'fastify';
import { workspaceService } from '../services/workspace.service';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
} from '@whatsapp-automation/validation';
import {
  authenticate,
  requireWorkspace,
  requirePermission,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { PERMISSIONS } from '@whatsapp-automation/shared';

export async function workspaceRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  // Create workspace
  server.post('/', async (request: AuthenticatedRequest, reply) => {
    const data = createWorkspaceSchema.parse(request.body);
    
    // Use first organization membership
    const organizationId = request.user!.memberships[0]?.organizationId;
    
    if (!organizationId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User must belong to an organization',
        },
      });
    }
    
    const workspace = await workspaceService.createWorkspace(organizationId, data);
    
    return reply.status(201).send({
      success: true,
      data: { workspace },
    });
  });

  // List workspaces
  server.get('/', async (request: AuthenticatedRequest, reply) => {
    const organizationId = request.user!.memberships[0]?.organizationId;
    
    if (!organizationId) {
      return reply.send({
        success: true,
        data: { workspaces: [] },
      });
    }
    
    const workspaces = await workspaceService.getWorkspaces(organizationId);
    
    return reply.send({
      success: true,
      data: { workspaces },
    });
  });

  // Get workspace details
  server.get(
    '/:workspaceId',
    { preHandler: [requireWorkspace] },
    async (request: AuthenticatedRequest, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      
      const workspace = await workspaceService.getWorkspace(
        workspaceId,
        request.organizationId!
      );
      
      return reply.send({
        success: true,
        data: { workspace },
      });
    }
  );

  // Update workspace
  server.patch(
    '/:workspaceId',
    {
      preHandler: [requireWorkspace, requirePermission(PERMISSIONS.SETTINGS_UPDATE)],
    },
    async (request: AuthenticatedRequest, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const data = updateWorkspaceSchema.parse(request.body);
      
      const workspace = await workspaceService.updateWorkspace(
        workspaceId,
        request.organizationId!,
        data
      );
      
      return reply.send({
        success: true,
        data: { workspace },
      });
    }
  );

  // Invite member
  server.post(
    '/:workspaceId/members',
    {
      preHandler: [requireWorkspace, requirePermission(PERMISSIONS.TEAM_INVITE)],
    },
    async (request: AuthenticatedRequest, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const data = inviteMemberSchema.parse({
        ...request.body,
        workspaceId,
      });
      
      const membership = await workspaceService.inviteMember(
        request.organizationId!,
        data
      );
      
      return reply.status(201).send({
        success: true,
        data: { membership },
      });
    }
  );

  // List members
  server.get(
    '/:workspaceId/members',
    { preHandler: [requireWorkspace] },
    async (request: AuthenticatedRequest, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      
      const members = await workspaceService.getMembers(
        workspaceId,
        request.organizationId!
      );
      
      return reply.send({
        success: true,
        data: { members },
      });
    }
  );

  // Remove member
  server.delete(
    '/:workspaceId/members/:membershipId',
    {
      preHandler: [requireWorkspace, requirePermission(PERMISSIONS.TEAM_MANAGE)],
    },
    async (request: AuthenticatedRequest, reply) => {
      const { workspaceId, membershipId } = request.params as {
        workspaceId: string;
        membershipId: string;
      };
      
      await workspaceService.removeMember(
        workspaceId,
        request.organizationId!,
        membershipId
      );
      
      return reply.send({
        success: true,
        data: { message: 'Member removed successfully' },
      });
    }
  );
}
