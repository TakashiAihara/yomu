# tRPC Auth Router Contract

**Date**: 2026-01-02
**Feature**: Google OAuth Authentication
**Protocol**: tRPC (type-safe RPC)
**Base Path**: `/trpc/auth`

## Overview

This contract defines the tRPC router for authentication operations. All endpoints follow schema-first development principles as mandated by the Yomu constitution.

**Note**: This is NOT OpenAPI/Swagger. tRPC provides end-to-end type safety through TypeScript, eliminating the need for separate schema definitions.

---

## Router Definition

### auth.initiateSignIn

**Purpose**: Generate OAuth authorization URL for Google sign-in

**Type**: `query`

**Input Schema**:
```typescript
{
  redirectUrl?: string;  // Optional: where to redirect after auth (default: /dashboard)
}
```

**Output Schema**:
```typescript
{
  authorizationUrl: string;  // Google OAuth URL with state parameter
  state: string;             // CSRF token for verification
}
```

**Business Logic**:
1. Generate cryptographically random state parameter (32 bytes)
2. Create HMAC signature of state
3. Store state + HMAC in Valkey with 10-minute TTL
4. Build Google OAuth URL with:
   - `client_id`: from env config
   - `redirect_uri`: OAuth callback URL
   - `response_type`: "code"
   - `scope`: "openid email profile"
   - `state`: generated state parameter
   - `access_type`: "online" (no refresh token)

**Success Response (200)**:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=openid+email+profile&state=abc123",
  "state": "abc123"
}
```

**Error Responses**:
- `INTERNAL_SERVER_ERROR`: Failed to generate state or build URL

**Mapped Requirements**: FR-001, FR-002, FR-011

---

### auth.handleCallback

**Purpose**: Process OAuth callback and create user session

**Type**: `mutation`

**Input Schema**:
```typescript
{
  code: string;         // Authorization code from Google
  state: string;        // State parameter to validate
  error?: string;       // OAuth error code if user denied
}
```

**Output Schema**:
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    profilePicture: string | null;
  };
  sessionToken?: string;
  redirectUrl: string;  // Where to redirect user
  error?: {
    code: string;
    message: string;
  };
}
```

**Business Logic**:

1. **Validate State**:
   - Retrieve state + HMAC from Valkey
   - Verify HMAC matches
   - Return error if invalid (CSRF attack)

2. **Handle OAuth Errors**:
   - If `error=access_denied`: User denied permissions
   - Return friendly error message (FR-014)

3. **Exchange Code for Tokens**:
   - POST to `https://oauth2.googleapis.com/token`
   - Include: code, client_id, client_secret, redirect_uri, grant_type
   - Receive: access_token, id_token, expires_in

4. **Verify ID Token**:
   - Decode JWT id_token
   - Verify signature with Google's public keys
   - Extract: sub (google_id), email, name, picture

5. **Find or Create User**:
   - Query database for user with `google_id = sub`
   - If not found: Create new user (FR-005)
   - If found: Update `last_sign_in_at` (FR-006)

6. **Create Session**:
   - Generate session token (32 bytes random)
   - Insert session record in database
   - Cache session in Valkey with 24-hour TTL
   - Set HTTP-only cookie with session token (FR-007)

7. **Log Event**:
   - Log auth attempt with anonymized user ID (FR-017)

**Success Response (200)** - New User:
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "profilePicture": "https://lh3.googleusercontent.com/a/..."
  },
  "sessionToken": "a3K8pQ7xN2mR9jT5vL6cE1wH4dF8gB0yU",
  "redirectUrl": "/dashboard"
}
```

**Success Response (200)** - Existing User:
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "profilePicture": "https://lh3.googleusercontent.com/a/..."
  },
  "sessionToken": "a3K8pQ7xN2mR9jT5vL6cE1wH4dF8gB0yU",
  "redirectUrl": "/dashboard"
}
```

**Error Response (200)** - User Denied:
```json
{
  "success": false,
  "redirectUrl": "/login",
  "error": {
    "code": "USER_DENIED_PERMISSIONS",
    "message": "Sign-in cancelled. Google account permissions are required to continue"
  }
}
```

**Error Response (503)** - Google Unavailable:
```json
{
  "success": false,
  "redirectUrl": "/login",
  "error": {
    "code": "OAUTH_SERVICE_UNAVAILABLE",
    "message": "Google sign-in temporarily unavailable, please try again in a few minutes"
  }
}
```

**Error Responses**:
- `BAD_REQUEST`: Missing or invalid code/state parameters
- `UNAUTHORIZED`: CSRF validation failed (invalid state)
- `SERVICE_UNAVAILABLE`: Google OAuth service unreachable (FR-013)
- `INTERNAL_SERVER_ERROR`: Database or Valkey failure

**Mapped Requirements**: FR-003, FR-004, FR-005, FR-006, FR-007, FR-010, FR-011, FR-013, FR-014, FR-017

---

### auth.signOut

**Purpose**: Terminate current user session

**Type**: `mutation`

**Authentication**: Required (session token in cookie)

**Input Schema**:
```typescript
{
  allSessions?: boolean;  // If true, sign out from all devices (default: false)
}
```

**Output Schema**:
```typescript
{
  success: boolean;
}
```

**Business Logic**:

1. **Validate Session**:
   - Extract session token from HTTP-only cookie
   - Verify session exists and not expired

2. **Terminate Session(s)**:
   - If `allSessions=false`: Delete current session only
   - If `allSessions=true`: Delete all sessions for user (FR-016)
   - Delete from both database and Valkey

3. **Clear Cookie**:
   - Set session cookie with expired date
   - Clear HTTP-only, Secure flags

4. **Log Event**:
   - Log session termination (FR-017)

**Success Response (200)**:
```json
{
  "success": true
}
```

**Error Responses**:
- `UNAUTHORIZED`: No valid session token provided
- `INTERNAL_SERVER_ERROR`: Failed to delete session

**Mapped Requirements**: FR-008, FR-016, FR-017

---

### auth.getProfile

**Purpose**: Retrieve current user's profile information

**Type**: `query`

**Authentication**: Required (session token in cookie)

**Input Schema**:
```typescript
{}  // No parameters
```

**Output Schema**:
```typescript
{
  user: {
    id: string;
    email: string;
    displayName: string;
    profilePicture: string | null;
    createdAt: string;      // ISO 8601 timestamp
    lastSignInAt: string;   // ISO 8601 timestamp
  };
  sessions: Array<{
    id: string;
    createdAt: string;
    lastActivityAt: string;
    userAgent: string | null;
    isCurrent: boolean;
  }>;
}
```

**Business Logic**:

1. **Validate Session**:
   - Extract and verify session token from cookie
   - Return UNAUTHORIZED if invalid

2. **Fetch User**:
   - Query user by session's user_id
   - Query all active sessions for user (FR-016)

3. **Mark Current Session**:
   - Flag which session matches current token

**Success Response (200)**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "profilePicture": "https://lh3.googleusercontent.com/a/...",
    "createdAt": "2026-01-01T10:00:00Z",
    "lastSignInAt": "2026-01-02T14:30:00Z"
  },
  "sessions": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "createdAt": "2026-01-02T14:30:00Z",
      "lastActivityAt": "2026-01-02T16:15:00Z",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "isCurrent": true
    },
    {
      "id": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      "createdAt": "2026-01-01T08:00:00Z",
      "lastActivityAt": "2026-01-02T09:00:00Z",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)...",
      "isCurrent": false
    }
  ]
}
```

**Error Responses**:
- `UNAUTHORIZED`: No valid session token
- `NOT_FOUND`: User not found (should not happen if session valid)

**Mapped Requirements**: FR-009

---

### auth.refreshSession

**Purpose**: Attempt silent re-authentication with existing session

**Type**: `mutation`

**Authentication**: Required (session token in cookie)

**Input Schema**:
```typescript
{}  // No parameters
```

**Output Schema**:
```typescript
{
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

**Business Logic**:

1. **Validate Existing Session**:
   - Check if current session exists but access token expired

2. **Attempt Silent Re-auth**:
   - Try Google OAuth with `prompt=none` (hidden iframe)
   - If succeeds: Update session expiration
   - If fails: Return error, client redirects to login

3. **Update Session**:
   - Extend `expires_at` by 24 hours
   - Update `last_activity_at`
   - Update Valkey TTL

**Success Response (200)**:
```json
{
  "success": true
}
```

**Error Response (200)** - Re-auth Failed:
```json
{
  "success": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Session expired, please sign in again"
  }
}
```

**Error Responses**:
- `UNAUTHORIZED`: No session token provided
- `INTERNAL_SERVER_ERROR`: Failed to extend session

**Mapped Requirements**: FR-015

---

## tRPC Router Implementation Skeleton

```typescript
import { router, publicProcedure, protectedProcedure } from './trpc';
import { z } from 'zod';

export const authRouter = router({
  initiateSignIn: publicProcedure
    .input(z.object({
      redirectUrl: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Implementation
    }),

  handleCallback: publicProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
      error: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),

  signOut: protectedProcedure
    .input(z.object({
      allSessions: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      // Implementation
    }),

  refreshSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Implementation
    }),
});
```

---

## HTTP Transport Details

### Base URL
- Development: `http://localhost:3000/trpc`
- Production: `https://api.yomu.example.com/trpc`

### Headers
```
Content-Type: application/json
Cookie: session_token=<token>  (for protected procedures)
```

### Request Format (tRPC Batch)
```json
[
  {
    "id": 1,
    "jsonrpc": "2.0",
    "method": "auth.initiateSignIn",
    "params": {
      "redirectUrl": "/dashboard"
    }
  }
]
```

### Response Format
```json
[
  {
    "id": 1,
    "jsonrpc": "2.0",
    "result": {
      "authorizationUrl": "https://...",
      "state": "abc123"
    }
  }
]
```

---

## Error Codes

| Code | HTTP Status | Meaning | User Message |
|------|-------------|---------|--------------|
| `BAD_REQUEST` | 400 | Invalid input parameters | "Invalid request parameters" |
| `UNAUTHORIZED` | 401 | No valid session or CSRF failure | "Please sign in to continue" |
| `NOT_FOUND` | 404 | Resource not found | "Resource not found" |
| `SERVICE_UNAVAILABLE` | 503 | Google OAuth unavailable | "Google sign-in temporarily unavailable, please try again in a few minutes" |
| `INTERNAL_SERVER_ERROR` | 500 | Server/database error | "An error occurred, please contact support" |
| `USER_DENIED_PERMISSIONS` | 200* | User clicked "Deny" | "Sign-in cancelled. Google account permissions are required to continue" |
| `SESSION_EXPIRED` | 200* | Session cannot be refreshed | "Session expired, please sign in again" |

*Note: Some "errors" return HTTP 200 with `success: false` for UX reasons (not server errors)

---

## Security Considerations

1. **CSRF Protection**:
   - State parameter validated on callback
   - HMAC prevents state tampering
   - Valkey TTL limits window of attack

2. **XSS Protection**:
   - Session tokens in HTTP-only cookies
   - Never exposed to client JavaScript
   - tRPC automatically sanitizes inputs

3. **Timing Attacks**:
   - Use `crypto.timingSafeEqual` for HMAC comparison
   - Constant-time session token validation

4. **Rate Limiting**:
   - Implement per-IP rate limit on `initiateSignIn` (future)
   - Limit callback attempts per state parameter

---

## Testing Contract Compliance

### Contract Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { authRouter } from './auth-router';

describe('auth.initiateSignIn contract', () => {
  it('returns authorizationUrl and state', async () => {
    const result = await authRouter.initiateSignIn({});
    expect(result).toHaveProperty('authorizationUrl');
    expect(result).toHaveProperty('state');
    expect(result.authorizationUrl).toMatch(/^https:\/\/accounts\.google\.com/);
  });

  it('validates optional redirectUrl parameter', async () => {
    const result = await authRouter.initiateSignIn({ redirectUrl: '/custom' });
    expect(result.authorizationUrl).toContain('/custom');
  });
});

describe('auth.handleCallback contract', () => {
  it('returns success with user and sessionToken on valid callback', async () => {
    // Mock Google OAuth response
    const result = await authRouter.handleCallback({
      code: 'valid_code',
      state: 'valid_state',
    });
    expect(result).toMatchObject({
      success: true,
      user: expect.objectContaining({
        id: expect.any(String),
        email: expect.any(String),
        displayName: expect.any(String),
      }),
      sessionToken: expect.any(String),
    });
  });

  it('returns user-friendly error when user denies', async () => {
    const result = await authRouter.handleCallback({
      code: '',
      state: 'valid_state',
      error: 'access_denied',
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'USER_DENIED_PERMISSIONS',
        message: expect.stringContaining('Sign-in cancelled'),
      },
    });
  });
});
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-02 | Initial contract definition |

---

This contract satisfies all functional requirements (FR-001 through FR-017) and follows Yomu constitution mandates for tRPC, schema-first development, and type safety.