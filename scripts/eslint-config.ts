import type { Linter } from 'eslint';

import { defineConfig } from 'eslint/config';
import { defineEslintConfigs } from 'obsidian-dev-utils/script-utils/linters/eslint-config';

export const configs: Linter.Config[] = defineEslintConfigs({
  customConfigs() {
    return defineConfig([
      {
        rules: {
          'obsidianmd/ui/sentence-case': [
            'error',
            {
              brands: ['docs']
            }
          ]
        }
      },
      {
        // Desktop-only implementation: Node built-ins are intentional here because this module is loaded only on desktop.
        files: ['src/**/*-desktop.ts'],
        rules: {
          'obsidianmd/no-nodejs-modules': 'off'
        }
      },
      {
        // Integration test harness code runs in the Node vitest environment and is never shipped to mobile,
        // So Node built-ins are intentional here.
        files: ['src/**/*.integration.test.ts'],
        rules: {
          'import-x/no-nodejs-modules': 'off',
          'obsidianmd/no-nodejs-modules': 'off'
        }
      }
    ]);
  }
});
