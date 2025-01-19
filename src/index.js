import { createServer } from './proxy/socks5-server.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

async function main() {
  try {
    // Create and start the SOCKS5 proxy server
    const server = createServer();
    await server.start();

    // Handle process signals for graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown`);
        try {
          await server.shutdown();
          logger.info('Server shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Log server configuration
    logger.info('Server started with configuration:', {
      host: config.server.host,
      port: config.server.port,
      auth: config.security.authentication.enabled ? 'enabled' : 'disabled',
      maxConnections: config.performance.maxConnections
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();