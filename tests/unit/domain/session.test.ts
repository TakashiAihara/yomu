import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_DURATION_MS,
  SESSION_EXTENSION_THRESHOLD_MS,
  type SessionEntity,
  calculateExpiresAt,
  createOAuthStateData,
  createSession,
  createStateHmac,
  generateOAuthState,
  generateSessionToken,
  hashIpAddress,
  isSessionExpired,
  shouldExtendSession,
  toSessionResponse,
  validateOAuthStateData,
  verifyStateHmac,
} from '../../../src/auth/domain/session.js';

describe('Session domain', () => {
  describe('generateSessionToken', () => {
    it('should generate a random token', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });

    it('should generate URL-safe base64 token', () => {
      const token = generateSessionToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('generateOAuthState', () => {
    it('should generate a random state', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state1).not.toBe(state2);
    });
  });

  describe('createStateHmac / verifyStateHmac', () => {
    const secret = 'test-secret-key-32-chars-long!!!';

    it('should create and verify HMAC', () => {
      const state = 'test-state';
      const hmac = createStateHmac(state, secret);

      expect(verifyStateHmac(state, hmac, secret)).toBe(true);
    });

    it('should fail verification with wrong state', () => {
      const state = 'test-state';
      const hmac = createStateHmac(state, secret);

      expect(verifyStateHmac('wrong-state', hmac, secret)).toBe(false);
    });

    it('should fail verification with wrong secret', () => {
      const state = 'test-state';
      const hmac = createStateHmac(state, secret);

      expect(verifyStateHmac(state, hmac, 'wrong-secret-key-32-chars-long!!')).toBe(false);
    });
  });

  describe('hashIpAddress', () => {
    it('should hash IP address consistently', () => {
      const secret = 'test-secret';
      const ip = '192.168.1.1';

      const hash1 = hashIpAddress(ip, secret);
      const hash2 = hashIpAddress(ip, secret);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different IPs', () => {
      const secret = 'test-secret';

      const hash1 = hashIpAddress('192.168.1.1', secret);
      const hash2 = hashIpAddress('192.168.1.2', secret);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculateExpiresAt', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate expiration date with default duration', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const expiresAt = calculateExpiresAt();
      const expectedMs = Date.now() + SESSION_DURATION_MS;

      expect(expiresAt.getTime()).toBe(expectedMs);
    });

    it('should calculate expiration with custom duration', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const customDuration = 60 * 60 * 1000;

      const expiresAt = calculateExpiresAt(customDuration);
      const expectedMs = Date.now() + customDuration;

      expect(expiresAt.getTime()).toBe(expectedMs);
    });
  });

  describe('isSessionExpired', () => {
    it('should return true for expired session', () => {
      const session: SessionEntity = {
        id: '123',
        userId: '456',
        token: 'token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        lastActivityAt: new Date(),
        userAgent: null,
        ipAddressHash: null,
      };

      expect(isSessionExpired(session)).toBe(true);
    });

    it('should return false for valid session', () => {
      const session: SessionEntity = {
        id: '123',
        userId: '456',
        token: 'token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000),
        lastActivityAt: new Date(),
        userAgent: null,
        ipAddressHash: null,
      };

      expect(isSessionExpired(session)).toBe(false);
    });
  });

  describe('shouldExtendSession', () => {
    it('should return true when session is about to expire', () => {
      const session: SessionEntity = {
        id: '123',
        userId: '456',
        token: 'token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_EXTENSION_THRESHOLD_MS - 1000),
        lastActivityAt: new Date(),
        userAgent: null,
        ipAddressHash: null,
      };

      expect(shouldExtendSession(session)).toBe(true);
    });

    it('should return false when session has plenty of time left', () => {
      const session: SessionEntity = {
        id: '123',
        userId: '456',
        token: 'token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        lastActivityAt: new Date(),
        userAgent: null,
        ipAddressHash: null,
      };

      expect(shouldExtendSession(session)).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should create session data with all required fields', () => {
      const secret = 'test-secret-32-chars-long!!!!!!!';
      const input = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      const session = createSession(input, secret);

      expect(session.userId).toBe(input.userId);
      expect(session.token).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
      expect(session.userAgent).toBe(input.userAgent);
      expect(session.ipAddressHash).toBeDefined();
    });

    it('should handle missing optional fields', () => {
      const secret = 'test-secret-32-chars-long!!!!!!!';
      const input = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const session = createSession(input, secret);

      expect(session.userAgent).toBeNull();
      expect(session.ipAddressHash).toBeNull();
    });
  });

  describe('createOAuthStateData / validateOAuthStateData', () => {
    const secret = 'test-secret-32-chars-long!!!!!!!';

    it('should create and validate state data', () => {
      const stateData = createOAuthStateData(secret);

      expect(stateData.state).toBeDefined();
      expect(stateData.hmac).toBeDefined();
      expect(validateOAuthStateData(stateData, secret)).toBe(true);
    });

    it('should include redirect URI when provided', () => {
      const redirectUri = 'https://example.com/dashboard';
      const stateData = createOAuthStateData(secret, redirectUri);

      expect(stateData.redirectUri).toBe(redirectUri);
    });

    it('should fail validation with tampered data', () => {
      const stateData = createOAuthStateData(secret);
      stateData.state = 'tampered';

      expect(validateOAuthStateData(stateData, secret)).toBe(false);
    });
  });

  describe('toSessionResponse', () => {
    it('should convert session to response format', () => {
      const session: SessionEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '456',
        token: 'secret-token',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: new Date('2024-01-02T00:00:00Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00Z'),
        userAgent: 'Mozilla/5.0',
        ipAddressHash: 'abcd1234',
      };

      const response = toSessionResponse(session, true);

      expect(response).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z',
        userAgent: 'Mozilla/5.0',
        isCurrent: true,
      });
    });

    it('should not include sensitive fields', () => {
      const session: SessionEntity = {
        id: '123',
        userId: '456',
        token: 'secret-token',
        createdAt: new Date(),
        expiresAt: new Date(),
        lastActivityAt: new Date(),
        userAgent: null,
        ipAddressHash: 'hash',
      };

      const response = toSessionResponse(session, false);

      expect(response).not.toHaveProperty('token');
      expect(response).not.toHaveProperty('userId');
      expect(response).not.toHaveProperty('ipAddressHash');
      expect(response).not.toHaveProperty('expiresAt');
    });
  });
});
