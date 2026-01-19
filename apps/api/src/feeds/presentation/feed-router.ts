import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../../trpc.js';
import { FeedError } from '../domain/errors.js';
import { listFeedItems } from '../use-cases/list-feed-items.js';
import { listFeeds } from '../use-cases/list-feeds.js';
import { markItemAsRead } from '../use-cases/mark-item-as-read.js';
import { refreshFeed } from '../use-cases/refresh-feed.js';
import { subscribeToFeed } from '../use-cases/subscribe-to-feed.js';
import { unsubscribeFromFeed } from '../use-cases/unsubscribe-from-feed.js';

// URL validation schema - http/https only for security
const urlSchema = z
  .string()
  .url()
  .refine(
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

// Subscribe to feed input schema
const subscribeInputSchema = z.object({
  feedUrl: urlSchema,
});

// List feeds input schema - pagination support
const listFeedsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Unsubscribe from feed input schema - UUID validation
const unsubscribeInputSchema = z.object({
  feedId: z.string().uuid(),
});

// List feed items input schema - pagination and filtering
const listFeedItemsInputSchema = z.object({
  feedId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  unreadOnly: z.boolean().optional(),
});

// Mark item as read input schema - UUID validation
const markAsReadInputSchema = z.object({
  itemId: z.string().uuid(),
});

// Refresh feed input schema - UUID validation
const refreshFeedInputSchema = z.object({
  feedId: z.string().uuid(),
});

export const feedRouter = router({
  subscribe: protectedProcedure.input(subscribeInputSchema).mutation(async ({ input, ctx }) => {
    try {
      const feed = await subscribeToFeed({
        userId: ctx.user.id,
        feedUrl: input.feedUrl,
      });
      return feed;
    } catch (error) {
      if (error instanceof FeedError) {
        const codeMap = {
          DUPLICATE: 'CONFLICT',
          NOT_FOUND: 'NOT_FOUND',
          INVALID_URL: 'BAD_REQUEST',
          FETCH_FAILED: 'BAD_REQUEST',
          PARSE_FAILED: 'BAD_REQUEST',
        } as const;

        throw new TRPCError({
          code: codeMap[error.code],
          message: error.message,
        });
      }
      throw error;
    }
  }),

  list: protectedProcedure.input(listFeedsInputSchema).query(async ({ input, ctx }) => {
    const result = await listFeeds({
      userId: ctx.user.id,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      feeds: result.feeds,
      total: result.total,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  unsubscribe: protectedProcedure.input(unsubscribeInputSchema).mutation(async ({ input, ctx }) => {
    try {
      await unsubscribeFromFeed({
        userId: ctx.user.id,
        feedId: input.feedId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof FeedError) {
        const codeMap = {
          DUPLICATE: 'CONFLICT',
          NOT_FOUND: 'NOT_FOUND',
          INVALID_URL: 'BAD_REQUEST',
          FETCH_FAILED: 'BAD_REQUEST',
          PARSE_FAILED: 'BAD_REQUEST',
        } as const;

        throw new TRPCError({
          code: codeMap[error.code],
          message: error.message,
        });
      }
      throw error;
    }
  }),

  refresh: protectedProcedure.input(refreshFeedInputSchema).mutation(async ({ input, ctx }) => {
    try {
      const feed = await refreshFeed({
        userId: ctx.user.id,
        feedId: input.feedId,
      });

      return feed;
    } catch (error) {
      if (error instanceof FeedError) {
        const codeMap = {
          DUPLICATE: 'CONFLICT',
          NOT_FOUND: 'NOT_FOUND',
          INVALID_URL: 'BAD_REQUEST',
          FETCH_FAILED: 'BAD_REQUEST',
          PARSE_FAILED: 'BAD_REQUEST',
        } as const;

        throw new TRPCError({
          code: codeMap[error.code],
          message: error.message,
        });
      }
      throw error;
    }
  }),

  items: router({
    list: protectedProcedure.input(listFeedItemsInputSchema).query(async ({ input, ctx }) => {
      try {
        const result = await listFeedItems({
          userId: ctx.user.id,
          feedId: input.feedId,
          limit: input.limit,
          offset: input.offset,
          unreadOnly: input.unreadOnly,
        });

        return {
          items: result.items,
          total: result.total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        if (error instanceof FeedError) {
          const codeMap = {
            DUPLICATE: 'CONFLICT',
            NOT_FOUND: 'NOT_FOUND',
            INVALID_URL: 'BAD_REQUEST',
            FETCH_FAILED: 'BAD_REQUEST',
            PARSE_FAILED: 'BAD_REQUEST',
          } as const;

          throw new TRPCError({
            code: codeMap[error.code],
            message: error.message,
          });
        }
        throw error;
      }
    }),

    markAsRead: protectedProcedure.input(markAsReadInputSchema).mutation(async ({ input, ctx }) => {
      await markItemAsRead({
        userId: ctx.user.id,
        itemId: input.itemId,
      });

      return { success: true };
    }),
  }),
});

export type FeedRouter = typeof feedRouter;
