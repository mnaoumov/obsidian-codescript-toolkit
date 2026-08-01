import { defineObsidianPluginVitestConfig } from 'obsidian-dev-utils/script-utils/test-runners/vitest-config';

export const config = defineObsidianPluginVitestConfig({
  customProjects(context) {
    return [
      {
        test: {
          environment: 'node',
          fileParallelism: false,
          // Project-specific: seeds the whole demo-vault before Obsidian opens (indexed in one scan).
          globalSetup: ['./scripts/demo-vault-global-setup.ts'],
          hookTimeout: context.bigTimeoutInMilliseconds * context.hookTimeoutMultiplier,
          include: ['src/**/*.demo-vault.integration.test.ts'],
          name: 'integration-tests:demo-vault',
          setupFiles: ['obsidian-integration-testing/vitest-setup'],
          testTimeout: context.bigTimeoutInMilliseconds
        }
      }
    ];
  }
});
