import chalk from 'chalk';
import ora from 'ora';

import { createApiClient } from '../api/client.js';
import { AuthError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { createCredentialStore } from '../storage/credential-store.js';

export interface LogoutOptions {
  all?: boolean;
}

export async function logoutCommand(options: LogoutOptions = {}): Promise<void> {
  const spinner = ora();

  try {
    const store = await createCredentialStore();
    const account = await store.getActiveAccount();

    if (!account) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim('You are not logged in.'));
      return;
    }

    spinner.start('Signing out...');

    try {
      // Sign out from API
      const client = createApiClient(account.sessionToken);
      await client.auth.signOut.mutate({ allSessions: options.all ?? false });
    } catch (error) {
      // If API call fails, still remove local credentials
      logger.warn({ error }, 'API signout failed, removing local credentials anyway');
    }

    // Remove local credentials
    if (options.all) {
      await store.clear();
      spinner.succeed('Signed out from all sessions');
    } else {
      await store.removeAccount(account.email);
      spinner.succeed(`Signed out from ${chalk.bold(account.email)}`);
    }

    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log();
  } catch (error) {
    spinner.fail('Logout failed');

    if (error instanceof AuthError) {
      console.error(`${chalk.red('\n✗ ')}${error.userMessage}`);
    } else if (error instanceof Error) {
      console.error(`${chalk.red('\n✗ ')}${error.message}`);
    }

    logger.debug({ error }, 'Logout error');
    process.exitCode = 1;
  }
}
