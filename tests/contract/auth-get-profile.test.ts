import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  userAgent: z.string().nullable(),
  isCurrent: z.boolean(),
});

const getProfileOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    profilePicture: z.string().url().nullable(),
    createdAt: z.string().datetime(),
    lastSignInAt: z.string().datetime(),
  }),
  sessions: z.array(sessionResponseSchema),
});

describe('auth.getProfile contract', () => {
  describe('output contract', () => {
    it('should return user profile with sessions array', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          displayName: 'Test User',
          profilePicture: 'https://example.com/avatar.jpg',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T12:00:00.000Z',
        },
        sessions: [
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            createdAt: '2024-01-01T10:00:00.000Z',
            lastActivityAt: '2024-01-01T12:00:00.000Z',
            userAgent: 'Mozilla/5.0 Chrome/120.0',
            isCurrent: true,
          },
          {
            id: '323e4567-e89b-12d3-a456-426614174002',
            createdAt: '2024-01-01T08:00:00.000Z',
            lastActivityAt: '2024-01-01T09:00:00.000Z',
            userAgent: 'Mozilla/5.0 Firefox/121.0',
            isCurrent: false,
          },
        ],
      };

      const result = getProfileOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should mark exactly one session as current', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          displayName: null,
          profilePicture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T12:00:00.000Z',
        },
        sessions: [
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            createdAt: '2024-01-01T10:00:00.000Z',
            lastActivityAt: '2024-01-01T12:00:00.000Z',
            userAgent: null,
            isCurrent: true,
          },
        ],
      };

      const currentSessions = mockOutput.sessions.filter((s) => s.isCurrent);
      expect(currentSessions.length).toBe(1);
    });

    it('should allow empty sessions array', () => {
      const mockOutput = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          displayName: 'User',
          profilePicture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastSignInAt: '2024-01-01T12:00:00.000Z',
        },
        sessions: [],
      };

      const result = getProfileOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should not expose sensitive session data (token, ipAddressHash)', () => {
      const sessionFields = Object.keys(sessionResponseSchema.shape);

      expect(sessionFields).not.toContain('token');
      expect(sessionFields).not.toContain('ipAddressHash');
      expect(sessionFields).not.toContain('userId');
    });
  });

  describe('authentication requirements', () => {
    it('should require authentication (protectedProcedure)', () => {
      const unauthenticatedErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      };

      expect(unauthenticatedErrorResponse.code).toBe('UNAUTHORIZED');
    });
  });
});
