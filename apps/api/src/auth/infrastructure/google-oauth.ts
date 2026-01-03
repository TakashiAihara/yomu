import { z } from 'zod';
import { getLogger } from '../../shared/logging/logger.js';
import { type GoogleUserInfo, googleUserInfoSchema } from '../domain/user.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string(),
  id_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NETWORK_ERROR'
      | 'INVALID_RESPONSE'
      | 'AUTH_DENIED'
      | 'TOKEN_EXCHANGE_FAILED'
  ) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

export function generateAuthUrl(
  config: GoogleOAuthConfig,
  state: string,
  options?: {
    prompt?: 'none' | 'consent' | 'select_account';
    loginHint?: string;
  }
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: options?.prompt ?? 'consent',
  });

  if (options?.loginHint) {
    params.set('login_hint', options.loginHint);
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string
): Promise<GoogleTokenResponse> {
  const logger = getLogger();

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Token exchange failed', {
        status: response.status,
        error: errorBody,
      });
      throw new GoogleOAuthError(
        `Token exchange failed: ${response.status}`,
        'TOKEN_EXCHANGE_FAILED'
      );
    }

    const data = await response.json();
    const result = googleTokenResponseSchema.safeParse(data);

    if (!result.success) {
      logger.error('Invalid token response', { errors: result.error.errors });
      throw new GoogleOAuthError('Invalid token response from Google', 'INVALID_RESPONSE');
    }

    const tokenResponse: GoogleTokenResponse = {
      access_token: result.data.access_token,
      expires_in: result.data.expires_in,
      token_type: result.data.token_type,
      scope: result.data.scope,
    };
    if (result.data.id_token !== undefined) {
      tokenResponse.id_token = result.data.id_token;
    }
    if (result.data.refresh_token !== undefined) {
      tokenResponse.refresh_token = result.data.refresh_token;
    }
    return tokenResponse;
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      throw error;
    }

    logger.error('Network error during token exchange', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new GoogleOAuthError('Failed to connect to Google OAuth service', 'NETWORK_ERROR');
  }
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const logger = getLogger();

  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('Failed to fetch user info', { status: response.status });
      throw new GoogleOAuthError('Failed to fetch user info', 'INVALID_RESPONSE');
    }

    const data = await response.json();
    const result = googleUserInfoSchema.safeParse(data);

    if (!result.success) {
      logger.error('Invalid user info response', { errors: result.error.errors });
      throw new GoogleOAuthError('Invalid user info response from Google', 'INVALID_RESPONSE');
    }

    return result.data;
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      throw error;
    }

    logger.error('Network error fetching user info', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new GoogleOAuthError('Failed to connect to Google API', 'NETWORK_ERROR');
  }
}

export function decodeIdToken(idToken: string): GoogleUserInfo | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    const result = googleUserInfoSchema.safeParse(decoded);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function createGoogleOAuthConfig(env: {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}): GoogleOAuthConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}
