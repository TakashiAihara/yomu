import { getLogger } from '../../shared/logging/logger.js';
import type { CreateBookmarkInput } from '../domain/bookmark.js';
import { createBookmarkRepository } from '../infrastructure/bookmark-repository.js';

export async function createBookmark(input: CreateBookmarkInput) {
  const logger = getLogger();
  const repository = createBookmarkRepository();

  logger.info('Creating bookmark', { userId: input.userId, url: input.url });

  const bookmark = await repository.create(input);

  logger.info('Bookmark created', { bookmarkId: bookmark.id });

  return bookmark;
}
