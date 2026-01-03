import Redis from 'ioredis';

import type { Env } from '../config/env.js';
import { getLogger } from '../logging/logger.js';

export type CacheClient = Redis;

let cacheClient: CacheClient | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function createCacheClient(env: Pick<Env, 'VALKEY_URL'>): CacheClient {
  const logger = getLogger();

  cacheClient = new Redis(env.VALKEY_URL, {
    maxRetriesPerRequest: MAX_RETRIES,
    retryStrategy(times) {
      if (times > MAX_RETRIES) {
        logger.error('Valkey connection failed after max retries', { attempts: times });
        return null;
      }
      const delay = Math.min(times * RETRY_DELAY_MS, 5000);
      logger.warn('Valkey connection retry', { attempt: times, delayMs: delay });
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    lazyConnect: true,
  });

  cacheClient.on('connect', () => {
    logger.info('Valkey client connected');
  });

  cacheClient.on('error', (err) => {
    logger.error('Valkey client error', { error: err.message });
  });

  cacheClient.on('close', () => {
    logger.info('Valkey client connection closed');
  });

  return cacheClient;
}

export function getCacheClient(): CacheClient {
  if (!cacheClient) {
    throw new Error('Cache client not initialized. Call createCacheClient first.');
  }
  return cacheClient;
}

export async function closeCacheClient(): Promise<void> {
  const logger = getLogger();

  if (cacheClient) {
    await cacheClient.quit();
    cacheClient = null;
    logger.info('Valkey client closed');
  }
}

export async function connectCacheClient(): Promise<void> {
  const client = getCacheClient();
  if (client.status !== 'ready') {
    await client.connect();
  }
}
