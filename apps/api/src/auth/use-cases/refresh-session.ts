import { getLogger, hashForLogging } from '../../shared/logging/logger.js';
import { SESSION_DURATION_MS } from '../domain/session.js';
import { extendSession } from '../infrastructure/session-store.js';

export interface RefreshSessionInput {
  sessionId: string;
}

export interface RefreshSessionOutput {
  success: boolean;
  expiresAt: string;
}

export async function refreshSession(input: RefreshSessionInput): Promise<RefreshSessionOutput> {
  const logger = getLogger();

  logger.debug('Refreshing session', {
    sessionIdHash: hashForLogging(input.sessionId),
  });

  await extendSession(input.sessionId, SESSION_DURATION_MS);

  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  logger.info('Session refreshed', {
    sessionIdHash: hashForLogging(input.sessionId),
    newExpiresAt: newExpiresAt.toISOString(),
  });

  return {
    success: true,
    expiresAt: newExpiresAt.toISOString(),
  };
}
