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

describe('CallbackServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startCallbackServer', () => {
    it('should start server on specified port', async () => {
      const { startCallbackServer, stopCallbackServer } = await import('./callback-server.js');

      const { port, server } = await startCallbackServer(9999);

      expect(port).toBe(9999);
      expect(server).toBeDefined();

      await stopCallbackServer(server);
    });

    it('should find available port if specified port is busy', async () => {
      const { startCallbackServer, stopCallbackServer } = await import('./callback-server.js');

      // Start first server
      const first = await startCallbackServer(9998);
      expect(first.port).toBe(9998);

      // Second should find next port
      const second = await startCallbackServer(9998);
      expect(second.port).toBeGreaterThan(9998);

      await stopCallbackServer(first.server);
      await stopCallbackServer(second.server);
    });
  });

  describe('waitForCallback', () => {
    it('should resolve with code when callback received', async () => {
      const { startCallbackServer, stopCallbackServer, waitForCallback } = await import(
        './callback-server.js'
      );

      const { port, server } = await startCallbackServer(9997);

      const callbackPromise = waitForCallback(server, 5000);

      // Simulate callback request
      const response = await fetch(
        `http://localhost:${port}/callback?code=test-code&state=test-state`
      );

      expect(response.ok).toBe(true);

      const result = await callbackPromise;
      expect(result.code).toBe('test-code');
      expect(result.state).toBe('test-state');

      await stopCallbackServer(server);
    });

    it('should reject when error parameter is present', async () => {
      const { startCallbackServer, stopCallbackServer, waitForCallback } = await import(
        './callback-server.js'
      );

      const { port, server } = await startCallbackServer(9996);

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

      await stopCallbackServer(server);
    });

    it('should timeout if no callback received', async () => {
      const { startCallbackServer, stopCallbackServer, waitForCallback } = await import(
        './callback-server.js'
      );

      const { server } = await startCallbackServer(9995);

      const callbackPromise = waitForCallback(server, 100);

      await expect(callbackPromise).rejects.toThrow('timed out');

      await stopCallbackServer(server);
    });
  });
});
