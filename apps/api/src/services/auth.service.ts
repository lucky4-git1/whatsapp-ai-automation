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

    // Create user and default organization in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // Create default organization
      const orgSlug = generateSlug(`${data.firstName}-${data.lastName}-org`);
      const organization = await tx.organization.create({
        data: {
          name: `${data.firstName}'s Organization`,
          slug: orgSlug,
          ownerId: newUser.id,
        },
      });

      // Create membership
      await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId: organization.id,
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
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        workspaceId: m.workspaceId,
        workspaceName: m.workspace?.name,
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
