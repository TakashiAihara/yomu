import open from 'open';

import { logger } from '../shared/logger.js';

export function isHeadlessEnvironment(): boolean {
  // No DISPLAY on Linux = headless
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return true;
  }

  // SSH session detection
  if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
    return true;
  }

  // CI environment
  if (process.env.CI) {
    return true;
  }

  // Docker/container detection
  if (process.env.container || process.env.DOCKER_CONTAINER) {
    return true;
  }

  return false;
}

export async function openBrowser(url: string): Promise<boolean> {
  if (isHeadlessEnvironment()) {
    logger.debug('Headless environment detected, cannot open browser');
    return false;
  }

  try {
    await open(url);
    logger.debug({ url }, 'Opened browser');
    return true;
  } catch (error) {
    logger.warn({ error }, 'Failed to open browser');
    return false;
  }
}

export function getBrowserOpenInstructions(url: string): string {
  return `Open this URL in your browser:\n\n  ${url}`;
}
