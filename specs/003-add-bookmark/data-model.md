# Data Model: ブックマーク追加機能

**Feature**: 003-add-bookmark
**Date**: 2026-01-04
**Status**: Design Complete

## Overview

This document defines the data model for the bookmark feature, including entities, value objects, database schema, and domain types.

---

## 1. Entity Model

### Bookmark Entity

**Purpose**: Represents a user's saved URL bookmark with optional custom title.

**Attributes**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Unique identifier (primary key) |
| userId | UUID | Yes | Foreign key to users table |
| url | string | Yes | Bookmarked URL (validated http/https) |
| title | string \| null | No | Custom title (defaults to null, CLI uses URL as fallback) |
| createdAt | Date | Yes | Timestamp when bookmark was created |

**Invariants**:
- URL must be valid http/https URL
- Each user can only bookmark a URL once (unique constraint on userId + url)
- Bookmark cannot exist without a user (foreign key constraint)
- Created timestamp is immutable

**Lifecycle**:
1. Created when user runs `yomu bookmark add <url>`
2. Retrieved when user runs `yomu bookmark list`
3. Deleted when user runs `yomu bookmark remove <id>` or user is deleted (cascade)

---

## 2. Database Schema

### Bookmarks Table

```sql
CREATE TABLE bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url text NOT NULL,
    title varchar(500),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_url UNIQUE (user_id, url)
);

-- Optimized for "list bookmarks for user, newest first" query
CREATE INDEX bookmarks_user_id_created_at_idx ON bookmarks(user_id, created_at DESC);
```

### Drizzle ORM Schema

```typescript
// File: apps/api/src/shared/db/schema.ts

import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

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

// Update existing usersRelations to include bookmarks
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  bookmarks: many(bookmarks),  // ADD THIS LINE
}));

// Type exports
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
```

**Schema Design Decisions**:
- **UUID**: Consistent with existing users/sessions tables
- **text for URL**: Handles long URLs (some exceed 2KB)
- **varchar(500) for title**: Reasonable limit for bookmark titles
- **Unique index on (user_id, url)**: Enforces FR-002 (no duplicate bookmarks)
- **Composite index**: Optimizes common query (user's bookmarks, newest first)
- **CASCADE delete**: Clean up bookmarks when user is deleted

---

## 3. Domain Types

### TypeScript Types (Domain Layer)

```typescript
// File: apps/api/src/bookmarks/domain/bookmark.ts

/**
 * Bookmark entity in domain layer
 */
export interface Bookmark {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  createdAt: Date;
}

/**
 * Input for creating a new bookmark
 */
export interface CreateBookmarkInput {
  userId: string;
  url: string;
  title?: string | null;
}

/**
 * Input for listing bookmarks with pagination
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
  userId: string;  // For authorization
}

/**
 * Repository interface (port in Clean Architecture)
 */
export interface BookmarkRepository {
  create(input: CreateBookmarkInput): Promise<Bookmark>;
  findByUserAndUrl(userId: string, url: string): Promise<Bookmark | null>;
  listByUser(input: ListBookmarksInput): Promise<Bookmark[]>;
  countByUser(userId: string): Promise<number>;
  delete(input: DeleteBookmarkInput): Promise<void>;
  findById(id: string): Promise<Bookmark | null>;
}
```

---

## 4. Validation Rules

### URL Validation

```typescript
// Zod schema for tRPC input validation
import { z } from 'zod';

export const urlSchema = z.string().url().refine(
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

**Rules**:
- Must be valid URL format
- Protocol must be `http://` or `https://`
- Rejects `file://`, `javascript://`, `data:`, etc. (security)

### Title Validation

```typescript
export const titleSchema = z.string().max(500).optional().nullable();
```

**Rules**:
- Optional field
- Maximum 500 characters
- Can be null

### Pagination Validation

```typescript
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});
```

**Rules**:
- Limit: 1-100 (prevents resource abuse)
- Offset: ≥ 0
- Defaults: limit=20, offset=0

---

## 5. Business Rules

### BR-001: Duplicate Prevention

**Rule**: A user cannot bookmark the same URL twice.

**Enforcement**:
- Database: UNIQUE constraint on (user_id, url)
- Application: Check for existing bookmark before insert
- Error: Return `BookmarkError.duplicate()` if URL already bookmarked

### BR-002: Authorization

**Rule**: Users can only manage their own bookmarks.

**Enforcement**:
- All operations filter by `userId` from authenticated session
- Delete operation verifies bookmark belongs to user
- tRPC: Use `protectedProcedure` to enforce authentication

### BR-003: URL Safety

**Rule**: Only http and https URLs are allowed.

**Enforcement**:
- Zod validation at API boundary
- Rejects potentially dangerous protocols

### BR-004: Cascade Deletion

**Rule**: When a user is deleted, all their bookmarks are deleted.

**Enforcement**:
- Database: `ON DELETE CASCADE` foreign key constraint

---

## 6. Query Patterns

### Primary Queries

```typescript
// 1. Create bookmark (duplicate check + insert)
const existing = await db.query.bookmarks.findFirst({
  where: and(
    eq(bookmarks.userId, userId),
    eq(bookmarks.url, url)
  ),
});

if (existing) {
  throw BookmarkError.duplicate(url);
}

const [newBookmark] = await db.insert(bookmarks)
  .values({ userId, url, title })
  .returning();

// 2. List user's bookmarks (paginated, newest first)
const userBookmarks = await db.query.bookmarks.findMany({
  where: eq(bookmarks.userId, userId),
  orderBy: [desc(bookmarks.createdAt)],
  limit: limit,
  offset: offset,
});

// 3. Count user's total bookmarks
const total = await db
  .select({ count: sql<number>`count(*)` })
  .from(bookmarks)
  .where(eq(bookmarks.userId, userId))
  .then((result) => result[0]?.count ?? 0);

// 4. Delete bookmark (with authorization check)
const result = await db.delete(bookmarks)
  .where(
    and(
      eq(bookmarks.id, bookmarkId),
      eq(bookmarks.userId, userId)
    )
  )
  .returning();

if (result.length === 0) {
  throw BookmarkError.notFound(bookmarkId);
}
```

---

## 7. Relations

### User ← Bookmarks (One-to-Many)

```typescript
// User has many bookmarks
const userWithBookmarks = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    bookmarks: {
      orderBy: [desc(bookmarks.createdAt)],
      limit: 10,
    },
  },
});

// Bookmark belongs to one user
const bookmarkWithUser = await db.query.bookmarks.findFirst({
  where: eq(bookmarks.id, bookmarkId),
  with: {
    user: true,
  },
});
```

**Note**: For this feature, we typically query bookmarks directly by userId, not through the relation. Relations are defined for future queries if needed.

---

## 8. Migration Strategy

### Database Migration Steps

1. **Add bookmarks table** to `docker/postgres/init.sql`
2. **Update Drizzle schema** in `apps/api/src/shared/db/schema.ts`
3. **Generate Drizzle migration** (if using migrations):
   ```bash
   pnpm drizzle-kit generate:pg
   pnpm drizzle-kit push:pg
   ```
4. **Verify schema** with `pnpm drizzle-kit studio`

### Backwards Compatibility

- **New table**: No breaking changes to existing tables
- **No API changes**: Existing endpoints unaffected
- **Safe to deploy**: Can be deployed without downtime

---

## 9. Error Scenarios

| Scenario | Database Behavior | Application Response |
|----------|-------------------|---------------------|
| Duplicate URL | UNIQUE constraint violation | BookmarkError.duplicate() |
| Invalid URL format | N/A (validated before DB) | Zod validation error |
| User not found | Foreign key violation | Should not happen (authenticated user) |
| Bookmark not found | 0 rows affected | BookmarkError.notFound() |
| User deleted | Cascade delete bookmarks | N/A (handled by DB) |

---

## 10. Performance Considerations

### Indexes

- **Primary key (id)**: Clustered index for direct lookups
- **Unique index (user_id, url)**: Covers duplicate checks
- **Composite index (user_id, created_at DESC)**: Covers list queries

### Query Optimization

- **Pagination**: Limit/offset prevents loading all bookmarks
- **Filtered queries**: Always filter by userId (indexed)
- **No N+1 queries**: Direct queries, no lazy loading issues

### Scalability

- **Estimated rows**: ~100 bookmarks per user average
- **Growth**: Linear with user count
- **Bottlenecks**: None expected at <100k users

---

## Summary

✅ **Entity Model**: Single `Bookmark` entity with clear invariants
✅ **Database Schema**: Normalized, indexed, with referential integrity
✅ **Type Safety**: Drizzle type inference + TypeScript domain types
✅ **Validation**: Zod schemas at API boundary
✅ **Business Rules**: Enforced by DB constraints + application logic
✅ **Performance**: Optimized indexes for common queries

Ready to proceed to contract generation (Phase 1).
