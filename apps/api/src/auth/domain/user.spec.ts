import { describe, expect, it } from 'vitest';
import {
  type GoogleUserInfo,
  type UserEntity,
  createUserFromGoogleInfo,
  isUserComplete,
  toUserResponse,
  validateGoogleId,
  validateUserEmail,
} from './user.js';

describe('User domain', () => {
  describe('createUserFromGoogleInfo', () => {
    it('should create user input from complete Google info', () => {
      const googleInfo: GoogleUserInfo = {
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      const result = createUserFromGoogleInfo(googleInfo);

      expect(result).toEqual({
        googleId: '123456789',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
      });
    });

    it('should handle missing optional fields', () => {
      const googleInfo: GoogleUserInfo = {
        sub: '123456789',
        email: 'test@example.com',
      };

      const result = createUserFromGoogleInfo(googleInfo);

      expect(result).toEqual({
        googleId: '123456789',
        email: 'test@example.com',
        displayName: null,
        profilePicture: null,
      });
    });
  });

  describe('validateUserEmail', () => {
    it('should return true for valid email', () => {
      expect(validateUserEmail('user@example.com')).toBe(true);
      expect(validateUserEmail('user.name@domain.co.jp')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateUserEmail('not-an-email')).toBe(false);
      expect(validateUserEmail('@missing-local.com')).toBe(false);
      expect(validateUserEmail('missing-domain@')).toBe(false);
    });
  });

  describe('validateGoogleId', () => {
    it('should return true for valid Google ID', () => {
      expect(validateGoogleId('123456789012345678901')).toBe(true);
      expect(validateGoogleId('1')).toBe(true);
    });

    it('should return false for empty Google ID', () => {
      expect(validateGoogleId('')).toBe(false);
    });
  });

  describe('isUserComplete', () => {
    it('should return true for complete user', () => {
      const user: UserEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        googleId: '123456789',
        email: 'test@example.com',
        displayName: 'Test',
        profilePicture: null,
        createdAt: new Date(),
        lastSignInAt: new Date(),
      };

      expect(isUserComplete(user)).toBe(true);
    });
  });

  describe('toUserResponse', () => {
    it('should convert UserEntity to response format', () => {
      const user: UserEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        googleId: '123456789',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        lastSignInAt: new Date('2024-01-02T00:00:00Z'),
      };

      const result = toUserResponse(user);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastSignInAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should not include googleId in response', () => {
      const user: UserEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        googleId: '123456789',
        email: 'test@example.com',
        displayName: null,
        profilePicture: null,
        createdAt: new Date(),
        lastSignInAt: new Date(),
      };

      const result = toUserResponse(user);

      expect(result).not.toHaveProperty('googleId');
    });
  });
});
