import Parser from 'rss-parser';
import type { ParsedFeed, ParsedFeedItem } from '../domain/feed.js';
import { FeedError } from '../domain/errors.js';
import { getLogger } from '../../shared/logging/logger.js';

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'Yomu RSS Reader/1.0',
  },
});

/**
 * Parse an RSS/Atom feed from a URL
 */
export async function parseFeed(feedUrl: string): Promise<ParsedFeed> {
  const logger = getLogger();

  try {
    logger.info('Fetching feed', { feedUrl });

    const feed = await parser.parseURL(feedUrl);

    logger.info('Feed parsed successfully', {
      feedUrl,
      title: feed.title,
      itemCount: feed.items?.length ?? 0,
    });

    // Normalize feed data
    const items: ParsedFeedItem[] = (feed.items ?? []).map((item) => ({
      guid: item.guid || item.link || item.title || '',
      title: item.title ?? null,
      link: item.link ?? null,
      content: item.contentSnippet || item.content || item.summary || null,
      author: item.creator || item.author ?? null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : (item.isoDate ? new Date(item.isoDate) : null),
    }));

    return {
      title: feed.title ?? null,
      description: feed.description ?? null,
      link: feed.link ?? null,
      items,
    };
  } catch (error) {
    logger.error('Failed to parse feed', {
      feedUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error) {
      // Network/fetch errors
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw FeedError.fetchFailed(feedUrl, error.message);
      }
      // Parse errors
      throw FeedError.parseFailed(feedUrl, error.message);
    }

    throw FeedError.parseFailed(feedUrl, 'Unknown error');
  }
}
