import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ['./e2e/setup.ts'],
    include: ['e2e/**/*.test.ts'],
    reporters: ['verbose'],
    sequence: {
      shuffle: false,
    },
  },
});
