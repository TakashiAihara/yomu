import { getLogger } from '../../shared/logging/logger.js';
import type { SubscribeToFeedInput } from '../domain/feed.js';
import { createFeedRepository } from '../infrastructure/feed-repository.js';
import { createFeedItemRepository } from '../infrastructure/feed-item-repository.js';
import { parseFeed } from '../infrastructure/feed-parser.js';

export async function subscribeToFeed(input: SubscribeToFeedInput) {
  const logger = getLogger();
  const feedRepository = createFeedRepository();
  const feedItemRepository = createFeedItemRepository();

  logger.info('Subscribing to feed', { userId: input.userId, feedUrl: input.feedUrl });

  // Parse feed to validate and get metadata
  const parsedFeed = await parseFeed(input.feedUrl);

  // Create feed subscription
  const feed = await feedRepository.create({
    userId: input.userId,
    feedUrl: input.feedUrl,
    title: parsedFeed.title,
    description: parsedFeed.description,
    siteUrl: parsedFeed.link,
  });

  // Insert initial feed items
  await feedItemRepository.upsertMany(feed.id, parsedFeed.items);

  // Update lastFetchedAt
  await feedRepository.update({
    feedId: feed.id,
    lastFetchedAt: new Date(),
    lastFetchError: null,
  });

  logger.info('Feed subscription created', {
    feedId: feed.id,
    itemCount: parsedFeed.items.length,
  });

  return feed;
}
