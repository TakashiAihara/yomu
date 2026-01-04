import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules
vi.mock('../shared/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../api/client.js', () => ({
  createApiClient: vi.fn(() => ({
    auth: {
      initiateSignIn: {
        mutate: vi.fn().mockResolvedValue({
          authUrl: 'https://accounts.google.com/oauth?state=test-state',
          state: 'test-state',
        }),
      },
      handleCallback: {
        mutate: vi.fn().mockResolvedValue({
          user: {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Test User',
            profilePicture: null,
          },
          session: {
            token: 'session-token',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      },
    },
  })),
  handleApiError: vi.fn((error) => {
    throw error;
  }),
}));

vi.mock('../lib/browser.js', () => ({
  openBrowser: vi.fn().mockResolvedValue(true),
  isHeadlessEnvironment: vi.fn().mockReturnValue(false),
}));

vi.mock('./callback-server.js', () => ({
  startCallbackServer: vi.fn().mockResolvedValue({
    port: 8085,
    server: { close: vi.fn() },
  }),
  waitForCallback: vi.fn().mockResolvedValue({
    code: 'auth-code',
    state: 'test-state',
  }),
  stopCallbackServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../storage/credential-store.js', () => ({
  createCredentialStore: vi.fn().mockResolvedValue({
    saveAccount: vi.fn().mockResolvedValue(undefined),
    getActiveAccount: vi.fn().mockResolvedValue(null),
  }),
}));

describe('browserAuthFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete browser auth flow successfully', async () => {
    const { browserAuthFlow } = await import('./browser-flow.js');

    const result = await browserAuthFlow();

    expect(result).toEqual({
      email: 'test@example.com',
      name: 'Test User',
      picture: undefined,
    });
  });

  it('should open browser with auth URL', async () => {
    const { browserAuthFlow } = await import('./browser-flow.js');
    const { openBrowser } = await import('../lib/browser.js');

    await browserAuthFlow();

    expect(openBrowser).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
  });

  it('should start callback server and wait for callback', async () => {
    const { browserAuthFlow } = await import('./browser-flow.js');
    const { startCallbackServer, waitForCallback } = await import('./callback-server.js');

    await browserAuthFlow();

    expect(startCallbackServer).toHaveBeenCalled();
    expect(waitForCallback).toHaveBeenCalled();
  });

  it('should save account to credential store', async () => {
    const { browserAuthFlow } = await import('./browser-flow.js');
    const { createCredentialStore } = await import('../storage/credential-store.js');

    await browserAuthFlow();

    const store = await createCredentialStore();
    expect(store.saveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
        sessionToken: 'session-token',
      })
    );
  });
});
