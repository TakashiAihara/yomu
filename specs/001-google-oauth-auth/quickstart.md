# Quickstart: Google OAuth Authentication

**Date**: 2026-01-02
**Feature**: Google OAuth Authentication
**Target Audience**: Developers implementing this feature

## Overview

This guide helps you implement Google OAuth authentication for Yomu following the approved plan. You'll create a complete authentication system with sign-in, sign-out, and session management.

**Estimated Implementation Time**: 3-5 days for experienced developer

---

## Prerequisites

Before you begin, ensure you have:

1. **Google Cloud Project** with OAuth 2.0 credentials
   - Client ID
   - Client Secret
   - Authorized redirect URI configured

2. **Development Environment**:
   - Node.js 18+ (TypeScript)
   - PostgreSQL database
   - Valkey (Redis-compatible) instance
   - Docker (for local development)

3. **Tools**:
   - Drizzle ORM CLI
   - Biome (linter/formatter)
   - Vitest (testing)

---

## Setup Steps

### 1. Google OAuth Configuration

**Create OAuth 2.0 Credentials**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API (for profile access)
4. Navigate to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Add authorized redirect URI:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
8. Save Client ID and Client Secret

**Environment Variables**:

```bash
# .env.local
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

DATABASE_URL=postgresql://user:password@localhost:5432/yomu
VALKEY_URL=redis://localhost:6379

SESSION_SECRET=generate-a-strong-random-secret
```

---

### 2. Database Schema Setup

**Create migration**:

```bash
# Generate migration from Drizzle schema
npx drizzle-kit generate:pg

# Review generated SQL in drizzle/migrations/

# Apply migration
npx drizzle-kit push:pg
```

**Verify tables**:

```sql
-- Connect to PostgreSQL
\d users
\d sessions
```

Expected output: `users` and `sessions` tables with correct schema (see `data-model.md`).

---

### 3. Project Structure Setup

**Create directory structure**:

```bash
mkdir -p src/auth/{domain,use-cases,infrastructure,presentation}
mkdir -p src/shared/{db,cache,logging}
mkdir -p tests/{unit,integration,contract,e2e}
mkdir -p infra
```

**Install dependencies**:

```bash
npm install hono @trpc/server @trpc/client drizzle-orm postgres ioredis
npm install -D @types/node vitest drizzle-kit biome
```

---

### 4. Implementation Checklist

Follow this order for implementation:

#### Phase 1: Infrastructure Layer (Day 1)

- [ ] **Database Connection** (`src/shared/db/client.ts`)
  - Set up Drizzle ORM connection
  - Configure connection pooling
  - Add health check

- [ ] **Valkey Connection** (`src/shared/cache/client.ts`)
  - Set up ioredis client
  - Configure connection retry
  - Add health check

- [ ] **Logger Setup** (`src/shared/logging/logger.ts`)
  - Structured JSON logging
  - Log levels (DEBUG, INFO, WARN, ERROR)
  - Anonymization helpers

- [ ] **Drizzle Schema** (`src/shared/db/schema.ts`)
  - Define `users` table
  - Define `sessions` table
  - Export types

#### Phase 2: Domain Layer (Day 2)

- [ ] **User Entity** (`src/auth/domain/user.ts`)
  - User type definition
  - Validation functions
  - Factory functions

- [ ] **Session Entity** (`src/auth/domain/session.ts`)
  - Session type definition
  - Expiration logic
  - Token generation

#### Phase 3: Use Cases (Day 3)

- [ ] **Sign-In Use Case** (`src/auth/use-cases/sign-in.ts`)
  - OAuth flow orchestration
  - User creation/update logic
  - Session creation

- [ ] **Sign-Out Use Case** (`src/auth/use-cases/sign-out.ts`)
  - Session termination
  - Multi-session handling

- [ ] **Get Profile Use Case** (`src/auth/use-cases/get-profile.ts`)
  - Profile retrieval
  - Session listing

#### Phase 4: Infrastructure Adapters (Day 4)

- [ ] **Google OAuth Client** (`src/auth/infrastructure/google-oauth.ts`)
  - Authorization URL generation
  - Token exchange
  - ID token verification

- [ ] **User Repository** (`src/auth/infrastructure/user-repo.ts`)
  - Drizzle ORM queries
  - Find by Google ID
  - Create/update operations

- [ ] **Session Store** (`src/auth/infrastructure/session-store.ts`)
  - Valkey operations
  - Database synchronization
  - TTL management

#### Phase 5: Presentation Layer (Day 5)

- [ ] **tRPC Auth Router** (`src/auth/presentation/auth-router.ts`)
  - Implement all 5 endpoints
  - Input validation (Zod)
  - Error handling

- [ ] **Hono App Integration** (`src/app.ts`)
  - Mount tRPC router
  - Session middleware
  - Error middleware

---

## Implementation Example: Sign-In Flow

### Step-by-Step Code Example

**1. User Repository** (`src/auth/infrastructure/user-repo.ts`):

```typescript
import { db } from '../../shared/db/client';
import { users } from '../../shared/db/schema';
import { eq } from 'drizzle-orm';

export async function findUserByGoogleId(googleId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);
  return user || null;
}

export async function createUser(data: {
  googleId: string;
  email: string;
  displayName: string;
  profilePicture: string | null;
}) {
  const [user] = await db
    .insert(users)
    .values({
      ...data,
      lastSignInAt: new Date(),
    })
    .returning();
  return user;
}

export async function updateLastSignIn(userId: string) {
  await db
    .update(users)
    .set({ lastSignInAt: new Date() })
    .where(eq(users.id, userId));
}
```

**2. Google OAuth Client** (`src/auth/infrastructure/google-oauth.ts`):

```typescript
import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function generateAuthUrl(redirectUrl: string) {
  const state = crypto.randomBytes(32).toString('base64url');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params}`,
    state,
  };
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return await response.json();
}

export function decodeIdToken(idToken: string) {
  // Decode JWT without verification (verification done by Google library)
  const payload = idToken.split('.')[1];
  const decoded = Buffer.from(payload, 'base64url').toString();
  return JSON.parse(decoded);
}
```

**3. Sign-In Use Case** (`src/auth/use-cases/sign-in.ts`):

```typescript
import { generateAuthUrl, exchangeCodeForTokens, decodeIdToken } from '../infrastructure/google-oauth';
import { findUserByGoogleId, createUser, updateLastSignIn } from '../infrastructure/user-repo';
import { createSession } from '../infrastructure/session-store';
import { logger } from '../../shared/logging/logger';

export async function initiateSignIn(redirectUrl?: string) {
  const { url, state } = generateAuthUrl(redirectUrl || '/dashboard');

  // Store state in Valkey with 10-minute TTL
  await valkey.setex(`oauth:state:${state}`, 600, JSON.stringify({ redirectUrl }));

  return { authorizationUrl: url, state };
}

export async function handleCallback(code: string, state: string) {
  // Verify state
  const storedState = await valkey.get(`oauth:state:${state}`);
  if (!storedState) {
    throw new Error('Invalid or expired state parameter');
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  const profile = decodeIdToken(tokens.id_token);

  // Find or create user
  let user = await findUserByGoogleId(profile.sub);

  if (!user) {
    user = await createUser({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name,
      profilePicture: profile.picture || null,
    });
    logger.info('New user created', { userId: hashUserId(user.id) });
  } else {
    await updateLastSignIn(user.id);
    logger.info('User signed in', { userId: hashUserId(user.id) });
  }

  // Create session
  const session = await createSession(user.id);

  // Clean up state
  await valkey.del(`oauth:state:${state}`);

  return { user, sessionToken: session.token };
}
```

**4. tRPC Router** (`src/auth/presentation/auth-router.ts`):

```typescript
import { router, publicProcedure } from '../../trpc';
import { z } from 'zod';
import { initiateSignIn, handleCallback } from '../use-cases/sign-in';

export const authRouter = router({
  initiateSignIn: publicProcedure
    .input(z.object({
      redirectUrl: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await initiateSignIn(input.redirectUrl);
    }),

  handleCallback: publicProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
      error: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.error === 'access_denied') {
        return {
          success: false,
          redirectUrl: '/login',
          error: {
            code: 'USER_DENIED_PERMISSIONS',
            message: 'Sign-in cancelled. Google account permissions are required to continue',
          },
        };
      }

      try {
        const { user, sessionToken } = await handleCallback(input.code, input.state);

        return {
          success: true,
          user,
          sessionToken,
          redirectUrl: '/dashboard',
        };
      } catch (error) {
        logger.error('OAuth callback failed', { error });

        if (error.message.includes('unavailable')) {
          return {
            success: false,
            redirectUrl: '/login',
            error: {
              code: 'OAUTH_SERVICE_UNAVAILABLE',
              message: 'Google sign-in temporarily unavailable, please try again in a few minutes',
            },
          };
        }

        throw error;
      }
    }),
});
```

---

## Testing Guide

### Unit Tests Example

**Test: Sign-In Use Case** (`tests/unit/sign-in.test.ts`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCallback } from '../../src/auth/use-cases/sign-in';

describe('handleCallback', () => {
  beforeEach(() => {
    // Mock dependencies
    vi.mock('../../src/auth/infrastructure/google-oauth');
    vi.mock('../../src/auth/infrastructure/user-repo');
  });

  it('creates new user on first sign-in', async () => {
    // Arrange
    const code = 'test-code';
    const state = 'test-state';

    // Act
    const result = await handleCallback(code, state);

    // Assert
    expect(result.user).toBeDefined();
    expect(result.sessionToken).toBeDefined();
  });

  it('updates existing user on subsequent sign-in', async () => {
    // Test implementation
  });
});
```

### Integration Test Example

**Test: OAuth Flow** (`tests/integration/oauth-flow.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { testClient } from '../helpers/test-client';

describe('OAuth Flow Integration', () => {
  it('completes full sign-in flow', async () => {
    // Initiate sign-in
    const initResult = await testClient.auth.initiateSignIn.query({});
    expect(initResult.authorizationUrl).toContain('accounts.google.com');

    // Simulate OAuth callback
    const callbackResult = await testClient.auth.handleCallback.mutate({
      code: 'mock-code',
      state: initResult.state,
    });

    expect(callbackResult.success).toBe(true);
    expect(callbackResult.user).toBeDefined();
  });
});
```

### E2E Test Example

**Test: Sign-In Journey** (`tests/e2e/oauth-flow.test.ts`):

```typescript
import { test, expect } from '@playwright/test';

test('user can sign in with Google', async ({ page }) => {
  // Go to login page
  await page.goto('http://localhost:3000/login');

  // Click "Sign in with Google"
  await page.click('button:has-text("Sign in with Google")');

  // Google redirects (in test, use mock OAuth server)
  await page.waitForURL('**/auth/callback*');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');

  // Verify user is authenticated
  const profileButton = page.locator('[data-testid="user-profile"]');
  await expect(profileButton).toBeVisible();
});
```

---

## Common Issues & Troubleshooting

### Issue 1: "redirect_uri_mismatch"

**Symptom**: Google returns error on OAuth redirect

**Solution**:
- Verify `GOOGLE_REDIRECT_URI` matches exactly in Google Cloud Console
- Check for trailing slashes (must match exactly)
- Ensure protocol matches (http vs https)

### Issue 2: CSRF Validation Fails

**Symptom**: "Invalid state parameter" error

**Solution**:
- Verify Valkey is running and accessible
- Check state TTL (should be 10 minutes)
- Ensure state is properly stored before redirect

### Issue 3: Session Not Persisting

**Symptom**: User logged out immediately after sign-in

**Solution**:
- Verify HTTP-only cookie is set correctly
- Check cookie domain and SameSite settings
- Ensure Valkey TTL matches session expiration

### Issue 4: Database Connection Errors

**Symptom**: "relation 'users' does not exist"

**Solution**:
- Run Drizzle migrations: `npx drizzle-kit push:pg`
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running

---

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured in Cloud Run
- [ ] Google OAuth redirect URI updated for production domain
- [ ] Database migrations applied to production DB
- [ ] Valkey instance provisioned and accessible
- [ ] HTTPS enabled and enforced
- [ ] Session secret rotated (different from development)
- [ ] Terraform infrastructure deployed (`infra/`)
- [ ] Biome linting passes
- [ ] All tests pass (unit, integration, contract, E2E)
- [ ] Logging verified in Google Cloud Logging
- [ ] Metrics dashboards created in Google Cloud Monitoring

---

## Next Steps

After implementing OAuth authentication:

1. **Run `/speckit.tasks`** to generate detailed implementation tasks
2. **Implement features** following task order and priorities
3. **Write tests** for each use case (TDD recommended)
4. **Document** any architectural decisions as ADRs
5. **Deploy** to staging environment first
6. **Monitor** logs and metrics during initial rollout

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Hono Framework Documentation](https://hono.dev/)
- [Vitest Documentation](https://vitest.dev/)

For questions or issues, refer to:
- Project constitution: `.specify/memory/constitution.md`
- Feature specification: `specs/001-google-oauth-auth/spec.md`
- Implementation plan: `specs/001-google-oauth-auth/plan.md`
- Research decisions: `specs/001-google-oauth-auth/research.md`
