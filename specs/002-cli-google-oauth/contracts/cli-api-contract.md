# CLI-API Contract: Authentication

**Feature**: 002-cli-google-oauth
**Date**: 2026-01-04

## Overview

The CLI communicates with the API server using tRPC. This document defines the contract between CLI and API for authentication operations.

## tRPC Router: `auth`

The CLI uses the existing `auth` router from `apps/api`. No new API endpoints are required.

### Existing Endpoints Used by CLI

#### `auth.initiateSignIn`

Starts the OAuth flow by generating an authorization URL.

**Type**: `mutation`

**Input**:
```typescript
{
  redirectUri?: string;  // Optional custom redirect URI
}
```

**Output**:
```typescript
{
  authUrl: string;  // Google OAuth authorization URL
  state: string;    // State parameter for CSRF protection
}
```

**CLI Usage**:
- Browser flow: Sets `redirectUri` to `http://localhost:{port}/callback`
- Manual flow: Omits `redirectUri`, uses default API-configured redirect

---

#### `auth.handleCallback`

Exchanges authorization code for session.

**Type**: `mutation`

**Input**:
```typescript
{
  code: string;              // Authorization code from Google
  state: string;             // State parameter for validation
  error?: string;            // Error code if auth failed
  errorDescription?: string; // Error description
}
```

**Output**:
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  session: {
    token: string;
    expiresAt: string;  // ISO 8601
  };
}
```

**Errors**:
| Code | TRPC Error | Description |
|------|------------|-------------|
| INVALID_STATE | BAD_REQUEST | State mismatch (CSRF detected) |
| STATE_EXPIRED | BAD_REQUEST | Auth attempt timed out |
| AUTH_DENIED | FORBIDDEN | User denied permission |
| TOKEN_EXCHANGE_FAILED | INTERNAL_SERVER_ERROR | Google token exchange failed |
| USER_INFO_FAILED | INTERNAL_SERVER_ERROR | Failed to fetch user info |

---

#### `auth.getProfile`

Gets the current user's profile.

**Type**: `query`
**Authentication**: Required (session token in header)

**Input**: None

**Output**:
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
    current: boolean;  // Is this the requesting session
  };
  activeSessions: number;  // Total active sessions
}
```

**Errors**:
| Code | TRPC Error | Description |
|------|------------|-------------|
| - | UNAUTHORIZED | No valid session token |

---

#### `auth.signOut`

Signs out the current session or all sessions.

**Type**: `mutation`
**Authentication**: Required

**Input**:
```typescript
{
  allSessions?: boolean;  // Default: false
}
```

**Output**:
```typescript
{
  success: boolean;
  terminatedSessions: number;
}
```

---

#### `auth.refreshSession`

Extends session validity.

**Type**: `mutation`
**Authentication**: Required

**Input**: None

**Output**:
```typescript
{
  success: boolean;
  expiresAt: string;  // New expiration (ISO 8601)
}
```

## Authentication Header

All authenticated requests include:

```
Authorization: Bearer {sessionToken}
```

## CLI-Specific Considerations

### Redirect URI for Browser Flow

The CLI dynamically selects a port and constructs the redirect URI:

```
http://localhost:{port}/callback
```

The port is passed to `initiateSignIn` so the API can include it in the OAuth state or redirect configuration.

### Manual Flow

For manual code entry, the CLI:
1. Calls `initiateSignIn` without `redirectUri`
2. Displays the returned `authUrl` to the user
3. Prompts for the authorization code
4. Extracts `code` and `state` from user input
5. Calls `handleCallback` with extracted values

### State Parameter Handling

The `state` parameter is used for:
1. CSRF protection (validated by API)
2. Tracking which redirect URI was used
3. Matching callback to initiating session

CLI must:
- Store state temporarily during auth flow
- Pass same state to `handleCallback`
- Handle STATE_EXPIRED error (5-minute timeout)

## Type Definitions (for CLI)

```typescript
// Imported from @yomu/api for type safety
import type { AppRouter } from '@yomu/api/trpc';

// CLI-specific types
interface AuthResult {
  email: string;
  name: string;
  picture?: string;
  sessionToken: string;
  expiresAt: Date;
}

interface AuthStatus {
  authenticated: boolean;
  account?: {
    email: string;
    name: string;
    expiresAt: Date;
    isExpiringSoon: boolean;  // < 1 hour remaining
  };
}
```

## Error Handling Contract

The CLI maps tRPC errors to user-friendly messages:

| TRPC Error | CLI Message |
|------------|-------------|
| UNAUTHORIZED | "Please log in with: yomu login" |
| BAD_REQUEST (STATE_EXPIRED) | "Login timed out. Please try again." |
| FORBIDDEN (AUTH_DENIED) | "Access denied. Please authorize the app." |
| INTERNAL_SERVER_ERROR | "Server error. Please try again later." |
| TIMEOUT | "Network timeout. Check your connection." |
