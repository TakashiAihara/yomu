import { getLogger } from '../../shared/logging/logger.js';
import type { MarkItemAsReadInput } from '../domain/feed.js';
import { createFeedItemRepository } from '../infrastructure/feed-item-repository.js';

export async function markItemAsRead(input: MarkItemAsReadInput) {
  const logger = getLogger();
  const repository = createFeedItemRepository();

  logger.info('Marking item as read', { itemId: input.itemId });

  await repository.markAsRead(input.itemId);

  logger.info('Item marked as read', { itemId: input.itemId });
}
