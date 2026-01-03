import { lt } from 'drizzle-orm';

import { getLogger } from '../logging/logger.js';
import { getDatabase } from './client.js';
import { sessions } from './schema.js';

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    const result = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id });

    const deletedCount = result.length;

    if (deletedCount > 0) {
      logger.info('Cleaned up expired sessions', { deletedCount });
    }

    return deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export function startCleanupScheduler(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  const logger = getLogger();

  logger.info('Starting session cleanup scheduler', { intervalMs });

  const intervalId = setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch {
      // Error already logged in cleanupExpiredSessions
    }
  }, intervalMs);

  return intervalId;
}

export function stopCleanupScheduler(intervalId: NodeJS.Timeout): void {
  const logger = getLogger();

  clearInterval(intervalId);
  logger.info('Session cleanup scheduler stopped');
}
