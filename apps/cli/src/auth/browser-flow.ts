import { createApiClient, handleApiError } from '../api/client.js';
import { getBrowserOpenInstructions, isHeadlessEnvironment, openBrowser } from '../lib/browser.js';
import { AuthError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { type StoredAccount, createCredentialStore } from '../storage/credential-store.js';

import { startCallbackServer, stopCallbackServer, waitForCallback } from './callback-server.js';

const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface BrowserAuthResult {
  email: string;
  name: string;
  picture: string | undefined;
}

export async function browserAuthFlow(): Promise<BrowserAuthResult> {
  if (isHeadlessEnvironment()) {
    logger.warn('Headless environment detected, browser flow may not work');
  }

  // Start local callback server
  const { port, server } = await startCallbackServer();
  const redirectUri = `http://localhost:${port}/callback`;

  logger.debug({ port, redirectUri }, 'Started callback server');

  try {
    // Initialize OAuth flow
    const client = createApiClient();

    const authResult = await client.auth.initiateSignIn
      .mutate({ redirectUri })
      .catch((error: unknown) => {
        handleApiError(error);
      });

    const { authUrl, state } = authResult;

    logger.debug({ authUrl: `${authUrl.substring(0, 50)}...` }, 'Got auth URL');

    // Open browser or show URL
    const browserOpened = await openBrowser(authUrl);

    if (!browserOpened) {
      // Headless/SSH environment: show URL for manual opening
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log('\nOpen this URL in your browser to authenticate:\n');
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(`  ${authUrl}\n`);
    }

    // Wait for callback
    logger.info('Waiting for authentication...');

    const callbackResult = await waitForCallback(server, AUTH_TIMEOUT_MS);

    // Validate state
    if (callbackResult.state !== state) {
      throw AuthError.invalidState();
    }

    // Exchange code for session
    const sessionResult = await client.auth.handleCallback
      .mutate({
        code: callbackResult.code,
        state: callbackResult.state,
      })
      .catch((error: unknown) => {
        handleApiError(error);
      });

    // Save credentials
    const account: StoredAccount = {
      email: sessionResult.user.email,
      name: sessionResult.user.displayName ?? sessionResult.user.email,
      picture: sessionResult.user.profilePicture ?? undefined,
      sessionToken: sessionResult.session.token,
      expiresAt: sessionResult.session.expiresAt,
      createdAt: new Date().toISOString(),
    };

    const store = await createCredentialStore();
    await store.saveAccount(account);

    logger.info({ email: account.email }, 'Authentication successful');

    return {
      email: account.email,
      name: account.name,
      picture: account.picture ?? undefined,
    };
  } finally {
    await stopCallbackServer(server);
  }
}
