import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.spec.ts', // Unit tests (with mocks)
      'src/**/*.test.ts', // Integration tests (container-based)
      'tests/contract/**/*.test.ts', // Contract tests
      'tests/e2e/**/*.test.ts', // E2E tests
    ],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@auth': '/src/auth',
      '@shared': '/src/shared',
    },
  },
});
