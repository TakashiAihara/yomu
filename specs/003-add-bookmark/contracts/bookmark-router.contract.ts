/**
 * tRPC Contract: Bookmark Router
 *
 * This file defines the API contract for bookmark operations.
 * It serves as the source of truth for both API implementation and CLI client.
 *
 * Schema-First Requirement: Changes to this contract MUST be approved via PR
 * before implementation begins.
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * URL validation schema
 * - Must be valid URL format
 * - Protocol must be http or https only (security)
 */
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

/**
 * Title validation schema
 * - Optional field
 * - Maximum 500 characters
 */
export const titleSchema = z.string().max(500).optional().nullable();

/**
 * Pagination validation schema
 * - limit: 1-100 bookmarks (prevents abuse)
 * - offset: ≥ 0 for pagination
 */
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * Input schema for creating a bookmark
 */
export const createBookmarkInputSchema = z.object({
  url: urlSchema,
  title: titleSchema,
});

/**
 * Input schema for listing bookmarks
 */
export const listBookmarksInputSchema = paginationSchema;

/**
 * Input schema for deleting a bookmark
 */
export const deleteBookmarkInputSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Bookmark entity schema
 */
export const bookmarkSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().nullable(),
  createdAt: z.date(),
});

/**
 * Output schema for createBookmark mutation
 */
export const createBookmarkOutputSchema = bookmarkSchema;

/**
 * Output schema for listBookmarks query
 */
export const listBookmarksOutputSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

/**
 * Output schema for deleteBookmark mutation
 */
export const deleteBookmarkOutputSchema = z.object({
  success: z.boolean(),
  deletedId: z.string().uuid(),
});

// ============================================================================
// Type Exports (for implementation)
// ============================================================================

export type CreateBookmarkInput = z.infer<typeof createBookmarkInputSchema>;
export type ListBookmarksInput = z.infer<typeof listBookmarksInputSchema>;
export type DeleteBookmarkInput = z.infer<typeof deleteBookmarkInputSchema>;

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type CreateBookmarkOutput = z.infer<typeof createBookmarkOutputSchema>;
export type ListBookmarksOutput = z.infer<typeof listBookmarksOutputSchema>;
export type DeleteBookmarkOutput = z.infer<typeof deleteBookmarkOutputSchema>;

// ============================================================================
// Router Contract Definition
// ============================================================================

/**
 * Bookmark Router Contract
 *
 * Endpoints:
 *
 * 1. bookmarks.create (Mutation, Protected)
 *    - Creates a new bookmark for authenticated user
 *    - Prevents duplicates (same URL for same user)
 *    - Input: { url, title? }
 *    - Output: Bookmark entity
 *    - Errors:
 *      - CONFLICT: Bookmark already exists for this URL
 *      - BAD_REQUEST: Invalid URL format
 *      - UNAUTHORIZED: User not authenticated
 *
 * 2. bookmarks.list (Query, Protected)
 *    - Lists user's bookmarks, newest first
 *    - Supports pagination
 *    - Input: { limit?, offset? }
 *    - Output: { bookmarks, total, limit, offset }
 *    - Errors:
 *      - UNAUTHORIZED: User not authenticated
 *      - BAD_REQUEST: Invalid pagination params
 *
 * 3. bookmarks.delete (Mutation, Protected)
 *    - Deletes a bookmark owned by the user
 *    - Input: { id }
 *    - Output: { success, deletedId }
 *    - Errors:
 *      - NOT_FOUND: Bookmark not found or not owned by user
 *      - UNAUTHORIZED: User not authenticated
 *      - BAD_REQUEST: Invalid UUID format
 */

/**
 * Expected router structure (for reference):
 *
 * ```typescript
 * export const bookmarkRouter = router({
 *   create: protectedProcedure
 *     .input(createBookmarkInputSchema)
 *     .mutation(async ({ input, ctx }) => { ... }),
 *
 *   list: protectedProcedure
 *     .input(listBookmarksInputSchema)
 *     .query(async ({ input, ctx }) => { ... }),
 *
 *   delete: protectedProcedure
 *     .input(deleteBookmarkInputSchema)
 *     .mutation(async ({ input, ctx }) => { ... }),
 * });
 * ```
 */

// ============================================================================
// Error Codes (for contract tests)
// ============================================================================

export const BookmarkErrorCodes = {
  // Create errors
  DUPLICATE_BOOKMARK: 'CONFLICT',
  INVALID_URL: 'BAD_REQUEST',

  // Delete errors
  BOOKMARK_NOT_FOUND: 'NOT_FOUND',

  // Common errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;
