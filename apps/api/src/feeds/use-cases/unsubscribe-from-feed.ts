import { getLogger } from '../../shared/logging/logger.js';
import type { UnsubscribeFromFeedInput } from '../domain/feed.js';
import { createFeedRepository } from '../infrastructure/feed-repository.js';

export async function unsubscribeFromFeed(input: UnsubscribeFromFeedInput) {
  const logger = getLogger();
  const repository = createFeedRepository();

  logger.info('Unsubscribing from feed', { userId: input.userId, feedId: input.feedId });

  await repository.delete(input);

  logger.info('Feed unsubscribed', { feedId: input.feedId });
}
