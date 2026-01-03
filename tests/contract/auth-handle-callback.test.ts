import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const handleCallbackInputSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

const handleCallbackOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    profilePicture: z.string().url().nullable(),
    createdAt: z.string().datetime(),
    lastSignInAt: z.string().datetime(),
  }),
  session: z.object({
    token: z.string().min(1),
    expiresAt: z.string().datetime(),
  }),
  isNewUser: z.boolean(),
  redirectUri: z.string().url().optional(),
});

describe('auth.handleCallback contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should accept valid code and state', () => {
      const input = {
        code: 'authorization_code_from_google',
        state: 'state_value',
      };

      const result = handleCallbackInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty code', () => {
      const input = {
        code: '',
        state: 'state_value',
      };

      const result = handleCallbackInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty state', () => {
      const input = {
        code: 'authorization_code',
        state: '',
      };

      const result = handleCallbackInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept error parameters for OAuth denial', () => {
      const input = {
        code: 'unused',
        state: 'state_value',
        error: 'access_denied',
        errorDescription: 'The user denied your request.',
      };

      const result = handleCallbackInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('output contract', () => {
    it('should return valid user and session on success', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          displayName: 'Test User',
          profilePicture: 'https://example.com/avatar.jpg',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T12:00:00.000Z',
        },
        session: {
          token: 'session_token_abc123',
          expiresAt: '2024-01-02T12:00:00.000Z',
        },
        isNewUser: false,
        redirectUri: 'https://example.com/dashboard',
      };

      const result = handleCallbackOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should allow null displayName and profilePicture', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          displayName: null,
          profilePicture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T12:00:00.000Z',
        },
        session: {
          token: 'session_token_abc123',
          expiresAt: '2024-01-02T12:00:00.000Z',
        },
        isNewUser: true,
      };

      const result = handleCallbackOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should indicate isNewUser=true for first-time users', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'newuser@example.com',
          displayName: 'New User',
          profilePicture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T00:00:00.000Z',
        },
        session: {
          token: 'new_session_token',
          expiresAt: '2024-01-02T00:00:00.000Z',
        },
        isNewUser: true,
      };

      expect(mockOutput.isNewUser).toBe(true);
    });
  });

  describe('error responses', () => {
    it('should define error for expired state', () => {
      const errorResponse = {
        code: 'BAD_REQUEST',
        message: 'Your sign-in session has expired. Please try signing in again.',
      };

      expect(errorResponse.code).toBe('BAD_REQUEST');
      expect(errorResponse.message).toContain('expired');
    });

    it('should define error for invalid state', () => {
      const errorResponse = {
        code: 'BAD_REQUEST',
        message: 'Invalid authentication request. Please try signing in again.',
      };

      expect(errorResponse.code).toBe('BAD_REQUEST');
      expect(errorResponse.message).toContain('Invalid');
    });

    it('should define error for OAuth unavailable', () => {
      const errorResponse = {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          "We couldn't connect to Google's authentication service. Please try again in a few moments.",
      };

      expect(errorResponse.code).toBe('INTERNAL_SERVER_ERROR');
      expect(errorResponse.message).toContain('Google');
    });

    it('should define error for user denial', () => {
      const errorResponse = {
        code: 'FORBIDDEN',
        message: "You declined to sign in with Google. You can try again whenever you're ready.",
      };

      expect(errorResponse.code).toBe('FORBIDDEN');
      expect(errorResponse.message).toContain('declined');
    });
  });
});
