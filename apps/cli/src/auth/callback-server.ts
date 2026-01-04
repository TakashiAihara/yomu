import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';

import { CALLBACK_PORT, isPortAvailable } from '../lib/port.js';
import { AuthError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export interface CallbackResult {
  code: string;
  state: string;
}

const SUCCESS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      background: white;
      padding: 40px 60px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .checkmark {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 { color: #22c55e; margin: 0 0 10px 0; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Authentication Successful!</h1>
    <p>You can close this window and return to the CLI.</p>
  </div>
</body>
</html>
`;

const ERROR_HTML = (error: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%);
    }
    .container {
      text-align: center;
      background: white;
      padding: 40px 60px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .error-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 { color: #ef4444; margin: 0 0 10px 0; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✗</div>
    <h1>Authentication Failed</h1>
    <p>${error}</p>
  </div>
</body>
</html>
`;

export async function startCallbackServer(): Promise<{ port: number; server: Server }> {
  const port = CALLBACK_PORT;

  if (!(await isPortAvailable(port))) {
    throw AuthError.portInUse(port);
  }

  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  logger.debug({ port }, 'Callback server started');

  return { port, server };
}

export async function waitForCallback(
  server: Server,
  timeoutMs: number = 5 * 60 * 1000
): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.removeAllListeners('request');
      reject(AuthError.timeout());
    }, timeoutMs);

    server.on('request', (req: IncomingMessage, res: ServerResponse) => {
      clearTimeout(timeout);

      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

      // Only handle callback path
      if (!url.pathname.includes('callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      logger.debug({ hasCode: !!code, hasError: !!error }, 'Received callback');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML(errorDescription ?? error));

        if (error === 'access_denied') {
          reject(AuthError.denied());
        } else {
          reject(new Error(errorDescription ?? error));
        }
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML('Missing authorization code or state'));
        reject(new Error('Missing authorization code or state'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(SUCCESS_HTML);

      resolve({ code, state });
    });
  });
}

export async function stopCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      logger.debug('Callback server stopped');
      resolve();
    });
  });
}
