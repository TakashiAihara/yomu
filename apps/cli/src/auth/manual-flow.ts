import * as readline from 'node:readline/promises';

import { createApiClient, handleApiError } from '../api/client.js';
import { logger } from '../shared/logger.js';
import { type StoredAccount, createCredentialStore } from '../storage/credential-store.js';

export interface ManualAuthResult {
  email: string;
  name: string;
  picture: string | undefined;
}

export async function manualAuthFlow(): Promise<ManualAuthResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Initialize OAuth flow (without redirect URI for manual flow)
    const client = createApiClient();

    const authResult = await client.auth.initiateSignIn.mutate({}).catch((error: unknown) => {
      handleApiError(error);
    });

    const { authUrl, state } = authResult;

    // Display URL for user
    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log('\nOpen this URL in your browser to authenticate:\n');
    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log(`  ${authUrl}\n`);

    // Prompt for authorization code
    const code = await rl.question('Enter the authorization code: ');

    if (!code.trim()) {
      throw new Error('Authorization code is required');
    }

    logger.debug('Received authorization code, exchanging for session');

    // Exchange code for session
    const sessionResult = await client.auth.handleCallback
      .mutate({
        code: code.trim(),
        state,
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
    rl.close();
  }
}
