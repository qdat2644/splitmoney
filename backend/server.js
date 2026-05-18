import { createApp } from './app.js';
import { env } from './config/env.js';
import prisma from './utils/db.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = app.listen(env.port, () => {
  logger.info('server_started', { port: env.port, environment: env.nodeEnv });
});

async function shutdown(signal) {
  logger.info('shutdown_started', { signal });
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('shutdown_complete', { signal });
      process.exit(0);
    } catch (error) {
      logger.error('shutdown_failed', { signal, message: error.message });
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { message: reason?.message || String(reason) });
});
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { message: error.message, stack: env.nodeEnv === 'development' ? error.stack : undefined });
});
