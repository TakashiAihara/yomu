export class FeedError extends Error {
  constructor(
    message: string,
    public code: 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_URL' | 'FETCH_FAILED' | 'PARSE_FAILED',
    public isRetryable = false
  ) {
    super(message);
    this.name = 'FeedError';
  }

  static duplicate(feedUrl: string): FeedError {
    return new FeedError(`Feed already subscribed: ${feedUrl}`, 'DUPLICATE', false);
  }

  static notFound(id: string): FeedError {
    return new FeedError(`Feed not found: ${id}`, 'NOT_FOUND', false);
  }

  static invalidUrl(url: string): FeedError {
    return new FeedError(`Invalid feed URL: ${url}`, 'INVALID_URL', false);
  }

  static fetchFailed(url: string, reason: string): FeedError {
    return new FeedError(`Failed to fetch feed ${url}: ${reason}`, 'FETCH_FAILED', true);
  }

  static parseFailed(url: string, reason: string): FeedError {
    return new FeedError(`Failed to parse feed ${url}: ${reason}`, 'PARSE_FAILED', false);
  }
}
