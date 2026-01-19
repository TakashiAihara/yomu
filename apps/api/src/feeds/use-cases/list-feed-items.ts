import { getLogger } from '../../shared/logging/logger.js';
import type { ListFeedItemsInput } from '../domain/feed.js';
import { FeedError } from '../domain/errors.js';
import { createFeedRepository } from '../infrastructure/feed-repository.js';
import { createFeedItemRepository } from '../infrastructure/feed-item-repository.js';

export async function listFeedItems(input: ListFeedItemsInput) {
  const logger = getLogger();
  const feedRepository = createFeedRepository();
  const feedItemRepository = createFeedItemRepository();

  logger.info('Listing feed items', {
    userId: input.userId,
    feedId: input.feedId,
    unreadOnly: input.unreadOnly,
  });

  // Verify feed belongs to user
  const feed = await feedRepository.findById(input.feedId);
  if (!feed) {
    throw FeedError.notFound(input.feedId);
  }
  if (feed.userId !== input.userId) {
    throw FeedError.notFound(input.feedId); // Don't reveal existence to unauthorized user
  }

  const result = await feedItemRepository.listByFeed(input);

  logger.info('Feed items listed', { count: result.items.length, total: result.total });

  return result;
}
