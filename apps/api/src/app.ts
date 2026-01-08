import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { SESSION_DURATION_MS, shouldExtendSession } from './auth/domain/session.js';
import { extendSession, getSessionByToken } from './auth/infrastructure/session-store.js';
import { findUserById } from './auth/infrastructure/user-repo.js';
import type { User } from './shared/db/schema.js';
import { getLogger } from './shared/logging/logger.js';
import type { TRPCContext } from './trpc.js';

const SESSION_COOKIE_NAME = 'yomu_session';

type Variables = {
  user: User | null;
  sessionId: string | null;
};

export function createApp() {
  const app = new Hono<{ Variables: Variables }>();
  const logger = getLogger();

  app.use('*', honoLogger());

  app.use('*', secureHeaders());

  app.use(
    '*',
    cors({
      origin: (origin) => origin,
      credentials: true,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  app.use('*', async (c, next) => {
    c.set('user', null);
    c.set('sessionId', null);

    // Support both cookie and Authorization header
    let sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (!sessionToken) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (sessionToken) {
      try {
        const session = await getSessionByToken(sessionToken);

        if (session) {
          const user = await findUserById(session.userId);

          if (user) {
            c.set('user', user as User);
            c.set('sessionId', session.id);

            if (shouldExtendSession(session)) {
              await extendSession(session.id, SESSION_DURATION_MS);
              logger.debug('Session auto-extended', { sessionId: session.id.substring(0, 8) });
            }
          }
        }
      } catch (error) {
        logger.error('Session validation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await next();
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.onError((err, c) => {
    logger.error('Unhandled error', {
      error: err.message,
      path: c.req.path,
      method: c.req.method,
    });

    return c.json(
      {
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
      500
    );
  });

  app.notFound((c) => {
    return c.json(
      {
        error: {
          message: 'Not found',
          code: 'NOT_FOUND',
        },
      },
      404
    );
  });

  return app;
}

export function mountTRPC(
  app: ReturnType<typeof createApp>,
  appRouter: Parameters<typeof trpcServer>[0]['router']
) {
  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
      createContext: (_opts, c): TRPCContext => {
        const user = (c.get('user') as User | null) ?? null;
        const sessionId = (c.get('sessionId') as string | null) ?? null;
        return {
          honoContext: c,
          user,
          sessionId,
        };
      },
    })
  );
}

export type App = ReturnType<typeof createApp>;
