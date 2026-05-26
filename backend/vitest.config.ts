import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30_000, // mongodb-memory-server first-run can be slow
    hookTimeout: 60_000,
    // Force NODE_ENV=test so env.ts skips production refinements
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/critical-test',
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long',
      ADMIN_PASSWORD: 'test-admin-password',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/index.ts',
        'src/instrumentation.ts',
        'src/server.ts',
        'src/scripts/**',
        'src/lib/sentry.ts',
      ],
      // Realistic v1.0 baseline. Raise thresholds as tests grow.
      thresholds: {
        lines: 35,
        functions: 30,
        branches: 50,
        statements: 35,
      },
    },
  },
})
