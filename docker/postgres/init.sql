-- Yomu Database Schema
-- This script runs automatically when the PostgreSQL container is first created

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id varchar(255) NOT NULL UNIQUE,
    email varchar(255) NOT NULL,
    display_name varchar(255),
    profile_picture text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_sign_in_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token varchar(512) NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
    user_agent text,
    ip_address_hash varchar(64)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url text NOT NULL,
    title varchar(500),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_url UNIQUE (user_id, url)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS bookmarks_user_id_created_at_idx ON bookmarks(user_id, created_at DESC);
