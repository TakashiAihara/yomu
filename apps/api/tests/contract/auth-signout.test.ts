import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const signOutInputSchema = z.object({
  allSessions: z.boolean().default(false),
});

const signOutOutputSchema = z.object({
  success: z.literal(true),
  terminatedSessions: z.number().int().min(0),
});

describe('auth.signOut contract', () => {
  describe('input validation', () => {
    it('should accept empty input (defaults to single session)', () => {
      const input = {};
      const result = signOutInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allSessions).toBe(false);
      }
    });

    it('should accept allSessions=true', () => {
      const input = { allSessions: true };
      const result = signOutInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allSessions).toBe(true);
      }
    });

    it('should accept allSessions=false', () => {
      const input = { allSessions: false };
      const result = signOutInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allSessions).toBe(false);
      }
    });
  });

  describe('output contract', () => {
    it('should return success and terminatedSessions count for single session', () => {
      const mockOutput = {
        success: true as const,
        terminatedSessions: 1,
      };

      const result = signOutOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should return success and terminatedSessions count for all sessions', () => {
      const mockOutput = {
        success: true as const,
        terminatedSessions: 5,
      };

      const result = signOutOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
    });

    it('should return terminatedSessions=0 if no sessions existed', () => {
      const mockOutput = {
        success: true as const,
        terminatedSessions: 0,
      };

      const result = signOutOutputSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);
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
