import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';
import { z } from 'zod';

import { protectedProcedure, publicProcedure, router } from '../../trpc.js';
import { getProfile } from '../use-cases/get-profile.js';
import { CallbackError, handleAuthDenied, handleCallback } from '../use-cases/handle-callback.js';
import { type InitiateSignInInput, initiateSignIn } from '../use-cases/initiate-signin.js';
import { refreshSession } from '../use-cases/refresh-session.js';
import { signOut } from '../use-cases/sign-out.js';

const initiateSignInInputSchema = z.object({
  redirectUri: z.string().url().optional(),
});

const handleCallbackInputSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

const signOutInputSchema = z.object({
  allSessions: z.boolean().default(false),
});

export const authRouter = router({
  initiateSignIn: publicProcedure.input(initiateSignInInputSchema).mutation(async ({ input }) => {
    const signInInput: InitiateSignInInput = {};
    if (input.redirectUri !== undefined) {
      signInInput.redirectUri = input.redirectUri;
    }
    const result = await initiateSignIn(signInInput);

    return {
      authUrl: result.authUrl,
      state: result.state,
    };
  }),

  handleCallback: publicProcedure
    .input(handleCallbackInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.error) {
        if (input.error === 'access_denied') {
          handleAuthDenied(input.error, input.errorDescription);
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: input.errorDescription ?? 'Authentication failed',
        });
      }

      try {
        const userAgent = ctx.honoContext.req.header('user-agent');
        const forwardedFor = ctx.honoContext.req.header('x-forwarded-for');
        const ipAddress = forwardedFor?.split(',')[0]?.trim();

        const callbackInput: Parameters<typeof handleCallback>[0] = {
          code: input.code,
          state: input.state,
        };
        if (userAgent !== undefined) {
          callbackInput.userAgent = userAgent;
        }
        if (ipAddress !== undefined) {
          callbackInput.ipAddress = ipAddress;
        }

        const result = await handleCallback(callbackInput);

        return result;
      } catch (error) {
        if (error instanceof CallbackError) {
          const codeMap: Record<CallbackError['code'], TRPC_ERROR_CODE_KEY> = {
            INVALID_STATE: 'BAD_REQUEST',
            STATE_EXPIRED: 'BAD_REQUEST',
            AUTH_DENIED: 'FORBIDDEN',
            OAUTH_UNAVAILABLE: 'INTERNAL_SERVER_ERROR',
            TOKEN_EXCHANGE_FAILED: 'INTERNAL_SERVER_ERROR',
            USER_INFO_FAILED: 'INTERNAL_SERVER_ERROR',
          };

          throw new TRPCError({
            code: codeMap[error.code],
            message: error.message,
          });
        }
        throw error;
      }
    }),

  signOut: protectedProcedure.input(signOutInputSchema).mutation(async ({ input, ctx }) => {
    const result = await signOut({
      userId: ctx.user.id,
      sessionId: ctx.sessionId,
      allSessions: input.allSessions,
    });

    return {
      success: true,
      terminatedSessions: result.terminatedSessions,
    };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const result = await getProfile({
      userId: ctx.user.id,
      currentSessionId: ctx.sessionId,
    });

    return result;
  }),

  refreshSession: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await refreshSession({
      sessionId: ctx.sessionId,
    });

    return {
      success: result.success,
      expiresAt: result.expiresAt,
    };
  }),
});

export type AuthRouter = typeof authRouter;
