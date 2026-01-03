import { getEnv } from '../../shared/config/env.js';
import { anonymizeEmail, anonymizeUserId, getLogger } from '../../shared/logging/logger.js';
import { validateOAuthStateData } from '../domain/session.js';
import { type UserEntity, createUserFromGoogleInfo, toUserResponse } from '../domain/user.js';
import {
  GoogleOAuthError,
  type GoogleTokenResponse,
  createGoogleOAuthConfig,
  decodeIdToken,
  exchangeCodeForTokens,
  fetchUserInfo,
} from '../infrastructure/google-oauth.js';
import { createSession, getAndDeleteOAuthState } from '../infrastructure/session-store.js';
import { createUser, findUserByGoogleId, updateLastSignIn } from '../infrastructure/user-repo.js';

export interface HandleCallbackInput {
  code: string;
  state: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface HandleCallbackOutput {
  user: ReturnType<typeof toUserResponse>;
  session: {
    token: string;
    expiresAt: string;
  };
  isNewUser: boolean;
  redirectUri?: string;
}

export class CallbackError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_STATE'
      | 'STATE_EXPIRED'
      | 'AUTH_DENIED'
      | 'OAUTH_UNAVAILABLE'
      | 'TOKEN_EXCHANGE_FAILED'
      | 'USER_INFO_FAILED'
  ) {
    super(message);
    this.name = 'CallbackError';
  }
}

export async function handleCallback(input: HandleCallbackInput): Promise<HandleCallbackOutput> {
  const env = getEnv();
  const logger = getLogger();

  logger.info('Processing OAuth callback');

  const stateData = await getAndDeleteOAuthState(input.state);

  if (!stateData) {
    logger.warn('OAuth state not found or expired', { state: input.state.substring(0, 8) });
    throw new CallbackError(
      'Your sign-in session has expired. Please try signing in again.',
      'STATE_EXPIRED'
    );
  }

  if (!validateOAuthStateData(stateData, env.SESSION_SECRET)) {
    logger.warn('Invalid OAuth state HMAC');
    throw new CallbackError(
      'Invalid authentication request. Please try signing in again.',
      'INVALID_STATE'
    );
  }

  const oauthConfig = createGoogleOAuthConfig(env);

  let tokens: GoogleTokenResponse;
  try {
    tokens = await exchangeCodeForTokens(oauthConfig, input.code);
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      if (error.code === 'NETWORK_ERROR') {
        logger.error('Google OAuth service unavailable during token exchange');
        throw new CallbackError(
          "We couldn't connect to Google's authentication service. Please try again in a few moments.",
          'OAUTH_UNAVAILABLE'
        );
      }
      throw new CallbackError(
        'Failed to complete sign-in with Google. Please try again.',
        'TOKEN_EXCHANGE_FAILED'
      );
    }
    throw error;
  }

  let googleUserInfo = tokens.id_token ? decodeIdToken(tokens.id_token) : null;

  if (!googleUserInfo) {
    try {
      googleUserInfo = await fetchUserInfo(tokens.access_token);
    } catch (error) {
      if (error instanceof GoogleOAuthError && error.code === 'NETWORK_ERROR') {
        logger.error('Google API unavailable during user info fetch');
        throw new CallbackError(
          "We couldn't connect to Google's API. Please try again in a few moments.",
          'OAUTH_UNAVAILABLE'
        );
      }
      throw new CallbackError(
        'Failed to retrieve your Google profile. Please try again.',
        'USER_INFO_FAILED'
      );
    }
  }

  let user: UserEntity;
  let isNewUser = false;

  const existingUser = await findUserByGoogleId(googleUserInfo.sub);

  if (existingUser) {
    user = existingUser;
    await updateLastSignIn(user.id);
    logger.info('Existing user signed in', {
      userId: anonymizeUserId(user.id),
      email: anonymizeEmail(user.email),
    });
  } else {
    const createInput = createUserFromGoogleInfo(googleUserInfo);
    user = await createUser(createInput);
    isNewUser = true;
    logger.info('New user created and signed in', {
      userId: anonymizeUserId(user.id),
      email: anonymizeEmail(user.email),
    });
  }

  const session = await createSession(
    {
      userId: user.id,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    },
    env.SESSION_SECRET
  );

  logger.info('Authentication successful', {
    userId: anonymizeUserId(user.id),
    isNewUser,
    sessionId: session.id.substring(0, 8),
  });

  const result: HandleCallbackOutput = {
    user: toUserResponse(user),
    session: {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    },
    isNewUser,
  };

  if (stateData.redirectUri !== undefined) {
    result.redirectUri = stateData.redirectUri;
  }

  return result;
}

export function handleAuthDenied(error?: string, errorDescription?: string): never {
  const logger = getLogger();

  logger.info('User denied OAuth permissions', {
    error,
    errorDescription,
  });

  throw new CallbackError(
    "You declined to sign in with Google. You can try again whenever you're ready.",
    'AUTH_DENIED'
  );
}
