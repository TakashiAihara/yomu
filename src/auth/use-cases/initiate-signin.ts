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

  logger.info('Initiating OAuth sign-in flow');

  const stateData = createOAuthStateData(env.SESSION_SECRET, input.redirectUri);

  await storeOAuthState(stateData);

  const oauthConfig = createGoogleOAuthConfig(env);

  const authUrl = generateAuthUrl(oauthConfig, stateData.state, {
    prompt: 'consent',
  });

  logger.debug('OAuth authorization URL generated', {
    hasRedirectUri: Boolean(input.redirectUri),
  });

  return {
    authUrl,
    state: stateData.state,
  };
}
