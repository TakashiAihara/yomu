export type AuthErrorCode =
  | 'TIMEOUT'
  | 'DENIED'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'INVALID_TOKEN'
  | 'STATE_EXPIRED'
  | 'INVALID_STATE';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly retryable: boolean,
    public readonly userMessage: string
  ) {
    super(message);
    this.name = 'AuthError';
  }

  static timeout(): AuthError {
    return new AuthError(
      'Authentication timed out',
      'TIMEOUT',
      true,
      'Login timed out. Please try again.'
    );
  }

  static denied(): AuthError {
    return new AuthError(
      'Access denied by user',
      'DENIED',
      true,
      'Access was denied. Please authorize the application.'
    );
  }

  static rateLimited(waitSeconds?: number): AuthError {
    const waitMsg = waitSeconds ? ` Please wait ${waitSeconds} seconds and try again.` : '';
    return new AuthError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      true,
      `Too many attempts.${waitMsg}`
    );
  }

  static network(details?: string): AuthError {
    return new AuthError(
      `Network error: ${details ?? 'unknown'}`,
      'NETWORK',
      true,
      'Network error. Check your connection and try again.'
    );
  }

  static invalidToken(): AuthError {
    return new AuthError(
      'Session token is invalid or expired',
      'INVALID_TOKEN',
      true,
      'Session expired. Please log in again.'
    );
  }

  static stateExpired(): AuthError {
    return new AuthError(
      'OAuth state expired',
      'STATE_EXPIRED',
      true,
      'Login timed out. Please try again.'
    );
  }

  static invalidState(): AuthError {
    return new AuthError(
      'OAuth state mismatch',
      'INVALID_STATE',
      false,
      'Security error. Please try again.'
    );
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'READ_FAILED' | 'WRITE_FAILED' | 'KEYCHAIN_UNAVAILABLE' | 'CORRUPTED'
  ) {
    super(message);
    this.name = 'StorageError';
  }

  static keychainUnavailable(): StorageError {
    return new StorageError('OS keychain is not available', 'KEYCHAIN_UNAVAILABLE');
  }

  static readFailed(details?: string): StorageError {
    return new StorageError(`Failed to read credentials: ${details ?? 'unknown'}`, 'READ_FAILED');
  }

  static writeFailed(details?: string): StorageError {
    return new StorageError(`Failed to write credentials: ${details ?? 'unknown'}`, 'WRITE_FAILED');
  }

  static corrupted(): StorageError {
    return new StorageError('Credential data is corrupted', 'CORRUPTED');
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
  }

  static timeout(): NetworkError {
    return new NetworkError('Request timed out', undefined, true);
  }

  static connectionFailed(): NetworkError {
    return new NetworkError('Failed to connect to server', undefined, true);
  }

  static serverError(statusCode: number): NetworkError {
    return new NetworkError(`Server error: ${statusCode}`, statusCode, true);
  }
}
