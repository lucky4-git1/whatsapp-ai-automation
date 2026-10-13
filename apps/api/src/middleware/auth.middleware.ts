import { FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_CODES, ROLE_PERMISSIONS } from '@whatsapp-automation/shared';
import { prisma } from '@whatsapp-automation/database';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    memberships: Array<{
      organizationId: string;
      workspaceId: string | null;
      role: string;
    }>;
  };
  organizationId?: string;
  workspaceId?: string;
}

export async function authenticate(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    
    const userId = (request.user as any)?.id;
    
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    // Fetch full user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          select: {
            organizationId: true,
            workspaceId: true,
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid or inactive account',
        },
      });
    }

    request.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      memberships: user.memberships,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid authentication token',
      },
    });
  }
}

export function requireWorkspace(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  if (!workspaceId) {
    return reply.status(400).send({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Workspace ID required in headers',
      },
    });
  }

  // Verify user has access to this workspace
  const membership = request.user?.memberships.find(
    (m) => m.workspaceId === workspaceId
  );

  if (!membership) {
    return reply.status(403).send({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied to this workspace',
      },
    });
  }

  request.workspaceId = workspaceId;
  request.organizationId = membership.organizationId;
}

export function requirePermission(permission: string) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const workspaceId = request.workspaceId;

    if (!workspaceId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Workspace context required',
        },
      });
    }

    const membership = request.user?.memberships.find(
      (m) => m.workspaceId === workspaceId
    );

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'Access denied',
        },
      });
    }

    const rolePermissions = ROLE_PERMISSIONS[membership.role] || [];

    if (!rolePermissions.includes(permission)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: `Missing permission: ${permission}`,
        },
      });
    }
  };
}
