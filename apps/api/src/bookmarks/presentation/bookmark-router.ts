import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../../trpc.js';
import { BookmarkError } from '../domain/errors.js';
import { createBookmark } from '../use-cases/create-bookmark.js';
import { deleteBookmark } from '../use-cases/delete-bookmark.js';
import { listBookmarks } from '../use-cases/list-bookmarks.js';

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

// Title validation schema - max 500 chars, nullable
const titleSchema = z.string().max(500).optional().nullable();

// Create bookmark input schema
const createBookmarkInputSchema = z.object({
  url: urlSchema,
  title: titleSchema,
});

// List bookmarks input schema - pagination support
const listBookmarksInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Delete bookmark input schema - UUID validation
const deleteBookmarkInputSchema = z.object({
  bookmarkId: z.string().uuid(),
});

export const bookmarkRouter = router({
  create: protectedProcedure.input(createBookmarkInputSchema).mutation(async ({ input, ctx }) => {
    try {
      const bookmark = await createBookmark({
        userId: ctx.user.id,
        url: input.url,
        title: input.title ?? null,
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

  list: protectedProcedure.input(listBookmarksInputSchema).query(async ({ input, ctx }) => {
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

  delete: protectedProcedure.input(deleteBookmarkInputSchema).mutation(async ({ input, ctx }) => {
    try {
      await deleteBookmark({
        userId: ctx.user.id,
        bookmarkId: input.bookmarkId,
      });

      return { success: true };
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
});

export type BookmarkRouter = typeof bookmarkRouter;
