import { and, desc, eq, sql } from 'drizzle-orm';
import { getDatabase } from '../../shared/db/client.js';
import { bookmarks } from '../../shared/db/schema.js';
import type { BookmarkRepository } from '../domain/bookmark.js';
import { BookmarkError } from '../domain/errors.js';

export function createBookmarkRepository(): BookmarkRepository {
  return {
    async create(input) {
      const db = getDatabase();

      // Check for duplicate
      const existing = await db.query.bookmarks.findFirst({
        where: and(eq(bookmarks.userId, input.userId), eq(bookmarks.url, input.url)),
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

      if (!newBookmark) {
        throw new Error('Failed to create bookmark');
      }

      return newBookmark;
    },

    async findByUserAndUrl(userId, url) {
      const db = getDatabase();
      const bookmark = await db.query.bookmarks.findFirst({
        where: and(eq(bookmarks.userId, userId), eq(bookmarks.url, url)),
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
        .where(and(eq(bookmarks.id, input.bookmarkId), eq(bookmarks.userId, input.userId)))
        .returning();

      if (result.length === 0) {
        throw BookmarkError.notFound(input.bookmarkId);
      }
    },
  };
}
