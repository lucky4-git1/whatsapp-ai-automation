import '@fastify/jwt';
import 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
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
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    organizationId?: string;
    workspaceId?: string;
  }
}
