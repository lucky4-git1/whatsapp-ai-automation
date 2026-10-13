import { FastifyInstance } from 'fastify';
import { prisma } from '@whatsapp-automation/database';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  server.get('/ready', async (request, reply) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      return reply.send({
        success: true,
        data: {
          status: 'ready',
          checks: {
            database: 'connected',
          },
        },
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service not ready',
          details: {
            database: 'disconnected',
          },
        },
      });
    }
  });
}
