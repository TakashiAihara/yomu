import chalk from 'chalk';

import { logger } from '../shared/logger.js';
import { createCredentialStore } from '../storage/credential-store.js';

export async function switchCommand(email?: string): Promise<void> {
  try {
    const store = await createCredentialStore();
    const accounts = await store.listAccounts();

    if (accounts.length === 0) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim('No accounts stored.'));
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim("\nRun 'yomu login' to add an account."));
      return;
    }

    const activeAccount = await store.getActiveAccount();

    if (!email) {
      // List accounts
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.bold('Stored accounts:\n'));

      for (const account of accounts) {
        const isActive = activeAccount?.email === account.email;
        const marker = isActive ? chalk.green('●') : chalk.dim('○');
        const label = isActive ? chalk.bold(account.email) : account.email;

        // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
        console.log(`  ${marker} ${label}`);
        // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
        console.log(chalk.dim(`    ${account.name}`));
      }

      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim("\nUse 'yomu switch <email>' to switch accounts."));
      return;
    }

    // Switch to specified account
    const targetAccount = accounts.find((a) => a.email === email);

    if (!targetAccount) {
      console.error(`${chalk.red('✗ ')}Account not found: ${email}`);
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim('\nAvailable accounts:'));
      for (const account of accounts) {
        // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
        console.log(chalk.dim(`  - ${account.email}`));
      }
      process.exitCode = 1;
      return;
    }

    if (activeAccount?.email === email) {
      // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
      console.log(chalk.dim(`Already using ${email}`));
      return;
    }

    await store.setActiveAccount(email);
    // biome-ignore lint/suspicious/noConsoleLog: CLI user-facing output
    console.log(`${chalk.green('✓')} Switched to ${chalk.bold(email)}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`${chalk.red('✗ ')}${error.message}`);
      logger.debug({ error: error.message }, 'Switch failed');
    }
    process.exitCode = 1;
  }
}
