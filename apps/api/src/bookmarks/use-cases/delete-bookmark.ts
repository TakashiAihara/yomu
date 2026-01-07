import { getLogger } from '../../shared/logging/logger.js';
import type { DeleteBookmarkInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';

export async function deleteBookmark(input: DeleteBookmarkInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Deleting bookmark', {
    userId: input.userId,
    bookmarkId: input.bookmarkId,
  });

  await repository.delete(input);

  logger.info('Bookmark deleted', { bookmarkId: input.bookmarkId });
}
