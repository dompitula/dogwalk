import { defineConfig } from 'vitest/config'

/**
 * Two test projects (see MANUAL_INSTALL.md, section 6):
 * - unit: pure functions, no database and no network.
 * - integration: the real Payload app on a throwaway SQLite database per test file
 *   (tests/integration/setup.ts), with outgoing requests blocked.
 */
export default defineConfig({
  resolve: {
    // The `@/*` and `@payload-config` paths from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    env: {
      // The same dates on every machine, and CI runners use UTC. Europe/Warsaw is also the
      // default email time zone, and it has daylight saving time.
      TZ: 'Europe/Warsaw',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/payload-types.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          testTimeout: 30_000,
          // The first schema push of each test file's new database is slow.
          hookTimeout: 120_000,
          // One child process per test file (isolate is on by default), so each file gets its
          // own Payload instance and database.
          pool: 'forks',
        },
      },
    ],
  },
})
