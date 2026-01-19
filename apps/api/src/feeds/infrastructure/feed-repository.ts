import { and, desc, eq, sql } from 'drizzle-orm';
import { getDatabase } from '../../shared/db/client.js';
import { feeds } from '../../shared/db/schema.js';
import type { FeedRepository, ListFeedsInput, UnsubscribeFromFeedInput, UpdateFeedInput } from '../domain/feed.js';
import { FeedError } from '../domain/errors.js';

export function createFeedRepository(): FeedRepository {
  return {
    async create(input) {
      const db = getDatabase();

      // Check for duplicate
      const existing = await db.query.feeds.findFirst({
        where: and(eq(feeds.userId, input.userId), eq(feeds.feedUrl, input.feedUrl)),
      });

      if (existing) {
        throw FeedError.duplicate(input.feedUrl);
      }

      // Insert
      const [newFeed] = await db
        .insert(feeds)
        .values({
          userId: input.userId,
          feedUrl: input.feedUrl,
          title: input.title ?? null,
          description: input.description ?? null,
          siteUrl: input.siteUrl ?? null,
        })
        .returning();

      if (!newFeed) {
        throw new Error('Failed to create feed');
      }

      return newFeed;
    },

    async findById(feedId) {
      const db = getDatabase();
      const feed = await db.query.feeds.findFirst({
        where: eq(feeds.id, feedId),
      });
      return feed ?? null;
    },

    async findByUserAndUrl(userId, feedUrl) {
      const db = getDatabase();
      const feed = await db.query.feeds.findFirst({
        where: and(eq(feeds.userId, userId), eq(feeds.feedUrl, feedUrl)),
      });
      return feed ?? null;
    },

    async listByUser(input: ListFeedsInput) {
      const db = getDatabase();

      const limit = input.limit ?? 20;
      const offset = input.offset ?? 0;

      // Get feeds
      const userFeeds = await db.query.feeds.findMany({
        where: eq(feeds.userId, input.userId),
        orderBy: [desc(feeds.createdAt)],
        limit,
        offset,
      });

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(feeds)
        .where(eq(feeds.userId, input.userId));

      const total = totalResult[0]?.count ?? 0;

      return {
        feeds: userFeeds,
        total,
      };
    },

    async update(input: UpdateFeedInput) {
      const db = getDatabase();

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.siteUrl !== undefined) updateData.siteUrl = input.siteUrl;
      if (input.lastFetchedAt !== undefined) updateData.lastFetchedAt = input.lastFetchedAt;
      if (input.lastFetchError !== undefined) updateData.lastFetchError = input.lastFetchError;

      const [updatedFeed] = await db
        .update(feeds)
        .set(updateData)
        .where(eq(feeds.id, input.feedId))
        .returning();

      if (!updatedFeed) {
        throw FeedError.notFound(input.feedId);
      }

      return updatedFeed;
    },

    async delete(input: UnsubscribeFromFeedInput) {
      const db = getDatabase();

      const result = await db
        .delete(feeds)
        .where(and(eq(feeds.id, input.feedId), eq(feeds.userId, input.userId)))
        .returning();

      if (result.length === 0) {
        throw FeedError.notFound(input.feedId);
      }
    },
  };
}
