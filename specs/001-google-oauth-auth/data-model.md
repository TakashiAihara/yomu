# Data Model: Google OAuth Authentication

**Date**: 2026-01-02
**Feature**: Google OAuth Authentication
**Purpose**: Define entities, relationships, and data constraints

## Entity Relationship Diagram

```
┌──────────────────┐          ┌──────────────────┐
│      User        │ 1      * │     Session      │
│──────────────────│◄─────────│──────────────────│
│ id (PK)          │          │ id (PK)          │
│ google_id (UK)   │          │ user_id (FK)     │
│ email            │          │ token            │
│ display_name     │          │ created_at       │
│ profile_picture  │          │ expires_at       │
│ created_at       │          │ last_activity_at │
│ last_sign_in_at  │          │ user_agent       │
└──────────────────┘          │ ip_address_hash  │
                              └──────────────────┘
```

**Relationship**: One User has many Sessions (1:N)

---

## User Entity

**Purpose**: Represents a user account created from Google OAuth authentication

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique user identifier |
| `google_id` | VARCHAR(255) | UNIQUE NOT NULL | Google account ID (sub claim from OpenID Connect) |
| `email` | VARCHAR(320) | NOT NULL | User's email address from Google |
| `display_name` | VARCHAR(255) | NOT NULL | User's display name from Google profile |
| `profile_picture` | VARCHAR(2048) | NULLABLE | URL to Google profile picture |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `last_sign_in_at` | TIMESTAMP | NOT NULL | Last successful sign-in timestamp |

### Validation Rules

1. **google_id**:
   - Must be unique (enforced by database constraint)
   - Cannot be changed after creation (immutable)
   - Format: Google's opaque identifier (e.g., "110169484474386276334")

2. **email**:
   - Must be valid email format (validated by Google, trusted)
   - Can change if user updates Google account email
   - Maximum length: 320 characters (RFC 5321)

3. **display_name**:
   - Cannot be empty string
   - Maximum length: 255 characters
   - Can contain unicode characters

4. **profile_picture**:
   - Must be valid HTTPS URL if present
   - Nullable (user may not have profile picture)
   - Maximum length: 2048 characters

5. **last_sign_in_at**:
   - Updated on every successful authentication
   - Cannot be in the future

### State Transitions

```
[No Account] ─(First Google Sign-in)─> [Active Account]
                                              │
                                              │ (Sign-in)
                                              ▼
                                        [Update last_sign_in_at]
```

**Note**: No inactive/deleted states in MVP. Account deletion out of scope (see spec).

### Indexes

```sql
CREATE UNIQUE INDEX idx_user_google_id ON users(google_id);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_last_sign_in ON users(last_sign_in_at DESC);
```

### Sample Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "google_id": "110169484474386276334",
  "email": "user@example.com",
  "display_name": "Jane Doe",
  "profile_picture": "https://lh3.googleusercontent.com/a/ACg8ocK...",
  "created_at": "2026-01-02T10:00:00Z",
  "last_sign_in_at": "2026-01-02T14:30:00Z"
}
```

---

## Session Entity

**Purpose**: Represents an active user session across a specific device/browser

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique session identifier |
| `user_id` | UUID | FOREIGN KEY (users.id), NOT NULL, ON DELETE CASCADE | Reference to User |
| `token` | VARCHAR(64) | UNIQUE NOT NULL | Session token (stored in cookie) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Session creation timestamp |
| `expires_at` | TIMESTAMP | NOT NULL | Session expiration timestamp |
| `last_activity_at` | TIMESTAMP | NOT NULL | Last request timestamp |
| `user_agent` | TEXT | NULLABLE | Browser user agent string |
| `ip_address_hash` | VARCHAR(64) | NULLABLE | Hashed IP address for audit |

### Validation Rules

1. **token**:
   - Must be cryptographically random (32 bytes, base64url encoded)
   - Unique across all sessions (enforced by database)
   - Cannot be reused after expiration

2. **expires_at**:
   - Must be in the future at creation
   - Default: 24 hours from creation
   - Can be extended on activity (sliding window)

3. **last_activity_at**:
   - Updated on every authenticated request
   - Cannot be in the future
   - If `expires_at - last_activity_at > 24 hours`, session is expired

4. **user_agent**:
   - Optional, for security monitoring
   - Truncated to 1000 characters
   - Logged on session creation

5. **ip_address_hash**:
   - SHA-256 hash of IP address + project salt
   - For audit/security, not for blocking
   - Nullable if IP not available

### State Transitions

```
[No Session] ─(Sign-in)─> [Active Session]
                                │
                                │ (Activity within 24h)
                                ▼
                          [Extend expires_at]
                                │
                                │ (Sign-out OR Expiration OR Inactivity)
                                ▼
                          [Deleted Session]
```

### Lifecycle

1. **Creation**: On successful OAuth callback
2. **Extension**: On activity, if `expires_at - now < 1 hour`, extend by 24 hours
3. **Termination**:
   - Explicit sign-out → Delete immediately
   - Expiration → Cleanup job deletes expired sessions
   - Inactivity → 24 hours no activity, deleted by cleanup

### Indexes

```sql
CREATE UNIQUE INDEX idx_session_token ON sessions(token);
CREATE INDEX idx_session_user_id ON sessions(user_id);
CREATE INDEX idx_session_expires_at ON sessions(expires_at);
CREATE INDEX idx_session_user_expires ON sessions(user_id, expires_at DESC);
```

### Sample Data

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "a3K8pQ7xN2mR9jT5vL6cE1wH4dF8gB0yU",
  "created_at": "2026-01-02T14:30:00Z",
  "expires_at": "2026-01-03T14:30:00Z",
  "last_activity_at": "2026-01-02T16:15:00Z",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "ip_address_hash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
}
```

---

## Valkey (Cache) Schema

**Purpose**: Fast session token lookup without database query

### Key-Value Structure

**Key Pattern**: `session:{token}`

**Value**: JSON with session metadata

**TTL**: Matches `expires_at` from database

### Example

```
Key: session:a3K8pQ7xN2mR9jT5vL6cE1wH4dF8gB0yU
Value: {
  "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2026-01-03T14:30:00Z"
}
TTL: 86400 seconds (24 hours)
```

### Operations

1. **Set** (on sign-in):
   ```typescript
   await valkey.setex(
     `session:${token}`,
     86400,
     JSON.stringify({ session_id, user_id, expires_at })
   );
   ```

2. **Get** (on auth check):
   ```typescript
   const data = await valkey.get(`session:${token}`);
   if (!data) return null;
   const session = JSON.parse(data);
   if (new Date(session.expires_at) < new Date()) return null;
   return session;
   ```

3. **Delete** (on sign-out):
   ```typescript
   await valkey.del(`session:${token}`);
   ```

### Synchronization

- **Write-through**: Update both Valkey and database on session changes
- **Invalidation**: Delete from Valkey on session termination
- **Fallback**: If Valkey miss, query database and repopulate cache

---

## Data Volume Estimates

### Users

- **Initial**: 100 users
- **6 months**: 1,000 users
- **1 year**: 5,000 users
- **Storage per user**: ~500 bytes
- **Total storage (1 year)**: ~2.5 MB (negligible)

### Sessions

- **Concurrent sessions**: 10,000 (target)
- **Average sessions per user**: 2-3 (laptop + phone)
- **Storage per session**: ~300 bytes (DB) + ~200 bytes (Valkey)
- **Total storage**: ~3 MB (DB) + ~2 MB (Valkey)
- **Cleanup frequency**: Hourly cron job to delete expired sessions

### Growth Assumptions

- 10% monthly user growth
- Average 2.5 sessions per active user
- 70% of users active monthly
- Session retention: 90 days in database for audit

---

## Security Considerations

1. **google_id as Primary Identifier**:
   - Email can change in Google account
   - `google_id` (sub claim) is permanent
   - Always use `google_id` for user matching

2. **Token Security**:
   - Session tokens never logged in plaintext
   - Hashed IP addresses prevent PII exposure
   - Tokens rotated on re-authentication

3. **Cascade Deletion**:
   - User deletion (future) cascades to sessions
   - Prevents orphaned session data

4. **Audit Trail**:
   - All session creation/termination logged
   - IP hash enables abuse detection without storing IPs
   - User agent helps identify unauthorized devices

---

## Migration Strategy

### Initial Schema (v0.1.0)

```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(2048),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_sign_in_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX idx_user_google_id ON users(google_id);
CREATE INDEX idx_user_email ON users(email);

-- sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  user_agent TEXT,
  ip_address_hash VARCHAR(64)
);

CREATE UNIQUE INDEX idx_session_token ON sessions(token);
CREATE INDEX idx_session_user_id ON sessions(user_id);
CREATE INDEX idx_session_expires_at ON sessions(expires_at);
```

### Future Extensions

**Out of scope for MVP, documented for future consideration**:

- OAuth refresh tokens (requires additional `refresh_token` field)
- Session device fingerprinting (additional metadata)
- User roles/permissions (separate `user_roles` table)
- Email verification override (if allowing non-Google emails later)

---

## Drizzle ORM Schema Preview

```typescript
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: varchar('google_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  profilePicture: varchar('profile_picture', { length: 2048 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSignInAt: timestamp('last_sign_in_at').notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 64 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').notNull(),
  userAgent: text('user_agent'),
  ipAddressHash: varchar('ip_address_hash', { length: 64 }),
});
```

This schema aligns with the Yomu constitution requirement for Drizzle ORM and supports all functional requirements from the specification.
