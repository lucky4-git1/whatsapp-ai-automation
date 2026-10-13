import 'dotenv/config';
import { createServer } from './server';
import { logger } from '@whatsapp-automation/observability';
import { prisma } from '@whatsapp-automation/database';

const PORT = parseInt(process.env.API_PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Create and start server
    const server = await createServer();
    
    await server.listen({ port: PORT, host: HOST });
    
    logger.info(`API server listening on http://${HOST}:${PORT}`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error(error, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
