import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    googleId: varchar('google_id', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    profilePicture: text('profile_picture'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_google_id_idx').on(table.googleId),
    index('users_email_idx').on(table.email),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent'),
    ipAddressHash: varchar('ip_address_hash', { length: 64 }),
  },
  (table) => [
    uniqueIndex('sessions_token_idx').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ]
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    title: varchar('title', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_user_url').on(table.userId, table.url),
    index('bookmarks_user_id_created_at_idx').on(table.userId, table.createdAt.desc()),
  ]
);

export const feeds = pgTable(
  'feeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feedUrl: text('feed_url').notNull(),
    title: varchar('title', { length: 500 }),
    description: text('description'),
    siteUrl: text('site_url'),
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    lastFetchError: text('last_fetch_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('feeds_user_feed_url_idx').on(table.userId, table.feedUrl),
    index('feeds_user_id_idx').on(table.userId),
  ]
);

export const feedItems = pgTable(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedId: uuid('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    guid: text('guid').notNull(),
    title: varchar('title', { length: 500 }),
    link: text('link'),
    content: text('content'),
    author: varchar('author', { length: 255 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('feed_items_feed_guid_idx').on(table.feedId, table.guid),
    index('feed_items_feed_published_idx').on(table.feedId, table.publishedAt.desc()),
    index('feed_items_feed_read_published_idx').on(table.feedId, table.isRead, table.publishedAt.desc()),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  bookmarks: many(bookmarks),
  feeds: many(feeds),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));

export const feedsRelations = relations(feeds, ({ one, many }) => ({
  user: one(users, {
    fields: [feeds.userId],
    references: [users.id],
  }),
  items: many(feedItems),
}));

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  feed: one(feeds, {
    fields: [feedItems.feedId],
    references: [feeds.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Feed = typeof feeds.$inferSelect;
export type NewFeed = typeof feeds.$inferInsert;
export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;
