#!/usr/bin/env node

import { Command } from 'commander';

import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { statusCommand } from './commands/status.js';
import { switchCommand } from './commands/switch.js';

const program = new Command();

program
  .name('yomu')
  .description('Yomu CLI - Authenticate and interact with Yomu services')
  .version('0.1.0');

program
  .command('login')
  .description('Authenticate with Google OAuth')
  .option('-m, --manual', 'Use manual code entry instead of browser flow')
  .action(async (options) => {
    await loginCommand(options);
  });

program
  .command('logout')
  .description('Sign out and remove local credentials')
  .option('-a, --all', 'Sign out from all sessions on all devices')
  .action(async (options) => {
    await logoutCommand(options);
  });

program
  .command('status')
  .description('Check current authentication status')
  .action(async () => {
    await statusCommand();
  });

program
  .command('switch')
  .description('Switch between stored accounts')
  .argument('[email]', 'Email of the account to switch to')
  .action(async (email) => {
    await switchCommand(email);
  });

program.parse();
