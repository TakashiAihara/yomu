CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  username    TEXT    NOT NULL,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  theme       TEXT    NOT NULL DEFAULT 'system',
  language    TEXT    NOT NULL DEFAULT 'ja',
  timezone    TEXT    NOT NULL DEFAULT 'Asia/Tokyo',
  entries_per_page         INTEGER NOT NULL DEFAULT 30,
  entry_order              TEXT    NOT NULL DEFAULT 'publishedAt',
  entry_direction          TEXT    NOT NULL DEFAULT 'desc',
  show_reading_time        BOOLEAN NOT NULL DEFAULT true,
  mark_read_on_view        BOOLEAN NOT NULL DEFAULT true,
  block_filter_entry_rules TEXT    NOT NULL DEFAULT '',
  keep_filter_entry_rules  TEXT    NOT NULL DEFAULT '',
  google_id                TEXT    UNIQUE,
  last_login_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  hide_globally BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS feeds (
  id                      INTEGER PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id             INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  feed_url                TEXT    NOT NULL,
  site_url                TEXT    NOT NULL DEFAULT '',
  title                   TEXT    NOT NULL DEFAULT '',
  description             TEXT    NOT NULL DEFAULT '',
  checked_at              TIMESTAMPTZ,
  next_check_at           TIMESTAMPTZ,
  etag_header             TEXT    NOT NULL DEFAULT '',
  last_modified_header    TEXT    NOT NULL DEFAULT '',
  parsing_error_msg       TEXT    NOT NULL DEFAULT '',
  parsing_error_count     INTEGER NOT NULL DEFAULT 0,
  scraper_rules           TEXT    NOT NULL DEFAULT '',
  rewrite_rules           TEXT    NOT NULL DEFAULT '',
  block_filter_entry_rules TEXT   NOT NULL DEFAULT '',
  keep_filter_entry_rules  TEXT   NOT NULL DEFAULT '',
  user_agent              TEXT    NOT NULL DEFAULT '',
  username                TEXT    NOT NULL DEFAULT '',
  password                TEXT    NOT NULL DEFAULT '',
  disabled                BOOLEAN NOT NULL DEFAULT false,
  crawler                 BOOLEAN NOT NULL DEFAULT false,
  ignore_entry_updates    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS entries (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_id       INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  status        TEXT    NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  hash          TEXT    NOT NULL,
  title         TEXT    NOT NULL DEFAULT '',
  url           TEXT    NOT NULL,
  comments_url  TEXT    NOT NULL DEFAULT '',
  published_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  content       TEXT    NOT NULL DEFAULT '',
  author        TEXT    NOT NULL DEFAULT '',
  share_code    TEXT    NOT NULL DEFAULT '',
  starred       BOOLEAN NOT NULL DEFAULT false,
  reading_time  INTEGER NOT NULL DEFAULT 0,
  tags          JSON    NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS enclosures (
  id                 INTEGER PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id           INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  url                TEXT    NOT NULL,
  mime_type          TEXT    NOT NULL DEFAULT '',
  size               INTEGER NOT NULL DEFAULT 0,
  media_progression  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS api_keys (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT    NOT NULL UNIQUE,
  description  TEXT    NOT NULL DEFAULT '',
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data       JSON    NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feeds_user_id     ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_feed_id   ON entries(feed_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_id   ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_status    ON entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_entries_starred   ON entries(user_id, starred);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions(expires_at);

PRAGMA create_fts_index('entries', 'id', 'title', 'content', 'author');
