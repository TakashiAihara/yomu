import {
  type CreateTRPCProxyClient,
  TRPCClientError,
  createTRPCProxyClient,
  httpBatchLink,
} from '@trpc/client';

import { getConfig } from '../shared/config.js';
import { AuthError, NetworkError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

// Import the AppRouter type from the API package
// This provides end-to-end type safety
import type { AppRouter } from '@yomu/api/trpc';

export type ApiClient = CreateTRPCProxyClient<AppRouter>;

export function createApiClient(sessionToken?: string): ApiClient {
  const config = getConfig();

  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${config.apiUrl}/trpc`,
        headers() {
          const headers: Record<string, string> = {
            'User-Agent': 'yomu-cli/0.1.0',
          };

          if (sessionToken) {
            headers.Authorization = `Bearer ${sessionToken}`;
          }

          return headers;
        },
      }),
    ],
  });
}

export function handleApiError(error: unknown): never {
  if (error instanceof TRPCClientError) {
    const code = error.data?.code;
    const message = error.message;

    logger.debug({ code, message }, 'API error');

    switch (code) {
      case 'UNAUTHORIZED':
        throw AuthError.invalidToken();
      case 'BAD_REQUEST':
        if (message.includes('state') || message.includes('expired')) {
          throw AuthError.stateExpired();
        }
        throw new Error(message);
      case 'FORBIDDEN':
        if (message.includes('denied')) {
          throw AuthError.denied();
        }
        throw new Error(message);
      case 'TOO_MANY_REQUESTS':
        throw AuthError.rateLimited();
      default:
        throw new Error(message || 'An unexpected error occurred');
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      throw NetworkError.connectionFailed();
    }
    throw error;
  }

  throw new Error('An unexpected error occurred');
}
