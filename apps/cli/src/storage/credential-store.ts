import { logger } from '../shared/logger.js';

import { FileStore } from './file-store.js';
import { KeychainStore } from './keychain.js';

export interface StoredAccount {
  email: string;
  name: string;
  picture: string | undefined;
  sessionToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface CredentialStoreData {
  version: 1;
  activeAccount: string | null;
  accounts: Record<string, StoredAccount>;
}

export interface ICredentialStore {
  getActiveAccount(): Promise<StoredAccount | null>;
  getAccount(email: string): Promise<StoredAccount | null>;
  listAccounts(): Promise<StoredAccount[]>;
  saveAccount(account: StoredAccount): Promise<void>;
  setActiveAccount(email: string): Promise<void>;
  removeAccount(email: string): Promise<void>;
  clear(): Promise<void>;
}

async function isKeychainAvailable(): Promise<boolean> {
  try {
    const keytar = await import('keytar');
    // Test if keytar works by trying to get a non-existent password
    await keytar.getPassword('yomu-test', 'availability-check');
    return true;
  } catch {
    return false;
  }
}

let credentialStoreInstance: ICredentialStore | null = null;

export async function createCredentialStore(): Promise<ICredentialStore> {
  if (credentialStoreInstance) {
    return credentialStoreInstance;
  }

  if (await isKeychainAvailable()) {
    logger.debug('Using OS keychain for credential storage');
    credentialStoreInstance = new KeychainStore();
  } else {
    logger.warn('Keychain not available, using encrypted file storage');
    credentialStoreInstance = new FileStore();
  }

  return credentialStoreInstance;
}

export function createEmptyStoreData(): CredentialStoreData {
  return {
    version: 1,
    activeAccount: null,
    accounts: {},
  };
}

export function validateStoreData(data: unknown): data is CredentialStoreData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) {
    return false;
  }

  if (obj.activeAccount !== null && typeof obj.activeAccount !== 'string') {
    return false;
  }

  if (typeof obj.accounts !== 'object' || obj.accounts === null) {
    return false;
  }

  return true;
}
