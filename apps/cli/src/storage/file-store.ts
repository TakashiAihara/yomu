import Conf from 'conf';

import { StorageError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

import type { CredentialStoreData, ICredentialStore, StoredAccount } from './credential-store.js';
import { createEmptyStoreData, validateStoreData } from './credential-store.js';

export class FileStore implements ICredentialStore {
  private store: Conf<CredentialStoreData>;

  constructor() {
    this.store = new Conf<CredentialStoreData>({
      projectName: 'yomu',
      configName: 'credentials',
      encryptionKey: this.getEncryptionKey(),
      defaults: createEmptyStoreData(),
    });
  }

  private getEncryptionKey(): string {
    // Use a combination of machine-specific values for the encryption key
    // In production, this should be derived from a more secure source
    const machineId =
      process.env.YOMU_ENCRYPTION_KEY ??
      `${process.platform}-${process.arch}-${process.env.USER ?? 'default'}`;

    return machineId;
  }

  private loadData(): CredentialStoreData {
    try {
      const data = this.store.store;

      if (!validateStoreData(data)) {
        logger.warn('Invalid credential store data, resetting');
        this.store.clear();
        return createEmptyStoreData();
      }

      return data;
    } catch (error) {
      throw StorageError.readFailed(error instanceof Error ? error.message : 'unknown');
    }
  }

  private saveData(data: CredentialStoreData): void {
    try {
      this.store.set(data);
    } catch (error) {
      throw StorageError.writeFailed(error instanceof Error ? error.message : 'unknown');
    }
  }

  async getActiveAccount(): Promise<StoredAccount | null> {
    const data = this.loadData();

    if (!data.activeAccount) {
      return null;
    }

    const account = data.accounts[data.activeAccount];
    return account ?? null;
  }

  async getAccount(email: string): Promise<StoredAccount | null> {
    const data = this.loadData();
    const account = data.accounts[email];
    return account ?? null;
  }

  async listAccounts(): Promise<StoredAccount[]> {
    const data = this.loadData();
    return Object.values(data.accounts);
  }

  async saveAccount(account: StoredAccount): Promise<void> {
    const data = this.loadData();

    data.accounts[account.email] = account;

    if (!data.activeAccount) {
      data.activeAccount = account.email;
    }

    this.saveData(data);
    logger.info({ email: account.email }, 'Account saved to encrypted file');
  }

  async setActiveAccount(email: string): Promise<void> {
    const data = this.loadData();

    if (!data.accounts[email]) {
      throw new Error(`Account not found: ${email}`);
    }

    data.activeAccount = email;
    this.saveData(data);
    logger.info({ email }, 'Active account set');
  }

  async removeAccount(email: string): Promise<void> {
    const data = this.loadData();

    delete data.accounts[email];

    if (data.activeAccount === email) {
      const remainingAccounts = Object.keys(data.accounts);
      data.activeAccount = remainingAccounts[0] ?? null;
    }

    this.saveData(data);
    logger.info({ email }, 'Account removed from file store');
  }

  async clear(): Promise<void> {
    try {
      this.store.clear();
      logger.info('All credentials cleared from file store');
    } catch (error) {
      throw StorageError.writeFailed(error instanceof Error ? error.message : 'unknown');
    }
  }

  getStorePath(): string {
    return this.store.path;
  }
}
