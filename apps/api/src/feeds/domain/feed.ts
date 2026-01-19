/**
 * Feed domain entity
 */
export interface Feed {
  id: string;
  userId: string;
  feedUrl: string;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  lastFetchedAt: Date | null;
  lastFetchError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feed item domain entity
 */
export interface FeedItem {
  id: string;
  feedId: string;
  guid: string;
  title: string | null;
  link: string | null;
  content: string | null;
  author: string | null;
  publishedAt: Date | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Input for subscribing to a feed
 */
export interface SubscribeToFeedInput {
  userId: string;
  feedUrl: string;
}

/**
 * Input for listing feeds with pagination
 */
export interface ListFeedsInput {
  userId: string;
  limit?: number;
  offset?: number;
}

/**
 * Input for unsubscribing from a feed
 */
export interface UnsubscribeFromFeedInput {
  feedId: string;
  userId: string; // For authorization
}

/**
 * Input for listing feed items with pagination and filtering
 */
export interface ListFeedItemsInput {
  feedId: string;
  userId: string; // For authorization
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

/**
 * Input for marking a feed item as read
 */
export interface MarkItemAsReadInput {
  itemId: string;
  userId: string; // For authorization (via feedId)
}

/**
 * Input for refreshing a feed
 */
export interface RefreshFeedInput {
  feedId: string;
  userId: string; // For authorization
}

/**
 * Update feed metadata input
 */
export interface UpdateFeedInput {
  feedId: string;
  title?: string | null;
  description?: string | null;
  siteUrl?: string | null;
  lastFetchedAt?: Date;
  lastFetchError?: string | null;
}

/**
 * Parsed feed data from RSS/Atom parser
 */
export interface ParsedFeed {
  title: string | null;
  description: string | null;
  link: string | null;
  items: ParsedFeedItem[];
}

/**
 * Parsed feed item from RSS/Atom parser
 */
export interface ParsedFeedItem {
  guid: string;
  title: string | null;
  link: string | null;
  content: string | null;
  author: string | null;
  publishedAt: Date | null;
}

/**
 * Feed repository interface (port in Clean Architecture)
 */
export interface FeedRepository {
  create(input: { userId: string; feedUrl: string; title?: string | null; description?: string | null; siteUrl?: string | null }): Promise<Feed>;
  findById(feedId: string): Promise<Feed | null>;
  findByUserAndUrl(userId: string, feedUrl: string): Promise<Feed | null>;
  listByUser(input: ListFeedsInput): Promise<{ feeds: Feed[]; total: number }>;
  update(input: UpdateFeedInput): Promise<Feed>;
  delete(input: UnsubscribeFromFeedInput): Promise<void>;
}

/**
 * Feed item repository interface (port in Clean Architecture)
 */
export interface FeedItemRepository {
  upsertMany(feedId: string, items: ParsedFeedItem[]): Promise<void>;
  listByFeed(input: ListFeedItemsInput): Promise<{ items: FeedItem[]; total: number }>;
  markAsRead(itemId: string): Promise<void>;
  markAllAsRead(feedId: string): Promise<void>;
}
