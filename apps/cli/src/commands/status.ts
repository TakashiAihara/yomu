import chalk from 'chalk';

import {
  formatExpirationTime,
  getValidAccount,
  isTokenExpiringSoon,
} from '../auth/token-manager.js';
import { logger } from '../shared/logger.js';

export async function statusCommand(): Promise<void> {
  try {
    const account = await getValidAccount();

    if (!account) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(`${chalk.red('✗')} Not logged in`);
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim("\nRun 'yomu login' to authenticate"));
      return;
    }

    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log(`${chalk.green('✓')} Logged in as ${chalk.bold(account.email)}`);
    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log(chalk.dim(`  Name: ${account.name}`));
    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log(chalk.dim(`  Session expires: ${formatExpirationTime(account)}`));

    if (isTokenExpiringSoon(account)) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.yellow('\n⚠ Session expires soon. It will be refreshed automatically.'));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('✗ ') + error.message);
      logger.debug({ error: error.message }, 'Status check failed');
    }
    process.exitCode = 1;
  }
}
