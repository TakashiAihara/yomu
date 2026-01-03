import { createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const sessionIdSchema = z.string().uuid();

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const SESSION_EXTENSION_THRESHOLD_MS = 60 * 60 * 1000;
export const STATE_TTL_SECONDS = 600;

export interface SessionEntity {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  userAgent: string | null;
  ipAddressHash: string | null;
}

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateOAuthState(): string {
  return randomBytes(16).toString('base64url');
}

export function createStateHmac(state: string, secret: string): string {
  return createHmac('sha256', secret).update(state).digest('base64url');
}

export function verifyStateHmac(state: string, hmac: string, secret: string): boolean {
  const expectedHmac = createStateHmac(state, secret);
  return hmac === expectedHmac;
}

export function hashIpAddress(ipAddress: string, secret: string): string {
  return createHmac('sha256', secret).update(ipAddress).digest('hex');
}

export function calculateExpiresAt(durationMs: number = SESSION_DURATION_MS): Date {
  return new Date(Date.now() + durationMs);
}

export function isSessionExpired(session: SessionEntity): boolean {
  return new Date() >= session.expiresAt;
}

export function shouldExtendSession(session: SessionEntity): boolean {
  const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
  return timeUntilExpiry < SESSION_EXTENSION_THRESHOLD_MS;
}

export function createSession(
  input: CreateSessionInput,
  secret: string
): Omit<SessionEntity, 'id'> {
  const now = new Date();
  return {
    userId: input.userId,
    token: generateSessionToken(),
    createdAt: now,
    expiresAt: calculateExpiresAt(),
    lastActivityAt: now,
    userAgent: input.userAgent ?? null,
    ipAddressHash: input.ipAddress ? hashIpAddress(input.ipAddress, secret) : null,
  };
}

export interface OAuthStateData {
  state: string;
  hmac: string;
  redirectUri?: string;
}

export function createOAuthStateData(secret: string, redirectUri?: string): OAuthStateData {
  const state = generateOAuthState();
  const hmac = createStateHmac(state, secret);
  const result: OAuthStateData = { state, hmac };
  if (redirectUri !== undefined) {
    result.redirectUri = redirectUri;
  }
  return result;
}

export function validateOAuthStateData(data: OAuthStateData, secret: string): boolean {
  return verifyStateHmac(data.state, data.hmac, secret);
}

export function toSessionResponse(session: SessionEntity, isCurrent = false) {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    userAgent: session.userAgent,
    isCurrent,
  };
}
