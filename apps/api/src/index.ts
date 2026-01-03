import { serve } from '@hono/node-server';

import { createApp, mountTRPC } from './app.js';
import { connectCacheClient, createCacheClient } from './shared/cache/client.js';
import { loadEnv } from './shared/config/env.js';
import { createDatabase } from './shared/db/client.js';
import { createLogger, getLogger } from './shared/logging/logger.js';
import { createAppRouter } from './trpc.js';

async function main() {
  const env = loadEnv();

  createLogger(env);
  const logger = getLogger();

  logger.info('Starting Yomu server', { nodeEnv: env.NODE_ENV });

  createDatabase(env);

  createCacheClient(env);
  await connectCacheClient();

  const app = createApp();
  const appRouter = createAppRouter();
  mountTRPC(app, appRouter);

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info('Server started', {
        port: info.port,
        address: info.address,
      });
    }
  );
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
