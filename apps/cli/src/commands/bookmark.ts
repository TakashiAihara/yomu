import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'node:readline';
import { createApiClient } from '../api/client.js';
import { createCredentialStore } from '../storage/credential-store.js';

async function addBookmark(url: string, options: { title?: string }) {
  const store = await createCredentialStore();
  const account = await store.getActiveAccount();

  if (!account) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  const spinner = ora('Adding bookmark...').start();

  try {
    const client = createApiClient(account.sessionToken);
    const bookmark = await client.bookmarks.create.mutate({
      url,
      title: options.title,
    });

    spinner.succeed('Bookmark added successfully');
    console.log(chalk.dim(`  ${bookmark.title ?? bookmark.url}`));
    console.log(chalk.dim(`  ID: ${bookmark.id}`));
  } catch (error: any) {
    spinner.fail('Failed to add bookmark');
    if (error.data?.code === 'CONFLICT') {
      console.error(chalk.yellow('  This URL is already bookmarked'));
    } else if (error.message?.includes('HTTP or HTTPS')) {
      console.error(chalk.red('  Invalid URL: Only http:// and https:// URLs are allowed'));
    } else if (error.message?.includes('500')) {
      console.error(chalk.red('  Title is too long (maximum 500 characters)'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function listBookmarks(options: { limit?: string; offset?: string }) {
  const store = await createCredentialStore();
  const account = await store.getActiveAccount();

  if (!account) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  const spinner = ora('Fetching bookmarks...').start();

  try {
    const client = createApiClient(account.sessionToken);
    const limit = options.limit ? parseInt(options.limit, 10) : 20;
    const offset = options.offset ? parseInt(options.offset, 10) : 0;

    const result = await client.bookmarks.list.query({
      limit,
      offset,
    });

    spinner.stop();

    if (result.bookmarks.length === 0) {
      console.log(chalk.yellow('No bookmarks found'));
      if (offset > 0) {
        console.log(chalk.dim('  Try reducing the --offset value'));
      }
      return;
    }

    console.log(chalk.bold(`\nBookmarks (${result.bookmarks.length} of ${result.total}):\n`));

    result.bookmarks.forEach((bookmark, index) => {
      const number = offset + index + 1;
      const title = bookmark.title ?? bookmark.url;
      const date = new Date(bookmark.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      console.log(chalk.cyan(`${number}. ${title}`));
      if (bookmark.title) {
        console.log(chalk.dim(`   ${bookmark.url}`));
      }
      console.log(chalk.dim(`   ID: ${bookmark.id} • ${date}`));
      console.log();
    });

    if (result.total > offset + result.bookmarks.length) {
      const remaining = result.total - offset - result.bookmarks.length;
      console.log(chalk.dim(`${remaining} more bookmark${remaining === 1 ? '' : 's'}...`));
      console.log(chalk.dim(`Use --offset ${offset + limit} to see more`));
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch bookmarks');
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function removeBookmark(bookmarkId: string, options: { force?: boolean }) {
  const store = await createCredentialStore();
  const account = await store.getActiveAccount();

  if (!account) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  const client = createApiClient(account.sessionToken);

  // Fetch bookmark details before deletion
  let spinner = ora('Fetching bookmark details...').start();

  try {
    const result = await client.bookmarks.list.query({
      limit: 100,
      offset: 0,
    });

    const bookmark = result.bookmarks.find((b) => b.id === bookmarkId);

    if (!bookmark) {
      spinner.fail('Bookmark not found');
      console.error(chalk.red(`  No bookmark with ID: ${bookmarkId}`));
      process.exit(1);
    }

    spinner.succeed('Bookmark found');

    // Show bookmark details
    console.log(chalk.bold('\nBookmark to delete:'));
    console.log(chalk.cyan(`  ${bookmark.title ?? bookmark.url}`));
    if (bookmark.title) {
      console.log(chalk.dim(`  ${bookmark.url}`));
    }
    console.log(chalk.dim(`  ID: ${bookmark.id}`));
    console.log();

    // Confirm deletion unless --force is used
    if (!options.force) {
      const confirmed = await askConfirmation(
        chalk.yellow('Are you sure you want to delete this bookmark? (y/N): ')
      );

      if (!confirmed) {
        console.log(chalk.dim('Deletion cancelled'));
        process.exit(0);
      }
    }

    // Delete the bookmark
    spinner = ora('Deleting bookmark...').start();

    await client.bookmarks.delete.mutate({
      bookmarkId,
    });

    spinner.succeed('Bookmark deleted successfully');
  } catch (error: any) {
    spinner.fail('Failed to delete bookmark');
    if (error.data?.code === 'NOT_FOUND') {
      console.error(chalk.red('  Bookmark not found or you do not have permission to delete it'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

export const bookmarkCommand = new Command('bookmark')
  .description('Manage bookmarks')
  .addCommand(
    new Command('add')
      .description('Add a new bookmark')
      .argument('<url>', 'URL to bookmark')
      .option('-t, --title <title>', 'Custom title for the bookmark')
      .action(addBookmark)
  )
  .addCommand(
    new Command('list')
      .description('List all bookmarks')
      .option('-l, --limit <limit>', 'Maximum number of bookmarks to show (default: 20, max: 100)', '20')
      .option('-o, --offset <offset>', 'Number of bookmarks to skip (default: 0)', '0')
      .action(listBookmarks)
  )
  .addCommand(
    new Command('remove')
      .description('Remove a bookmark')
      .argument('<id>', 'Bookmark ID to remove')
      .option('-f, --force', 'Skip confirmation prompt')
      .action(removeBookmark)
  );
