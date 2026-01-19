import { and, desc, eq, sql } from 'drizzle-orm';
import { getDatabase } from '../../shared/db/client.js';
import { feedItems } from '../../shared/db/schema.js';
import type { FeedItemRepository, ListFeedItemsInput, ParsedFeedItem } from '../domain/feed.js';

export function createFeedItemRepository(): FeedItemRepository {
  return {
    async upsertMany(feedId, items: ParsedFeedItem[]) {
      const db = getDatabase();

      if (items.length === 0) {
        return;
      }

      // Insert items, ignoring duplicates (based on feedId + guid unique index)
      for (const item of items) {
        try {
          await db
            .insert(feedItems)
            .values({
              feedId,
              guid: item.guid,
              title: item.title,
              link: item.link,
              content: item.content,
              author: item.author,
              publishedAt: item.publishedAt,
            })
            .onConflictDoNothing({
              target: [feedItems.feedId, feedItems.guid],
            });
        } catch (error) {
          // Ignore duplicate errors, continue with next item
          continue;
        }
      }
    },

    async listByFeed(input: ListFeedItemsInput) {
      const db = getDatabase();

      const limit = input.limit ?? 20;
      const offset = input.offset ?? 0;

      // Build where conditions
      const conditions = [eq(feedItems.feedId, input.feedId)];
      if (input.unreadOnly) {
        conditions.push(eq(feedItems.isRead, false));
      }

      // Get items
      const items = await db.query.feedItems.findMany({
        where: and(...conditions),
        orderBy: [desc(feedItems.publishedAt), desc(feedItems.createdAt)],
        limit,
        offset,
      });

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(feedItems)
        .where(and(...conditions));

      const total = totalResult[0]?.count ?? 0;

      return {
        items,
        total,
      };
    },

    async markAsRead(itemId) {
      const db = getDatabase();

      await db
        .update(feedItems)
        .set({ isRead: true })
        .where(eq(feedItems.id, itemId));
    },

    async markAllAsRead(feedId) {
      const db = getDatabase();

      await db
        .update(feedItems)
        .set({ isRead: true })
        .where(eq(feedItems.feedId, feedId));
    },
  };
}
