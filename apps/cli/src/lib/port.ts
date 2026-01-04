import { createServer } from 'node:net';

const DEFAULT_PORT_START = 8085;
const DEFAULT_PORT_END = 8099;

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

export async function findAvailablePort(
  startPort: number = DEFAULT_PORT_START,
  endPort: number = DEFAULT_PORT_END
): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // If all preferred ports are in use, let the OS assign a random port
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', (err) => {
      reject(new Error(`Failed to find available port: ${err.message}`));
    });

    server.once('listening', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => {
          resolve(port);
        });
      } else {
        server.close();
        reject(new Error('Failed to get port from server'));
      }
    });

    server.listen(0, '127.0.0.1');
  });
}
