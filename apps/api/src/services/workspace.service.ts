import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES, generateSlug } from '@whatsapp-automation/shared';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
} from '@whatsapp-automation/validation';

export class WorkspaceService {
  async createWorkspace(organizationId: string, data: CreateWorkspaceInput) {
    const slug = generateSlug(data.name);

    // Check if slug already exists in organization
    const existing = await prisma.workspace.findFirst({
      where: {
        organizationId,
        slug,
      },
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'Workspace with this name already exists',
      };
    }

    const workspace = await prisma.workspace.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        description: data.description,
        industry: data.industry,
        website: data.website,
        country: data.country,
        timezone: data.timezone,
        defaultLanguage: data.defaultLanguage,
      },
    });

    // Create AI assistant configuration with defaults
    await prisma.assistantConfiguration.create({
      data: {
        workspaceId: workspace.id,
        assistantName: 'AI Assistant',
        businessDescription: data.description || 'Customer support assistant',
        supportedLanguages: [data.defaultLanguage],
        allowedCapabilities: ['knowledge_lookup', 'lead_capture'],
      },
    });

    return workspace;
  }

  async getWorkspaces(organizationId: string) {
    const workspaces = await prisma.workspace.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return workspaces;
  }

  async getWorkspace(workspaceId: string, organizationId: string) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId,
      },
      include: {
        whatsappAccounts: {
          select: {
            id: true,
            name: true,
            displayPhoneNumber: true,
            status: true,
            isConnected: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            conversations: true,
            workflows: true,
            campaigns: true,
          },
        },
      },
    });

    if (!workspace) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Workspace not found',
      };
    }

    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    organizationId: string,
    data: UpdateWorkspaceInput
  ) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId,
      },
    });

    if (!workspace) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Workspace not found',
      };
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    return updated;
  }

  async inviteMember(organizationId: string, data: InviteMemberInput) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // If user doesn't exist, create invitation record
    // In production, this would send an email invitation
    if (!user) {
      // For now, we'll just throw an error
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found. Invitation system not yet implemented.',
      };
    }

    // Check if membership already exists
    const existing = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        organizationId,
        workspaceId: data.workspaceId || null,
      },
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'User is already a member',
      };
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        workspaceId: data.workspaceId,
        role: data.role,
        isActive: true,
        joinedAt: new Date(),
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
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return membership;
  }

  async getMembers(workspaceId: string, organizationId: string) {
    // Verify workspace belongs to organization
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId,
      },
    });

    if (!workspace) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Workspace not found',
      };
    }

    const members = await prisma.membership.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members;
  }

  async removeMember(
    workspaceId: string,
    organizationId: string,
    membershipId: string
  ) {
    const membership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        workspaceId,
        organizationId,
      },
    });

    if (!membership) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Membership not found',
      };
    }

    if (membership.role === 'OWNER') {
      throw {
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
        message: 'Cannot remove workspace owner',
      };
    }

    await prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });
  }
}

export const workspaceService = new WorkspaceService();
