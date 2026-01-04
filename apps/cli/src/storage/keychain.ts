import { StorageError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import type { CredentialStoreData, ICredentialStore, StoredAccount } from './credential-store.js';
import { createEmptyStoreData, validateStoreData } from './credential-store.js';

const SERVICE_NAME = 'yomu';
const ACCOUNT_NAME = 'credentials';

export class KeychainStore implements ICredentialStore {
  private async getKeytar() {
    try {
      return await import('keytar');
    } catch {
      throw StorageError.keychainUnavailable();
    }
  }

  private async loadData(): Promise<CredentialStoreData> {
    const keytar = await this.getKeytar();

    try {
      const data = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

      if (!data) {
        return createEmptyStoreData();
      }

      const parsed = JSON.parse(data);

      if (!validateStoreData(parsed)) {
        logger.warn('Invalid credential store data, resetting');
        return createEmptyStoreData();
      }

      return parsed;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw StorageError.readFailed(error instanceof Error ? error.message : 'unknown');
    }
  }

  private async saveData(data: CredentialStoreData): Promise<void> {
    const keytar = await this.getKeytar();

    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify(data));
    } catch (error) {
      throw StorageError.writeFailed(error instanceof Error ? error.message : 'unknown');
    }
  }

  async getActiveAccount(): Promise<StoredAccount | null> {
    const data = await this.loadData();

    if (!data.activeAccount) {
      return null;
    }

    const account = data.accounts[data.activeAccount];
    return account ?? null;
  }

  async getAccount(email: string): Promise<StoredAccount | null> {
    const data = await this.loadData();
    const account = data.accounts[email];
    return account ?? null;
  }

  async listAccounts(): Promise<StoredAccount[]> {
    const data = await this.loadData();
    return Object.values(data.accounts);
  }

  async saveAccount(account: StoredAccount): Promise<void> {
    const data = await this.loadData();

    data.accounts[account.email] = account;

    // Set as active if no active account
    if (!data.activeAccount) {
      data.activeAccount = account.email;
    }

    await this.saveData(data);
    logger.info({ email: account.email }, 'Account saved to keychain');
  }

  async setActiveAccount(email: string): Promise<void> {
    const data = await this.loadData();

    if (!data.accounts[email]) {
      throw new Error(`Account not found: ${email}`);
    }

    data.activeAccount = email;
    await this.saveData(data);
    logger.info({ email }, 'Active account set');
  }

  async removeAccount(email: string): Promise<void> {
    const data = await this.loadData();

    delete data.accounts[email];

    if (data.activeAccount === email) {
      const remainingAccounts = Object.keys(data.accounts);
      data.activeAccount = remainingAccounts[0] ?? null;
    }

    await this.saveData(data);
    logger.info({ email }, 'Account removed from keychain');
  }

  async clear(): Promise<void> {
    const keytar = await this.getKeytar();

    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      logger.info('All credentials cleared from keychain');
    } catch (error) {
      throw StorageError.writeFailed(error instanceof Error ? error.message : 'unknown');
    }
  }
}
