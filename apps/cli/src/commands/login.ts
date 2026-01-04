import chalk from 'chalk';
import ora from 'ora';

import { browserAuthFlow } from '../auth/browser-flow.js';
import { manualAuthFlow } from '../auth/manual-flow.js';
import { isTokenExpired } from '../auth/token-manager.js';
import { isHeadlessEnvironment } from '../lib/browser.js';
import { AuthError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { createCredentialStore } from '../storage/credential-store.js';

export interface LoginOptions {
  manual?: boolean;
}

export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  const spinner = ora();

  try {
    // Check if already authenticated
    const store = await createCredentialStore();
    const existingAccount = await store.getActiveAccount();

    if (existingAccount && !isTokenExpired(existingAccount)) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(
        chalk.yellow(`\nYou are already logged in as ${chalk.bold(existingAccount.email)}`)
      );
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim('Run with a new login to switch accounts.'));
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log();

      // Could prompt for re-auth here, but for now just inform
      return;
    }

    // Use manual flow only if explicitly requested
    if (options.manual) {
      const result = await manualAuthFlow();

      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log();
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(`${chalk.green('✓')} Logged in as ${chalk.bold(result.email)}`);
    } else {
      // Browser flow works for both GUI and headless environments
      // In headless, it shows URL for manual opening but still uses local callback server
      const isHeadless = isHeadlessEnvironment();

      if (!isHeadless) {
        spinner.start('Opening browser for authentication...');
      }

      try {
        const result = await browserAuthFlow();

        if (isHeadless) {
          // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
          console.log(`${chalk.green('✓')} Logged in as ${chalk.bold(result.email)}`);
        } else {
          spinner.succeed(`Logged in as ${chalk.bold(result.email)}`);
        }
      } catch (error) {
        if (!isHeadless) {
          spinner.fail('Authentication failed');
        }
        throw error;
      }
    }

    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log();
  } catch (error) {
    if (error instanceof AuthError) {
      console.error(chalk.red('\n✗ ') + error.userMessage);

      if (error.retryable) {
        // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
        console.log(chalk.dim('\nYou can try again with: yomu login'));
      }

      logger.debug({ error: error.code }, 'Auth error');
    } else if (error instanceof Error) {
      console.error(chalk.red('\n✗ ') + error.message);
      logger.debug({ error: error.message }, 'Unexpected error');
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }

    process.exitCode = 1;
  }
}
