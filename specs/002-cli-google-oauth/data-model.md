# Data Model: CLI Google OAuth Authentication

**Feature**: 002-cli-google-oauth
**Date**: 2026-01-04

## Overview

The CLI stores authentication credentials locally, supporting multiple Google accounts with one active account at a time. Storage uses OS keychain when available, with encrypted file fallback for headless environments.

## Entities

### CredentialStore

The root container for all stored authentication data.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| version | number | Schema version for migrations | Must be 1 |
| activeAccount | string \| null | Email of currently active account | Must exist in accounts or be null |
| accounts | Record<string, StoredAccount> | Map of email to account data | - |

**Validation Rules**:
- If `activeAccount` is set, it MUST exist as a key in `accounts`
- `version` MUST match current schema version for compatibility

### StoredAccount

Represents a single authenticated Google account.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| email | string | Google account email | Valid email format |
| name | string | User's display name | Non-empty |
| picture | string \| undefined | Profile picture URL | Valid URL or undefined |
| sessionToken | string | Backend session token | Non-empty |
| expiresAt | string | Token expiration time | ISO 8601 format |
| createdAt | string | When account was added | ISO 8601 format |

**State Transitions**:
```
[Not Stored] --login--> [Stored/Inactive] --switch--> [Stored/Active]
                              |                              |
                              |<----------switch-------------|
                              |                              |
                              +----------logout------------->+
                                                             |
                                                    [Not Stored]
```

**Lifecycle**:
1. **Not Stored**: Account not in credential store
2. **Stored/Inactive**: Account credentials saved but not active
3. **Stored/Active**: Account is the current `activeAccount`

### Session (API-side, for reference)

The CLI interacts with sessions stored on the API server.

| Field | Type | Description |
|-------|------|-------------|
| sessionToken | string | Unique session identifier |
| userId | string | Associated user ID |
| expiresAt | Date | Session expiration |
| userAgent | string | Client identifier |
| ipAddress | string | Client IP (for audit) |

## Storage Abstraction

### Interface

```typescript
interface ICredentialStore {
  // Read operations
  getActiveAccount(): Promise<StoredAccount | null>;
  getAccount(email: string): Promise<StoredAccount | null>;
  listAccounts(): Promise<StoredAccount[]>;

  // Write operations
  saveAccount(account: StoredAccount): Promise<void>;
  setActiveAccount(email: string): Promise<void>;
  removeAccount(email: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Implementation Hierarchy

```
ICredentialStore (interface)
       |
       +-- KeychainStore (primary, uses keytar)
       |
       +-- FileStore (fallback, uses conf with encryption)
```

### Selection Logic

```typescript
async function createCredentialStore(): Promise<ICredentialStore> {
  if (await isKeychainAvailable()) {
    return new KeychainStore();
  }

  logger.warn('Keychain not available, using encrypted file storage');
  return new FileStore();
}

async function isKeychainAvailable(): Promise<boolean> {
  try {
    // Test keytar availability
    const keytar = await import('keytar');
    await keytar.getPassword('yomu-test', 'test');
    return true;
  } catch {
    return false;
  }
}
```

## Data Flow

### Login Flow

```
User runs "yomu login"
         |
         v
  [Start OAuth Flow]
         |
         v
  [Receive Session Token]
         |
         v
  [Fetch User Profile] --> { email, name, picture }
         |
         v
  [Create StoredAccount]
         |
         v
  [Save to CredentialStore]
         |
         v
  [Set as Active Account]
```

### Request Authorization Flow

```
User runs authenticated command
         |
         v
  [Get Active Account from Store]
         |
         v
  [Check Token Expiration]
         |
    +----+----+
    |         |
 [Valid]   [Expired/Soon]
    |         |
    |    [Refresh Token]
    |         |
    v         v
  [Include Token in Request Header]
```

## Relationships

```
CredentialStore (1) ----contains----> (0..*) StoredAccount
       |
       +-- activeAccount reference --> (0..1) StoredAccount

StoredAccount ----authenticates-with----> API Session
```

## Encryption (File Store)

When using file-based storage:

| Aspect | Value |
|--------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2 with machine-specific salt |
| File Location | `~/.config/yomu/credentials.enc` |
| Salt Location | `~/.config/yomu/.salt` |

## Migration Strategy

For future schema changes:

```typescript
interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate(data: unknown): unknown;
}

const migrations: Migration[] = [
  // Future migrations will be added here
  // { fromVersion: 1, toVersion: 2, migrate: (data) => ... }
];
```

## Security Considerations

1. **Token Storage**: Session tokens stored in keychain are protected by OS-level security
2. **File Encryption**: Fallback storage uses AES-256-GCM with unique machine key
3. **No Secrets in Logs**: Logger configured to redact sessionToken fields
4. **Secure Deletion**: On logout, tokens are removed from both local store and API
5. **Permission Checks**: File store uses 0600 permissions (owner read/write only)
