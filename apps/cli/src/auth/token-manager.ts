import { createApiClient, handleApiError } from '../api/client.js';
import { logger } from '../shared/logger.js';
import { type StoredAccount, createCredentialStore } from '../storage/credential-store.js';

const TOKEN_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function isTokenExpired(account: StoredAccount): boolean {
  const expiresAt = new Date(account.expiresAt);
  return expiresAt <= new Date();
}

export function isTokenExpiringSoon(account: StoredAccount): boolean {
  const expiresAt = new Date(account.expiresAt);
  const threshold = new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_MS);
  return expiresAt <= threshold;
}

export function getTimeUntilExpiration(account: StoredAccount): number {
  const expiresAt = new Date(account.expiresAt);
  return expiresAt.getTime() - Date.now();
}

export function formatExpirationTime(account: StoredAccount): string {
  const expiresAt = new Date(account.expiresAt);
  return expiresAt.toLocaleString();
}

export async function refreshTokenIfNeeded(account: StoredAccount): Promise<StoredAccount> {
  if (!isTokenExpiringSoon(account)) {
    return account;
  }

  logger.info({ email: account.email }, 'Token expiring soon, refreshing');

  try {
    const client = createApiClient(account.sessionToken);
    const result = await client.auth.refreshSession.mutate();

    if (result.success) {
      const store = await createCredentialStore();

      const updatedAccount: StoredAccount = {
        ...account,
        expiresAt: result.expiresAt,
      };

      await store.saveAccount(updatedAccount);
      logger.info({ email: account.email }, 'Token refreshed successfully');

      return updatedAccount;
    }

    return account;
  } catch (error) {
    logger.warn({ error, email: account.email }, 'Failed to refresh token');
    handleApiError(error);
  }
}

export async function getValidAccount(): Promise<StoredAccount | null> {
  const store = await createCredentialStore();
  const account = await store.getActiveAccount();

  if (!account) {
    return null;
  }

  if (isTokenExpired(account)) {
    logger.info({ email: account.email }, 'Token expired');
    return null;
  }

  // Try to refresh if expiring soon
  if (isTokenExpiringSoon(account)) {
    try {
      return await refreshTokenIfNeeded(account);
    } catch {
      // If refresh fails but token is still valid, return the account
      if (!isTokenExpired(account)) {
        return account;
      }
      return null;
    }
  }

  return account;
}

export interface AuthenticatedClientResult {
  client: ReturnType<typeof createApiClient>;
  account: StoredAccount;
}

export async function getAuthenticatedClient(): Promise<AuthenticatedClientResult | null> {
  const account = await getValidAccount();

  if (!account) {
    return null;
  }

  return {
    client: createApiClient(account.sessionToken),
    account,
  };
}
