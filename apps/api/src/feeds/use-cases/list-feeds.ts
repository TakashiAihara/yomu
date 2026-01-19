import { getLogger } from '../../shared/logging/logger.js';
import type { ListFeedsInput } from '../domain/feed.js';
import { createFeedRepository } from '../infrastructure/feed-repository.js';

export async function listFeeds(input: ListFeedsInput) {
  const logger = getLogger();
  const repository = createFeedRepository();

  logger.info('Listing feeds', { userId: input.userId });

  const result = await repository.listByUser(input);

  logger.info('Feeds listed', { count: result.feeds.length, total: result.total });

  return result;
}
