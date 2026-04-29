import { defineConfig } from 'vitest/config';

const SHARED_EXCLUDE = ['node_modules', 'dist'];
const BIG_TIMEOUT_IN_MILLISECONDS = 30_000;
const HOOK_TIMEOUT_MULTIPLIER = 4;

export const config = defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/**/*.test.ts'
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage'
    },
    exclude: ['node_modules', 'dist'],
    globals: false,
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    projects: [
      {
        resolve: {
          alias: {
            obsidian: 'obsidian-test-mocks/obsidian'
          }
        },
        ssr: {
          noExternal: ['obsidian-dev-utils', 'obsidian-typings']
        },
        test: {
          environment: 'jsdom',
          exclude: [...SHARED_EXCLUDE, 'src/**/*.integration.test.ts'],
          include: ['src/**/*.test.ts'],
          name: 'unit-tests',
          setupFiles: ['obsidian-test-mocks/setup']
        }
      },
      {
        test: {
          environment: 'node',
          fileParallelism: false,
          hookTimeout: BIG_TIMEOUT_IN_MILLISECONDS * HOOK_TIMEOUT_MULTIPLIER,
          include: ['src/**/*.no-app.integration.test.ts'],
          name: 'integration-tests:no-app',
          testTimeout: BIG_TIMEOUT_IN_MILLISECONDS
        }
      },
      {
        test: {
          environment: 'node',
          fileParallelism: false,
          globalSetup: ['obsidian-integration-testing/vitest-global-setup'],
          hookTimeout: BIG_TIMEOUT_IN_MILLISECONDS * HOOK_TIMEOUT_MULTIPLIER,
          include: ['src/**/*.desktop.integration.test.ts'],
          name: 'integration-tests:desktop',
          testTimeout: BIG_TIMEOUT_IN_MILLISECONDS
        }
      },
      {
        test: {
          environment: 'node',
          environmentOptions: {
            obsidianTransport: {
              appiumUrl: 'http://localhost:4723',
              avdName: 'obsidian_test',
              deviceId: 'emulator-5554',
              type: 'obsidian-android-appium'
            }
          },
          fileParallelism: false,
          globalSetup: ['obsidian-integration-testing/vitest-global-setup'],
          hookTimeout: BIG_TIMEOUT_IN_MILLISECONDS * HOOK_TIMEOUT_MULTIPLIER,
          include: ['src/**/*.android.integration.test.ts'],
          name: 'integration-tests:android',
          testTimeout: BIG_TIMEOUT_IN_MILLISECONDS
        }
      }
    ]
  }
});
