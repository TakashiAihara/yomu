import { and, eq, gt } from 'drizzle-orm';

import { getCacheClient } from '../../shared/cache/client.js';
import { getDatabase } from '../../shared/db/client.js';
import { type NewSession, type Session, sessions } from '../../shared/db/schema.js';
import { getLogger } from '../../shared/logging/logger.js';
import {
  type CreateSessionInput,
  type OAuthStateData,
  SESSION_DURATION_MS,
  STATE_TTL_SECONDS,
  type SessionEntity,
  createSession as createSessionData,
} from '../domain/session.js';

const SESSION_CACHE_PREFIX = 'session:';
const STATE_CACHE_PREFIX = 'oauth_state:';
const SESSION_CACHE_TTL = 3600;

function toSessionEntity(dbSession: Session): SessionEntity {
  return {
    id: dbSession.id,
    userId: dbSession.userId,
    token: dbSession.token,
    createdAt: dbSession.createdAt,
    expiresAt: dbSession.expiresAt,
    lastActivityAt: dbSession.lastActivityAt,
    userAgent: dbSession.userAgent,
    ipAddressHash: dbSession.ipAddressHash,
  };
}

export async function createSession(
  input: CreateSessionInput,
  secret: string
): Promise<SessionEntity> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  const sessionData = createSessionData(input, secret);

  const newSession: NewSession = {
    userId: sessionData.userId,
    token: sessionData.token,
    expiresAt: sessionData.expiresAt,
    lastActivityAt: sessionData.lastActivityAt,
    userAgent: sessionData.userAgent,
    ipAddressHash: sessionData.ipAddressHash,
  };

  try {
    const result = await db.insert(sessions).values(newSession).returning();
    const session = result[0];

    if (!session) {
      throw new Error('Failed to create session: no result returned');
    }

    const sessionEntity = toSessionEntity(session);

    await cache.setex(
      `${SESSION_CACHE_PREFIX}${session.token}`,
      SESSION_CACHE_TTL,
      JSON.stringify({
        ...sessionEntity,
        createdAt: sessionEntity.createdAt.toISOString(),
        expiresAt: sessionEntity.expiresAt.toISOString(),
        lastActivityAt: sessionEntity.lastActivityAt.toISOString(),
      })
    );

    logger.info('Session created', { sessionId: session.id, userId: input.userId });
    return sessionEntity;
  } catch (error) {
    logger.error('Failed to create session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getSessionByToken(token: string): Promise<SessionEntity | null> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    const cached = await cache.get(`${SESSION_CACHE_PREFIX}${token}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        lastActivityAt: new Date(parsed.lastActivityAt),
      };
    }

    const result = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
    if (!session) {
      return null;
    }

    const sessionEntity = toSessionEntity(session);

    await cache.setex(
      `${SESSION_CACHE_PREFIX}${token}`,
      SESSION_CACHE_TTL,
      JSON.stringify({
        ...sessionEntity,
        createdAt: sessionEntity.createdAt.toISOString(),
        expiresAt: sessionEntity.expiresAt.toISOString(),
        lastActivityAt: sessionEntity.lastActivityAt.toISOString(),
      })
    );

    return sessionEntity;
  } catch (error) {
    logger.error('Failed to get session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    const result = await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning({ token: sessions.token });

    const deletedSession = result[0];
    if (deletedSession) {
      await cache.del(`${SESSION_CACHE_PREFIX}${deletedSession.token}`);
    }

    logger.info('Session deleted', { sessionId });
  } catch (error) {
    logger.error('Failed to delete session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    await db.delete(sessions).where(eq(sessions.token, token));
    await cache.del(`${SESSION_CACHE_PREFIX}${token}`);

    logger.info('Session deleted by token');
  } catch (error) {
    logger.error('Failed to delete session by token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function deleteAllUserSessions(userId: string): Promise<number> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    const result = await db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning({ token: sessions.token });

    for (const session of result) {
      await cache.del(`${SESSION_CACHE_PREFIX}${session.token}`);
    }

    logger.info('All user sessions deleted', { userId, count: result.length });
    return result.length;
  } catch (error) {
    logger.error('Failed to delete all user sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getUserSessions(userId: string): Promise<SessionEntity[]> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    const result = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
      .orderBy(sessions.lastActivityAt);

    return result.map(toSessionEntity);
  } catch (error) {
    logger.error('Failed to get user sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function extendSession(
  sessionId: string,
  durationMs: number = SESSION_DURATION_MS
): Promise<void> {
  const db = getDatabase();
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    const newExpiresAt = new Date(Date.now() + durationMs);
    const result = await db
      .update(sessions)
      .set({
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
      .returning({ token: sessions.token });

    const session = result[0];
    if (session) {
      await cache.del(`${SESSION_CACHE_PREFIX}${session.token}`);
    }

    logger.debug('Session extended', { sessionId });
  } catch (error) {
    logger.error('Failed to extend session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function storeOAuthState(stateData: OAuthStateData): Promise<void> {
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    await cache.setex(
      `${STATE_CACHE_PREFIX}${stateData.state}`,
      STATE_TTL_SECONDS,
      JSON.stringify(stateData)
    );
    logger.debug('OAuth state stored');
  } catch (error) {
    logger.error('Failed to store OAuth state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getAndDeleteOAuthState(state: string): Promise<OAuthStateData | null> {
  const cache = getCacheClient();
  const logger = getLogger();

  try {
    const key = `${STATE_CACHE_PREFIX}${state}`;
    const data = await cache.get(key);

    if (!data) {
      return null;
    }

    await cache.del(key);
    return JSON.parse(data) as OAuthStateData;
  } catch (error) {
    logger.error('Failed to get OAuth state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
