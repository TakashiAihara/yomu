# Research: Google OAuth Authentication

**Date**: 2026-01-02
**Feature**: Google OAuth Authentication
**Purpose**: Resolve technical unknowns and establish implementation patterns

## OAuth 2.0 Flow Selection

**Decision**: Authorization Code Flow with PKCE (Proof Key for Code Exchange)

**Rationale**:
- Most secure flow for web applications with server-side components
- PKCE adds protection against authorization code interception attacks
- Recommended by Google for public clients and confidential clients
- Enables refresh token support if needed later
- Industry standard for modern web apps

**Alternatives Considered**:
- **Implicit Flow**: Deprecated, tokens exposed in browser
- **Client Credentials**: Not applicable for user authentication
- **Device Code Flow**: For devices without browsers (not our use case)

**References**:
- Google Identity documentation: OAuth 2.0 for Web Server Applications
- RFC 7636: Proof Key for Code Exchange
- OAuth 2.0 Security Best Current Practice (BCP)

---

## Google OAuth Scopes Required

**Decision**: Minimal scopes for profile information only

**Scopes**:
```
openid email profile
```

**Breakdown**:
- `openid`: Required for OpenID Connect, provides `sub` (subject/user ID)
- `email`: Access to user's email address (verified)
- `profile`: Access to basic profile info (name, picture)

**Rationale**:
- Principle of least privilege - only request what's needed
- Reduces user friction during consent screen
- No additional Google API access required per spec
- Easier to audit and maintain compliance

**Alternatives Considered**:
- Full Google Account access: Over-scoped, violates privacy principles
- Email only: Insufficient for good UX (no profile picture/name)

---

## Session Management Strategy

**Decision**: Hybrid approach with Valkey for active sessions + database for persistence

**Architecture**:
1. **Active Sessions** → Valkey (Redis-compatible)
   - Session tokens with TTL (24 hours)
   - Fast lookup for auth middleware
   - Automatic expiration handling

2. **Session Records** → Database (via Drizzle ORM)
   - Permanent audit log of all sessions
   - Support session enumeration for security (view active sessions)
   - Enables features like "sign out all devices"

**Rationale**:
- Valkey provides microsecond latency for auth checks
- Database provides durability and audit trail
- Supports multiple concurrent sessions per user
- Scales to 10k+ concurrent users efficiently

**Alternatives Considered**:
- **Database only**: Too slow for per-request auth checks at scale
- **Valkey only**: Lost session data on cache eviction, no audit trail
- **JWT only**: Cannot revoke individual sessions, no server-side session list

---

## OAuth State Parameter Generation

**Decision**: Cryptographically random 32-byte state with HMAC verification

**Implementation Pattern**:
```typescript
// Generation
const state = crypto.randomBytes(32).toString('base64url');
const hmac = createHmac('sha256', SECRET).update(state).digest('base64url');
// Store: state + hmac in Valkey with 10-minute TTL

// Verification
const [receivedState, receivedHmac] = callback.state.split('.');
const expectedHmac = createHmac('sha256', SECRET).update(receivedState).digest('base64url');
if (!timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(receivedHmac))) {
  throw new CSRFError();
}
```

**Rationale**:
- Prevents CSRF attacks on OAuth callback
- HMAC prevents state tampering
- Short TTL (10 minutes) limits exposure window
- Timing-safe comparison prevents timing attacks

**Alternatives Considered**:
- **UUID v4**: Insufficient entropy, predictable
- **Signed JWT**: Over-engineered for simple state parameter
- **Session-based state**: Requires session before auth completes

---

## Error Handling Patterns

**Decision**: Three-tier error classification with user-friendly messages

**Error Tiers**:

1. **User Errors** (Expected, user-fixable)
   - Denied permissions → "Sign-in cancelled. Google account permissions are required to continue"
   - Cancelled flow → Return to login with retry option
   - HTTP 200 with error UI

2. **Service Errors** (External, transient)
   - Google OAuth unavailable → "Google sign-in temporarily unavailable, please try again in a few minutes"
   - Network timeout → "Connection problem, please try again"
   - HTTP 503 with retry-after header

3. **System Errors** (Internal, requires investigation)
   - Database failure → "An error occurred, please contact support"
   - Invalid configuration → Log critical error, return generic message
   - HTTP 500, log with trace ID for debugging

**Logging Strategy**:
- User errors: INFO level, anonymized user ID
- Service errors: WARN level, include external service status
- System errors: ERROR level, full stack trace, alert on-call

**Rationale**:
- Clear separation of concerns
- User-friendly messaging without exposing internals
- Actionable logs for operations
- Meets FR-010, FR-013, FR-014, FR-017

---

## Token Storage Security

**Decision**: Server-side only storage with HTTP-only cookies for session IDs

**Architecture**:
```
Client          Valkey          Database
  |               |                |
  |--session_id-->|                |
  (HTTP-only     |--lookup------->|
   cookie)       |<--session------|
                 |                 |
           (access_token,     (User record,
            refresh_token)     Session record)
```

**Security Controls**:
1. **Session Cookie**:
   - `HttpOnly`: Prevents XSS access
   - `Secure`: HTTPS only
   - `SameSite=Lax`: CSRF protection
   - `Max-Age=86400`: 24-hour expiration

2. **Token Storage**:
   - OAuth access tokens stored in Valkey (encrypted at rest)
   - Never sent to client
   - Encrypted in database backups

3. **Token Rotation**:
   - New session ID on re-authentication
   - Old session invalidated on sign-out

**Rationale**:
- Tokens never exposed to client-side JavaScript
- XSS cannot steal OAuth credentials
- Meets FR-012 security requirements
- Follows OWASP session management best practices

**Alternatives Considered**:
- **LocalStorage**: Vulnerable to XSS attacks
- **SessionStorage**: Vulnerable to XSS attacks
- **Cookies without HttpOnly**: Vulnerable to XSS attacks

---

## Logging and Observability

**Decision**: Structured JSON logging with Google Cloud Logging integration

**Log Events**:

| Event | Level | Fields | Retention |
|-------|-------|--------|-----------|
| Auth attempt (success) | INFO | `user_id_hash`, `timestamp`, `ip_hash`, `user_agent` | 90 days |
| Auth attempt (failure) | WARN | `error_code`, `timestamp`, `ip_hash` | 90 days |
| Session created | INFO | `user_id_hash`, `session_id_hash`, `device_info` | 90 days |
| Session terminated | INFO | `user_id_hash`, `session_id_hash`, `reason` | 90 days |
| OAuth error | ERROR | `error_type`, `google_error`, `trace_id` | 365 days |
| Token refresh | DEBUG | `user_id_hash`, `success` | 30 days |

**Anonymization**:
- User IDs: SHA-256 hash with project salt
- IP addresses: Masked last octet (e.g., 192.168.1.x)
- No PII in logs (email, name, picture)

**Metrics** (Google Cloud Monitoring):
- Auth success rate (target: >95%)
- Auth latency p50, p95, p99
- Active sessions count
- Token refresh failures

**Rationale**:
- Meets FR-017 logging requirements
- Balances security monitoring with privacy
- Google Cloud Logging free tier: 50 GB/month
- Structured logs enable alerting and analytics

---

## Database Schema Considerations

**Decision**: PostgreSQL-compatible schema with Drizzle ORM migrations

**Why PostgreSQL**:
- Full ACID compliance for user/session data
- JSON column support for extensible profile data
- Excellent performance for relational queries
- Free tier available on Cloud SQL
- Drizzle ORM has first-class PostgreSQL support

**Migration Strategy**:
- Drizzle Kit for schema migrations
- Version-controlled SQL migration files
- Automated migration on deployment
- Rollback capability for schema changes

**Indexing Strategy**:
- Primary key on `id` (auto-increment)
- Unique index on `google_account_id` (for user lookup)
- Index on `email` (for admin user search)
- Composite index on `user_id + expiration` (for session cleanup)

**Rationale**:
- PostgreSQL mandated by Drizzle ORM choice
- Proven at scale for auth workloads
- Strong consistency critical for auth/session data
- JSON columns future-proof for profile extensions

---

## Silent Re-authentication Flow

**Decision**: Attempt iframe-based silent re-auth with fallback to full flow

**Implementation**:
1. Check if access token expired (TTL from Valkey)
2. If expired:
   a. Try Google OAuth with `prompt=none` in hidden iframe
   b. If succeeds: Update tokens, extend session
   c. If fails: Clear session, redirect to login
3. User sees: Seamless re-auth or friendly "Session expired" message

**Rationale**:
- Meets FR-015 silent re-authentication requirement
- Minimizes user disruption for token refresh
- Graceful degradation when refresh fails (revoked permissions)
- Standard pattern for OAuth refresh flows

**Alternatives Considered**:
- **Refresh tokens**: Requires `offline_access` scope (out of scope)
- **No silent refresh**: Poor UX, frequent re-logins
- **Long-lived tokens**: Security risk, violates best practices

---

## Testing Strategy

**Decision**: Four-layer testing pyramid with mocked external dependencies

**Test Layers**:

1. **Unit Tests** (Vitest)
   - Auth use-cases (sign-in, sign-out, get-profile)
   - Mock Google OAuth client
   - Mock repositories/stores
   - Target: 90%+ coverage

2. **Contract Tests** (Vitest)
   - tRPC router schema validation
   - Input/output type checking
   - Error response formats
   - Ensures API contract stability

3. **Integration Tests** (Vitest + Testcontainers)
   - Real PostgreSQL database (Docker)
   - Real Valkey instance (Docker)
   - Mocked Google OAuth responses
   - End-to-end auth flow testing

4. **E2E Tests** (Playwright)
   - Full browser-based testing
   - Real OAuth redirect flow (test Google account)
   - Multi-session scenarios
   - Error state testing

**Test Doubles**:
- Google OAuth: Mock responses for success/failure/cancellation
- Time: Controllable for session expiration tests
- Crypto: Deterministic for snapshot testing

**Rationale**:
- Meets constitution test requirements
- Fast unit tests enable TDD workflow
- Integration tests catch real-world issues
- E2E tests validate user journeys
- Mocked Google OAuth avoids test flakiness

---

## Summary of Decisions

| Topic | Decision | Justification |
|-------|----------|---------------|
| OAuth Flow | Authorization Code + PKCE | Security best practice, enables refresh |
| Scopes | `openid email profile` | Minimal, sufficient for requirements |
| Session Storage | Valkey + PostgreSQL hybrid | Performance + durability |
| CSRF Protection | HMAC-signed state parameter | Prevents OAuth CSRF attacks |
| Token Storage | Server-side only, HTTP-only cookies | XSS protection |
| Error Handling | Three-tier classification | User-friendly + debuggable |
| Logging | Structured JSON, anonymized | Observability + privacy |
| Database | PostgreSQL + Drizzle ORM | Constitution compliance, scalability |
| Silent Re-auth | iframe `prompt=none` fallback | UX optimization within scope |
| Testing | Four-layer pyramid | Confidence + fast feedback |

All decisions align with Yomu constitution principles and technical constraints.
