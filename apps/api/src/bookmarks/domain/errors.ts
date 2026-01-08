export class BookmarkError extends Error {
  constructor(
    message: string,
    public code: 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_URL',
    public isRetryable = false
  ) {
    super(message);
    this.name = 'BookmarkError';
  }

  static duplicate(url: string): BookmarkError {
    return new BookmarkError(`Bookmark already exists: ${url}`, 'DUPLICATE', false);
  }

  static notFound(id: string): BookmarkError {
    return new BookmarkError(`Bookmark not found: ${id}`, 'NOT_FOUND', false);
  }
}
