import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '@whatsapp-automation/validation';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

export async function authRoutes(server: FastifyInstance) {
  // Register
  server.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);
    
    const user = await authService.register(data);
    
    return reply.status(201).send({
      success: true,
      data: { user },
    });
  });

  // Login
  server.post('/login', async (request, reply) => {
    const data = loginSchema.parse(request.body);
    
    const user = await authService.login(data);
    
    // Create JWT token
    const token = server.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '30d' }
    );
    
    return reply.send({
      success: true,
      data: {
        user,
        token,
      },
    });
  });

  // Get current user
  server.get(
    '/me',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply) => {
      return reply.send({
        success: true,
        data: { user: request.user },
      });
    }
  );

  // Logout
  server.post(
    '/logout',
    { preHandler: authenticate },
    async (request, reply) => {
      // In a JWT-based system, logout is primarily client-side
      // But we can add token to a blacklist if needed
      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
  );

  // Change password
  server.post(
    '/change-password',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply) => {
      const data = changePasswordSchema.parse(request.body);
      
      await authService.changePassword(
        request.user!.id,
        data.currentPassword,
        data.newPassword
      );
      
      return reply.send({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    }
  );
}
