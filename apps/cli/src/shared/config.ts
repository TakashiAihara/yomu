import Conf from 'conf';

export interface CliConfig {
  apiUrl: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

const defaults: CliConfig = {
  apiUrl: 'http://localhost:3000',
  logLevel: 'info',
};

const configStore = new Conf<CliConfig>({
  projectName: 'yomu',
  defaults,
});

export function getConfig(): CliConfig {
  return {
    apiUrl: process.env.YOMU_API_URL ?? configStore.get('apiUrl'),
    logLevel: (process.env.YOMU_LOG_LEVEL as CliConfig['logLevel']) ?? configStore.get('logLevel'),
  };
}

export function setConfig(key: keyof CliConfig, value: string): void {
  if (key === 'logLevel') {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(value)) {
      throw new Error(`Invalid log level: ${value}. Valid levels: ${validLevels.join(', ')}`);
    }
  }
  configStore.set(key, value);
}

export function getConfigPath(): string {
  return configStore.path;
}
