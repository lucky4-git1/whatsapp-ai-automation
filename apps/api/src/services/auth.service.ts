import bcrypt from 'bcrypt';
import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES, generateSlug } from '@whatsapp-automation/shared';
import type { RegisterInput, LoginInput } from '@whatsapp-automation/validation';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw {
        statusCode: 409,
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'User with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user, default organization, default workspace, and membership in a transaction
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // Create default organization
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const orgSlug = generateSlug(`${data.firstName}-${data.lastName}-org-${uniqueSuffix}`);
      const organization = await tx.organization.create({
        data: {
          name: `${data.firstName}'s Organization`,
          slug: orgSlug,
          ownerId: newUser.id,
        },
      });

      // Create default workspace
      const workspaceSlug = generateSlug(`${data.firstName}-workspace-${uniqueSuffix}`);
      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: `${data.firstName}'s Workspace`,
          slug: workspaceSlug,
          timezone: 'UTC',
          defaultLanguage: 'en',
        },
      });

      // Create default AI assistant configuration
      await tx.assistantConfiguration.create({
        data: {
          workspaceId: workspace.id,
          assistantName: 'AI Support Assistant',
          businessDescription: `${data.firstName}'s business customer support`,
          supportedLanguages: ['en'],
          allowedCapabilities: ['knowledge_lookup', 'lead_capture'],
        },
      });

      // Create membership linking user to organization AND workspace
      await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId: organization.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          isActive: true,
          joinedAt: new Date(),
        },
      });

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            organization: true,
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      };
    }

    if (!user.isActive) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.FORBIDDEN,
        message: 'Account is inactive',
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      };
    }

    // Auto-heal workspace if missing
    let memberships = user.memberships;
    const hasWorkspace = memberships.some((m: any) => m.workspaceId);
    if (!hasWorkspace && memberships.length > 0) {
      const orgId = memberships[0].organizationId;
      let workspace = await prisma.workspace.findFirst({
        where: { organizationId: orgId, isActive: true },
      });
      if (!workspace) {
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        workspace = await prisma.workspace.create({
          data: {
            organizationId: orgId,
            name: `${user.firstName}'s Workspace`,
            slug: generateSlug(`${user.firstName}-workspace-${uniqueSuffix}`),
            timezone: 'UTC',
            defaultLanguage: 'en',
          },
        });
      }
      await prisma.membership.updateMany({
        where: { userId: user.id, organizationId: orgId, workspaceId: null },
        data: { workspaceId: workspace.id },
      });
      const reloaded = await prisma.membership.findMany({
        where: { userId: user.id, isActive: true },
        include: { organization: true, workspace: true },
      });
      if (reloaded.length > 0) {
        memberships = reloaded;
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      memberships: memberships.map((m: any) => ({
        organizationId: m.organizationId,
        organizationName: m.organization?.name || 'Default Organization',
        organizationSlug: m.organization?.slug || 'default-org',
        workspaceId: m.workspaceId,
        workspaceName: m.workspace?.name || 'Default Workspace',
        role: m.role,
      })),
    };
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session = await prisma.session.create({
      data: {
        userId,
        token: this.generateToken(),
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return session;
  }

  async validateSession(token: string) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: {
                organization: true,
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.isRevoked) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid session',
      };
    }

    if (new Date() > session.expiresAt) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Session expired',
      };
    }

    if (!session.user.isActive) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.FORBIDDEN,
        message: 'Account is inactive',
      };
    }

    return session.user;
  }

  async revokeSession(token: string) {
    await prisma.session.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  private generateToken(): string {
    const { randomBytes } = require('crypto');
    return randomBytes(32).toString('hex');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      };
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw {
        statusCode: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}

export const authService = new AuthService();
