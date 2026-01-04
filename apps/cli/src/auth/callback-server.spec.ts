import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules before importing
vi.mock('../shared/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../lib/port.js', async () => {
  const actual = await vi.importActual('../lib/port.js');
  return {
    ...actual,
    isPortAvailable: vi.fn().mockResolvedValue(true),
  };
});

describe('CallbackServer', { sequential: true }, () => {
  let activeServer: Server | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-mock isPortAvailable for each test
    const portModule = vi.mocked(await import('../lib/port.js'));
    portModule.isPortAvailable.mockResolvedValue(true);
  });

  afterEach(async () => {
    if (activeServer) {
      const { stopCallbackServer } = await import('./callback-server.js');
      await stopCallbackServer(activeServer);
      activeServer = null;
      // Wait for port to be released
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  describe('startCallbackServer', () => {
    it('should start server on fixed port 8085', async () => {
      const { startCallbackServer } = await import('./callback-server.js');
      const { CALLBACK_PORT } = await import('../lib/port.js');

      const { port, server } = await startCallbackServer();
      activeServer = server;

      expect(port).toBe(CALLBACK_PORT);
      expect(server).toBeDefined();
    });

    it('should throw error if port is busy', async () => {
      const { isPortAvailable } = await import('../lib/port.js');
      vi.mocked(isPortAvailable).mockResolvedValueOnce(false);

      const { startCallbackServer } = await import('./callback-server.js');

      await expect(startCallbackServer()).rejects.toThrow('Port 8085 is already in use');
    });
  });

  describe('waitForCallback', () => {
    it('should resolve with code when callback received', async () => {
      const { startCallbackServer, waitForCallback } = await import('./callback-server.js');

      const { port, server } = await startCallbackServer();
      activeServer = server;

      const callbackPromise = waitForCallback(server, 5000);

      // Simulate callback request
      const response = await fetch(
        `http://localhost:${port}/callback?code=test-code&state=test-state`
      );

      expect(response.ok).toBe(true);

      const result = await callbackPromise;
      expect(result.code).toBe('test-code');
      expect(result.state).toBe('test-state');
    });

    it('should reject when error parameter is present', async () => {
      const { startCallbackServer, waitForCallback } = await import('./callback-server.js');

      const { port, server } = await startCallbackServer();
      activeServer = server;

      // Create the callback promise and immediately store the result
      // Use Promise.allSettled to handle both fetch and callback atomically
      const [callbackSettled] = await Promise.allSettled([
        waitForCallback(server, 5000),
        // Delay fetch slightly to ensure promise is created first
        new Promise<void>((resolve) => setTimeout(resolve, 10)).then(() =>
          fetch(`http://localhost:${port}/callback?error=access_denied&state=test-state`)
        ),
      ]);

      expect(callbackSettled.status).toBe('rejected');
      if (callbackSettled.status === 'rejected') {
        expect((callbackSettled.reason as Error).message).toBe('Access denied by user');
      }
    });

    it('should timeout if no callback received', async () => {
      const { startCallbackServer, waitForCallback } = await import('./callback-server.js');

      const { server } = await startCallbackServer();
      activeServer = server;

      const callbackPromise = waitForCallback(server, 100);

      await expect(callbackPromise).rejects.toThrow('timed out');
    });
  });
});
