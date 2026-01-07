/**
 * Bookmark domain entity
 */
export interface Bookmark {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  createdAt: Date;
}

/**
 * Input for creating a new bookmark
 */
export interface CreateBookmarkInput {
  userId: string;
  url: string;
  title?: string | null;
}

/**
 * Input for listing bookmarks with pagination
 */
export interface ListBookmarksInput {
  userId: string;
  limit?: number;
  offset?: number;
}

/**
 * Input for deleting a bookmark
 */
export interface DeleteBookmarkInput {
  bookmarkId: string;
  userId: string; // For authorization
}

/**
 * Repository interface (port in Clean Architecture)
 */
export interface BookmarkRepository {
  create(input: CreateBookmarkInput): Promise<Bookmark>;
  findByUserAndUrl(userId: string, url: string): Promise<Bookmark | null>;
  listByUser(input: ListBookmarksInput): Promise<{ bookmarks: Bookmark[]; total: number }>;
  delete(input: DeleteBookmarkInput): Promise<void>;
}
