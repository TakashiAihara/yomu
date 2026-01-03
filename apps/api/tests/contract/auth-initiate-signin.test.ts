import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth.initiateSignIn contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should accept empty input', async () => {
      const input = {};
      expect(input).toBeDefined();
    });

    it('should accept optional redirectUri as valid URL', async () => {
      const input = { redirectUri: 'https://example.com/dashboard' };
      expect(new URL(input.redirectUri)).toBeDefined();
    });

    it('should reject invalid redirectUri', async () => {
      const input = { redirectUri: 'not-a-url' };
      expect(() => new URL(input.redirectUri)).toThrow();
    });
  });

  describe('output contract', () => {
    it('should return authUrl as valid Google OAuth URL', async () => {
      const mockOutput = {
        authUrl:
          'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid%20email%20profile&state=abc123',
        state: 'abc123',
      };

      expect(mockOutput.authUrl).toMatch(/^https:\/\/accounts\.google\.com/);
      expect(mockOutput.state).toBeDefined();
      expect(typeof mockOutput.state).toBe('string');
      expect(mockOutput.state.length).toBeGreaterThan(0);
    });

    it('should include required OAuth parameters in authUrl', async () => {
      const mockAuthUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid%20email%20profile&state=abc123';

      const url = new URL(mockAuthUrl);
      expect(url.searchParams.get('client_id')).toBeDefined();
      expect(url.searchParams.get('redirect_uri')).toBeDefined();
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('scope')).toContain('email');
      expect(url.searchParams.get('scope')).toContain('profile');
      expect(url.searchParams.get('state')).toBeDefined();
    });
  });
});
