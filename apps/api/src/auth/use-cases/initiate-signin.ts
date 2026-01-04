import { getEnv } from '../../shared/config/env.js';
import { getLogger } from '../../shared/logging/logger.js';
import { createOAuthStateData } from '../domain/session.js';
import { createGoogleOAuthConfig, generateAuthUrl } from '../infrastructure/google-oauth.js';
import { storeOAuthState } from '../infrastructure/session-store.js';

export interface InitiateSignInInput {
  redirectUri?: string;
}

export interface InitiateSignInOutput {
  authUrl: string;
  state: string;
}

export async function initiateSignIn(
  input: InitiateSignInInput = {}
): Promise<InitiateSignInOutput> {
  const env = getEnv();
  const logger = getLogger();

  logger.info('Initiating OAuth sign-in flow', {
    inputRedirectUri: input.redirectUri,
    envRedirectUri: env.GOOGLE_REDIRECT_URI,
  });

  const stateData = createOAuthStateData(env.SESSION_SECRET, input.redirectUri);

  await storeOAuthState(stateData);

  const oauthConfig = createGoogleOAuthConfig(env);

  // Use CLI's redirect URI if provided, otherwise use env default
  const effectiveRedirectUri = input.redirectUri ?? env.GOOGLE_REDIRECT_URI;

  const authUrl = generateAuthUrl(
    { ...oauthConfig, redirectUri: effectiveRedirectUri },
    stateData.state,
    {
      prompt: 'consent',
    }
  );

  logger.info('OAuth authorization URL generated', {
    effectiveRedirectUri,
    authUrl: authUrl.substring(0, 100) + '...',
  });

  return {
    authUrl,
    state: stateData.state,
  };
}
