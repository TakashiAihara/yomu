# Research: ブックマーク追加機能

**Feature**: 003-add-bookmark
**Date**: 2026-01-04
**Status**: Complete

## Overview

This document consolidates research findings for implementing the bookmark feature in the Yomu project. The feature requires database schema design, tRPC API implementation, and CLI command integration.

---

## 1. Database Schema Design

### Decision: Bookmarks Table Structure

```sql
CREATE TABLE bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url text NOT NULL,
    title varchar(500),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_url UNIQUE (user_id, url)
);

CREATE INDEX bookmarks_user_id_created_at_idx ON bookmarks(user_id, created_at DESC);
```

**Drizzle ORM Schema**:
```typescript
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
```

### Rationale

- **UUID primary key**: Consistent with existing users/sessions tables
- **user_id foreign key with CASCADE**: Automatically deletes user's bookmarks when user is deleted
- **url as text**: URLs can be long (>255 chars), text type provides flexibility
- **title optional**: User can provide custom title, defaults to NULL (CLI will use URL as fallback)
- **Unique constraint on (user_id, url)**: Prevents duplicate bookmarks per user (FR-002)
- **Composite index (user_id, created_at DESC)**: Optimizes list queries sorted by newest first

### Alternatives Considered

- **VARCHAR(2048) for URL**: Rejected - some URLs exceed 2KB, text is safer
- **Separate tags table**: Out of scope per spec (can be added later)
- **Auto-fetch title from OGP**: Future enhancement, not in current scope

---

## 2. URL Validation

### Decision: Zod URL Validation with Custom Refinement

```typescript
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
```

### Rationale

- **Built-in Zod .url()**: Validates basic URL structure
- **Custom refinement**: Restricts to http/https protocols only (security)
- **Native URL API**: Browser/Node.js standard, no additional dependencies
- **Rejects file://, ftp://, javascript://**: Security best practice

### Alternatives Considered

- **Regex validation**: Rejected - URL parsing is complex, native URL API is safer
- **validator.js library**: Rejected - adds dependency, Zod sufficient
- **Allow all protocols**: Rejected - file:// and javascript:// are security risks

---

## 3. Drizzle ORM Relations & Queries

### Decision: Use Relational Queries for Bookmarks

**Schema Relations**:
```typescript
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  bookmarks: many(bookmarks),  // NEW
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));
```

**Query Patterns**:
```typescript
// List bookmarks with pagination
const userBookmarks = await db.query.bookmarks.findMany({
  where: eq(bookmarks.userId, userId),
  orderBy: [desc(bookmarks.createdAt)],
  limit: limit,
  offset: offset,
});

// Check for duplicates
const existing = await db.query.bookmarks.findFirst({
  where: and(
    eq(bookmarks.userId, userId),
    eq(bookmarks.url, url)
  ),
});

// Delete bookmark
await db.delete(bookmarks).where(
  and(
    eq(bookmarks.id, bookmarkId),
    eq(bookmarks.userId, userId)
  )
);
```

### Rationale

- **Relational queries**: Type-safe, follows existing pattern in schema.ts
- **Composite where clauses**: Uses `and()` helper for multi-condition queries
- **User ID in delete**: Prevents users from deleting other users' bookmarks
- **desc() ordering**: Newest bookmarks first, matches spec requirement

### Alternatives Considered

- **Raw SQL queries**: Rejected - loses type safety, Drizzle ORM is mandated
- **No relations**: Rejected - relations improve query ergonomics

---

## 4. Commander.js Subcommand Pattern

### Decision: Nested Subcommands with `.command().command()`

```typescript
// In apps/cli/src/index.ts
import { bookmarkCommand } from './commands/bookmark.js';

program
  .addCommand(bookmarkCommand);

// In apps/cli/src/commands/bookmark.ts
import { Command } from 'commander';

export const bookmarkCommand = new Command('bookmark')
  .description('Manage bookmarks')
  .addCommand(
    new Command('add')
      .description('Add a new bookmark')
      .argument('<url>', 'URL to bookmark')
      .option('-t, --title <title>', 'Custom title for the bookmark')
      .action(async (url, options) => {
        // Implementation
      })
  )
  .addCommand(
    new Command('list')
      .description('List all bookmarks')
      .option('-l, --limit <number>', 'Number of bookmarks to show', '20')
      .option('-o, --offset <number>', 'Offset for pagination', '0')
      .action(async (options) => {
        // Implementation
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove a bookmark')
      .argument('<id>', 'Bookmark ID to remove')
      .option('-f, --force', 'Skip confirmation prompt')
      .action(async (id, options) => {
        // Implementation
      })
  );
```

### Rationale

- **Separate file**: Keeps index.ts clean, follows existing command pattern
- **`.addCommand()`**: Proper way to nest subcommands in Commander.js
- **Argument vs option**: URLs and IDs are required arguments, flags are options
- **Default limit**: 20 bookmarks per page (reasonable default)
- **Force flag**: Allows scripting without interactive prompts

### Alternatives Considered

- **Flat commands**: `yomu add-bookmark` - Rejected, less organized as features grow
- **Positional args for all**: Rejected - options are clearer for optional params

---

## 5. tRPC Pagination Pattern

### Decision: Limit/Offset Pagination with Count

```typescript
const listBookmarksInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

listBookmarks: protectedProcedure
  .input(listBookmarksInputSchema)
  .query(async ({ input, ctx }) => {
    const bookmarks = await db.query.bookmarks.findMany({
      where: eq(bookmarks.userId, ctx.user.id),
      orderBy: [desc(bookmarks.createdAt)],
      limit: input.limit,
      offset: input.offset,
    });

    // Optional: Return total count for pagination UI
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks)
      .where(eq(bookmarks.userId, ctx.user.id))
      .then((result) => result[0]?.count ?? 0);

    return {
      bookmarks,
      total,
      limit: input.limit,
      offset: input.offset,
    };
  });
```

### Rationale

- **Limit/offset**: Simple, stateless, works well for CLI use case
- **Max 100 limit**: Prevents resource abuse, reasonable upper bound
- **Total count**: Useful for CLI to show "X of Y bookmarks"
- **Default 20**: Balances screen space and number of API calls

### Alternatives Considered

- **Cursor-based pagination**: Rejected - more complex, limit/offset sufficient for bookmarks
- **Infinite scroll**: Rejected - CLI doesn't need real-time updates
- **No pagination**: Rejected - could load thousands of bookmarks inefficiently

---

## 6. Error Handling Patterns

### Decision: Custom Error Class + tRPC Error Mapping

```typescript
// Domain error
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
    return new BookmarkError(
      `Bookmark already exists: ${url}`,
      'DUPLICATE',
      false
    );
  }

  static notFound(id: string): BookmarkError {
    return new BookmarkError(
      `Bookmark not found: ${id}`,
      'NOT_FOUND',
      false
    );
  }
}

// tRPC router error mapping
try {
  const result = await createBookmark(input);
  return result;
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
```

### Rationale

- **Custom error class**: Type-safe, follows existing AuthError pattern
- **Static factory methods**: Consistent error messages
- **tRPC error mapping**: Converts domain errors to HTTP-like status codes
- **isRetryable flag**: Future enhancement for retry logic

### Alternatives Considered

- **Throw TRPCError directly**: Rejected - couples domain layer to tRPC
- **String error codes**: Rejected - less type-safe than const enum

---

## 7. CLI Output Formatting

### Decision: chalk + ora for Styled Output

```typescript
import chalk from 'chalk';
import ora from 'ora';

// Success message
console.log(chalk.green('✓') + ' Bookmark added successfully');
console.log(chalk.dim(`  ${url}`));

// Table output for list
console.log('\nYour Bookmarks:\n');
bookmarks.forEach((b, i) => {
  console.log(chalk.bold(`${i + 1}. ${b.title ?? b.url}`));
  console.log(chalk.dim(`   ID: ${b.id}`));
  console.log(chalk.dim(`   URL: ${b.url}`));
  console.log(chalk.dim(`   Added: ${new Date(b.createdAt).toLocaleDateString()}`));
  console.log('');
});

// Spinner for loading
const spinner = ora('Fetching bookmarks...').start();
// ... API call
spinner.succeed('Bookmarks loaded');
```

### Rationale

- **chalk**: Already in dependencies, provides color output
- **ora**: Already in dependencies, provides spinners (used in login command)
- **Consistent with existing CLI**: Matches auth command styling
- **Graceful degradation**: Works in non-TTY environments

### Alternatives Considered

- **cli-table3**: Rejected - overkill for simple list output
- **Plain text**: Rejected - less user-friendly, harder to scan

---

## Summary

All technical decisions align with project constitution:
- ✅ Drizzle ORM for database
- ✅ tRPC for API (no OpenAPI)
- ✅ Clean Architecture (domain → use-cases → infrastructure → presentation)
- ✅ Existing tools (chalk, ora, commander)
- ✅ YAGNI principle (no premature optimization)

No additional dependencies required. Ready to proceed to Phase 1 (data-model.md, contracts).
