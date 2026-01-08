# Quickstart: ブックマーク機能実装

**Feature**: 003-add-bookmark
**Date**: 2026-01-04

## Overview

このガイドは、ブックマーク機能を実装するための手順を説明します。Clean Architectureパターンに従い、domain → use-cases → infrastructure → presentation の順に実装します。

---

## Prerequisites

開始前の確認事項:

```bash
# 1. ブランチの確認
git status  # Should be on 003-add-bookmark branch

# 2. 依存関係のインストール
pnpm install

# 3. インフラの起動
docker compose up -d

# 4. 環境変数の確認
cat .env  # GOOGLE_CLIENT_ID, DATABASE_URL, etc.

# 5. APIサーバーの起動確認
pnpm --filter @yomu/api dev
# Should start without errors
```

---

## Implementation Steps

### Phase 1: Database Schema (5 min)

#### 1.1. Add bookmarks table to init.sql

**File**: `docker/postgres/init.sql`

```sql
-- Add after sessions table
CREATE TABLE IF NOT EXISTS bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url text NOT NULL,
    title varchar(500),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_url UNIQUE (user_id, url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS bookmarks_user_id_created_at_idx ON bookmarks(user_id, created_at DESC);
```

#### 1.2. Update Drizzle schema

**File**: `apps/api/src/shared/db/schema.ts`

```typescript
// Add after sessions table definition

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    title: varchar('title', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_user_url').on(table.userId, table.url),
    index('bookmarks_user_id_created_at_idx').on(table.userId, table.createdAt.desc()),
  ]
);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));

// Update usersRelations to add bookmarks
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  bookmarks: many(bookmarks),  // ADD THIS
}));

// Add type exports
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
```

#### 1.3. Recreate database

```bash
# Stop containers
docker compose down

# Remove volumes to recreate database
docker volume rm yomu_postgres_data

# Start fresh
docker compose up -d

# Verify schema
docker exec -it yomu-postgres psql -U yomu -d yomu -c "\d bookmarks"
```

**Checkpoint**: ✅ Database schema created successfully

---

### Phase 2: Domain Layer (10 min)

#### 2.1. Create domain types

**File**: `apps/api/src/bookmarks/domain/bookmark.ts` (NEW)

```typescript
/**
 * Bookmark domain entity
 */
export interface Bookmark {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  createdAt: Date;
}

/**
 * Input for creating a bookmark
 */
export interface CreateBookmarkInput {
  userId: string;
  url: string;
  title?: string | null;
}

/**
 * Input for listing bookmarks
 */
export interface ListBookmarksInput {
  userId: string;
  limit?: number;
  offset?: number;
}

/**
 * Input for deleting a bookmark
 */
export interface DeleteBookmarkInput {
  bookmarkId: string;
  userId: string;
}

/**
 * Repository interface (port)
 */
export interface BookmarkRepository {
  create(input: CreateBookmarkInput): Promise<Bookmark>;
  findByUserAndUrl(userId: string, url: string): Promise<Bookmark | null>;
  listByUser(input: ListBookmarksInput): Promise<{ bookmarks: Bookmark[]; total: number }>;
  delete(input: DeleteBookmarkInput): Promise<void>;
}
```

#### 2.2. Create domain errors

**File**: `apps/api/src/bookmarks/domain/errors.ts` (NEW)

```typescript
export class BookmarkError extends Error {
  constructor(
    message: string,
    public code: 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_URL',
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'BookmarkError';
  }

  static duplicate(url: string): BookmarkError {
    return new BookmarkError(`Bookmark already exists: ${url}`, 'DUPLICATE', false);
  }

  static notFound(id: string): BookmarkError {
    return new BookmarkError(`Bookmark not found: ${id}`, 'NOT_FOUND', false);
  }
}
```

**Checkpoint**: ✅ Domain types defined

---

### Phase 3: Infrastructure Layer (15 min)

#### 3.1. Implement repository

**File**: `apps/api/src/bookmarks/infrastructure/bookmark-repository.ts` (NEW)

```typescript
import { and, desc, eq, sql } from 'drizzle-orm';
import type { BookmarkRepository, CreateBookmarkInput, DeleteBookmarkInput, ListBookmarksInput } from '../domain/bookmark.js';
import { BookmarkError } from '../domain/errors.js';
import { getDatabase } from '../../shared/db/client.js';
import { bookmarks } from '../../shared/db/schema.js';

export function createBookmarkRepository(): BookmarkRepository {
  return {
    async create(input) {
      const db = getDatabase();

      // Check for duplicate
      const existing = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.userId, input.userId),
          eq(bookmarks.url, input.url)
        ),
      });

      if (existing) {
        throw BookmarkError.duplicate(input.url);
      }

      // Insert
      const [newBookmark] = await db
        .insert(bookmarks)
        .values({
          userId: input.userId,
          url: input.url,
          title: input.title ?? null,
        })
        .returning();

      return newBookmark;
    },

    async findByUserAndUrl(userId, url) {
      const db = getDatabase();
      const bookmark = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.url, url)
        ),
      });
      return bookmark ?? null;
    },

    async listByUser(input) {
      const db = getDatabase();

      const limit = input.limit ?? 20;
      const offset = input.offset ?? 0;

      // Get bookmarks
      const userBookmarks = await db.query.bookmarks.findMany({
        where: eq(bookmarks.userId, input.userId),
        orderBy: [desc(bookmarks.createdAt)],
        limit,
        offset,
      });

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, input.userId));

      const total = totalResult[0]?.count ?? 0;

      return {
        bookmarks: userBookmarks,
        total,
      };
    },

    async delete(input) {
      const db = getDatabase();

      const result = await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.id, input.bookmarkId),
            eq(bookmarks.userId, input.userId)
          )
        )
        .returning();

      if (result.length === 0) {
        throw BookmarkError.notFound(input.bookmarkId);
      }
    },
  };
}
```

**Checkpoint**: ✅ Repository implemented with Drizzle ORM

---

### Phase 4: Use Cases (15 min)

#### 4.1. Create bookmark use case

**File**: `apps/api/src/bookmarks/use-cases/create-bookmark.ts` (NEW)

```typescript
import type { CreateBookmarkInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';
import { getLogger } from '../../shared/logging/logger.js';

export async function createBookmark(input: CreateBookmarkInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Creating bookmark', { userId: input.userId, url: input.url });

  const bookmark = await repository.create(input);

  logger.info('Bookmark created', { bookmarkId: bookmark.id });

  return bookmark;
}
```

#### 4.2. List bookmarks use case

**File**: `apps/api/src/bookmarks/use-cases/list-bookmarks.ts` (NEW)

```typescript
import type { ListBookmarksInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';
import { getLogger } from '../../shared/logging/logger.js';

export async function listBookmarks(input: ListBookmarksInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Listing bookmarks', { userId: input.userId });

  const result = await repository.listByUser(input);

  logger.info('Bookmarks retrieved', { count: result.bookmarks.length, total: result.total });

  return result;
}
```

#### 4.3. Delete bookmark use case

**File**: `apps/api/src/bookmarks/use-cases/delete-bookmark.ts` (NEW)

```typescript
import type { DeleteBookmarkInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';
import { getLogger } from '../../shared/logging/logger.js';

export async function deleteBookmark(input: DeleteBookmarkInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Deleting bookmark', { bookmarkId: input.bookmarkId, userId: input.userId });

  await repository.delete(input);

  logger.info('Bookmark deleted', { bookmarkId: input.bookmarkId });

  return { success: true, deletedId: input.bookmarkId };
}
```

**Checkpoint**: ✅ Use cases implemented with logging

---

### Phase 5: Presentation Layer (tRPC Router) (10 min)

#### 5.1. Create bookmark router

**File**: `apps/api/src/bookmarks/presentation/bookmark-router.ts` (NEW)

```typescript
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../../trpc.js';
import { createBookmark } from '../use-cases/create-bookmark.js';
import { deleteBookmark } from '../use-cases/delete-bookmark.js';
import { listBookmarks } from '../use-cases/list-bookmarks.js';
import { BookmarkError } from '../domain/errors.js';

// Input schemas (from contract)
const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: 'URL must use HTTP or HTTPS protocol' }
);

const createBookmarkInputSchema = z.object({
  url: urlSchema,
  title: z.string().max(500).optional().nullable(),
});

const listBookmarksInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

const deleteBookmarkInputSchema = z.object({
  id: z.string().uuid(),
});

export const bookmarkRouter = router({
  create: protectedProcedure
    .input(createBookmarkInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const bookmark = await createBookmark({
          userId: ctx.user.id,
          url: input.url,
          title: input.title,
        });
        return bookmark;
      } catch (error) {
        if (error instanceof BookmarkError) {
          const codeMap = {
            DUPLICATE: 'CONFLICT',
            NOT_FOUND: 'NOT_FOUND',
            INVALID_URL: 'BAD_REQUEST',
          } as const;

          throw new TRPCError({
            code: codeMap[error.code],
            message: error.message,
          });
        }
        throw error;
      }
    }),

  list: protectedProcedure
    .input(listBookmarksInputSchema)
    .query(async ({ input, ctx }) => {
      const result = await listBookmarks({
        userId: ctx.user.id,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        bookmarks: result.bookmarks,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  delete: protectedProcedure
    .input(deleteBookmarkInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await deleteBookmark({
          bookmarkId: input.id,
          userId: ctx.user.id,
        });
        return result;
      } catch (error) {
        if (error instanceof BookmarkError) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        throw error;
      }
    }),
});

export type BookmarkRouter = typeof bookmarkRouter;
```

#### 5.2. Mount router in main app

**File**: `apps/api/src/trpc.ts` (MODIFY)

```typescript
// Add import
import { bookmarkRouter } from './bookmarks/presentation/bookmark-router.js';

// Update createAppRouter
export async function createAppRouter() {
  const { authRouter } = await import('./auth/presentation/auth-router.js');
  return router({
    auth: authRouter,
    bookmarks: bookmarkRouter,  // ADD THIS
  });
}
```

#### 5.3. Test API manually

```bash
# Start API
pnpm --filter @yomu/api dev

# In another terminal, test with curl or use CLI login
pnpm --filter @yomu/cli exec tsx src/index.ts login
```

**Checkpoint**: ✅ API endpoints working

---

### Phase 6: CLI Commands (20 min)

#### 6.1. Create bookmark command

**File**: `apps/cli/src/commands/bookmark.ts` (NEW)

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getTRPCClient } from '../api/client.js';
import { getStoredSession } from '../storage/session.js';

async function addBookmark(url: string, options: { title?: string }) {
  const session = getStoredSession();
  if (!session) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  const spinner = ora('Adding bookmark...').start();

  try {
    const client = getTRPCClient(session.token);
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
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function listBookmarks(options: { limit?: string; offset?: string }) {
  const session = getStoredSession();
  if (!session) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  const spinner = ora('Fetching bookmarks...').start();

  try {
    const client = getTRPCClient(session.token);
    const result = await client.bookmarks.list.query({
      limit: options.limit ? Number.parseInt(options.limit, 10) : 20,
      offset: options.offset ? Number.parseInt(options.offset, 10) : 0,
    });

    spinner.stop();

    if (result.bookmarks.length === 0) {
      console.log(chalk.dim('\nNo bookmarks found.'));
      return;
    }

    console.log(chalk.bold(`\nYour Bookmarks (${result.bookmarks.length} of ${result.total}):\n`));

    result.bookmarks.forEach((b, i) => {
      const num = result.offset + i + 1;
      console.log(chalk.bold(`${num}. ${b.title ?? b.url}`));
      console.log(chalk.dim(`   ID: ${b.id}`));
      if (b.title) {
        console.log(chalk.dim(`   URL: ${b.url}`));
      }
      console.log(chalk.dim(`   Added: ${new Date(b.createdAt).toLocaleDateString()}`));
      console.log('');
    });
  } catch (error: any) {
    spinner.fail('Failed to fetch bookmarks');
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

async function removeBookmark(id: string, options: { force?: boolean }) {
  const session = getStoredSession();
  if (!session) {
    console.error(chalk.red('✗ Not logged in. Run `yomu login` first.'));
    process.exit(1);
  }

  // TODO: Add confirmation prompt if not --force
  // For now, just delete

  const spinner = ora('Removing bookmark...').start();

  try {
    const client = getTRPCClient(session.token);
    await client.bookmarks.delete.mutate({ id });

    spinner.succeed('Bookmark removed successfully');
  } catch (error: any) {
    spinner.fail('Failed to remove bookmark');
    if (error.data?.code === 'NOT_FOUND') {
      console.error(chalk.yellow('  Bookmark not found'));
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
      .option('-l, --limit <number>', 'Number of bookmarks to show', '20')
      .option('-o, --offset <number>', 'Offset for pagination', '0')
      .action(listBookmarks)
  )
  .addCommand(
    new Command('remove')
      .description('Remove a bookmark')
      .argument('<id>', 'Bookmark ID to remove')
      .option('-f, --force', 'Skip confirmation prompt')
      .action(removeBookmark)
  );
```

#### 6.2. Register command in CLI

**File**: `apps/cli/src/index.ts` (MODIFY)

```typescript
// Add import
import { bookmarkCommand } from './commands/bookmark.js';

// Add after other commands
program.addCommand(bookmarkCommand);
```

**Checkpoint**: ✅ CLI commands working

---

### Phase 7: Testing (30 min)

#### 7.1. Manual testing

```bash
# Login
pnpm --filter @yomu/cli exec tsx src/index.ts login

# Add bookmark
pnpm --filter @yomu/cli exec tsx src/index.ts bookmark add "https://example.com" -t "Example Site"

# List bookmarks
pnpm --filter @yomu/cli exec tsx src/index.ts bookmark list

# Try duplicate (should fail)
pnpm --filter @yomu/cli exec tsx src/index.ts bookmark add "https://example.com"

# Remove bookmark (copy ID from list)
pnpm --filter @yomu/cli exec tsx src/index.ts bookmark remove <ID>
```

#### 7.2. Write contract tests

**File**: `tests/contract/bookmarks.test.ts` (NEW)

See `specs/003-add-bookmark/contracts/README.md` for test template.

**Checkpoint**: ✅ All tests passing

---

## Verification

Run full test suite:

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

All checks should pass ✅

---

## Next Steps

1. Create tasks.md with `/speckit.tasks` command
2. Implement tasks incrementally
3. Create PR for schema-first review
4. Implement remaining features (tags, search, etc.) in future iterations

---

## Troubleshooting

### Database issues

```bash
# Reset database
docker compose down -v
docker compose up -d
```

### Type errors

```bash
# Regenerate Drizzle types
pnpm --filter @yomu/api db:generate
```

### tRPC errors

- Check that router is mounted in trpc.ts
- Verify authentication (run `yomu login`)
- Check API logs for errors

---

## Time Estimate

- Phase 1 (Schema): 5 min
- Phase 2 (Domain): 10 min
- Phase 3 (Infrastructure): 15 min
- Phase 4 (Use Cases): 15 min
- Phase 5 (tRPC): 10 min
- Phase 6 (CLI): 20 min
- Phase 7 (Testing): 30 min

**Total**: ~105 minutes (1.75 hours)
