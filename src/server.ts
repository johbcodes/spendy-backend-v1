import app from './app';
import env from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import logger from './utils/logger';
import { initializeCronJobs } from './services/cron.service';

// Catch unhandled async rejections and unexpected errors before they silently crash the process
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

const PORT = parseInt(env.PORT, 10);

const startServer = async () => {
  try {
    await connectDatabase();
    initializeCronJobs();

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API base: http://localhost:${PORT}/api/${env.API_VERSION}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received — starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Database disconnected');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
