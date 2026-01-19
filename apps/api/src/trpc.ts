import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from 'hono';

import type { User } from './shared/db/schema.js';

export interface TRPCContext {
  [key: string]: unknown;
  honoContext: Context;
  user: User | null;
  sessionId: string | null;
}

export function createContext(honoContext: Context): TRPCContext {
  const user = (honoContext.get('user') as User | null) ?? null;
  const sessionId = (honoContext.get('sessionId') as string | null) ?? null;

  return {
    honoContext,
    user,
    sessionId,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.sessionId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      sessionId: ctx.sessionId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);

export type AppRouter = Awaited<ReturnType<typeof createAppRouter>>;

export async function createAppRouter() {
  // Dynamic import to avoid circular dependency
  const { authRouter } = await import('./auth/presentation/auth-router.js');
  const { bookmarkRouter } = await import('./bookmarks/presentation/bookmark-router.js');
  const { feedRouter } = await import('./feeds/presentation/feed-router.js');
  return router({
    auth: authRouter,
    bookmarks: bookmarkRouter,
    feeds: feedRouter,
  });
}
