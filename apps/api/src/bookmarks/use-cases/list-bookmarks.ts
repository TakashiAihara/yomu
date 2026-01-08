import { getLogger } from '../../shared/logging/logger.js';
import type { ListBookmarksInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';

export async function listBookmarks(input: ListBookmarksInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Listing bookmarks', {
    userId: input.userId,
    limit: input.limit,
    offset: input.offset,
  });

  const result = await repository.listByUser(input);

  logger.info('Bookmarks retrieved', {
    count: result.bookmarks.length,
    total: result.total,
  });

  return result;
}
