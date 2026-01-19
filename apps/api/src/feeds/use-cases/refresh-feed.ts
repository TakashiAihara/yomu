import { getLogger } from '../../shared/logging/logger.js';
import type { RefreshFeedInput } from '../domain/feed.js';
import { FeedError } from '../domain/errors.js';
import { createFeedRepository } from '../infrastructure/feed-repository.js';
import { createFeedItemRepository } from '../infrastructure/feed-item-repository.js';
import { parseFeed } from '../infrastructure/feed-parser.js';

export async function refreshFeed(input: RefreshFeedInput) {
  const logger = getLogger();
  const feedRepository = createFeedRepository();
  const feedItemRepository = createFeedItemRepository();

  logger.info('Refreshing feed', { userId: input.userId, feedId: input.feedId });

  // Verify feed belongs to user
  const feed = await feedRepository.findById(input.feedId);
  if (!feed) {
    throw FeedError.notFound(input.feedId);
  }
  if (feed.userId !== input.userId) {
    throw FeedError.notFound(input.feedId); // Don't reveal existence to unauthorized user
  }

  try {
    // Parse feed
    const parsedFeed = await parseFeed(feed.feedUrl);

    // Update feed metadata
    await feedRepository.update({
      feedId: feed.id,
      title: parsedFeed.title,
      description: parsedFeed.description,
      siteUrl: parsedFeed.link,
      lastFetchedAt: new Date(),
      lastFetchError: null,
    });

    // Upsert new items
    await feedItemRepository.upsertMany(feed.id, parsedFeed.items);

    logger.info('Feed refreshed successfully', {
      feedId: feed.id,
      itemCount: parsedFeed.items.length,
    });

    return feed;
  } catch (error) {
    // Log error and update feed with error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to refresh feed', { feedId: feed.id, error: errorMessage });

    await feedRepository.update({
      feedId: feed.id,
      lastFetchError: errorMessage,
    });

    throw error;
  }
}
