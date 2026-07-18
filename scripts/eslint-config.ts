import type { Linter } from 'eslint';

import { defineConfig } from 'eslint/config';
import { defineEslintConfigs } from 'obsidian-dev-utils/script-utils/linters/eslint-config';

export const configs: Linter.Config[] = defineEslintConfigs({
  customConfigs() {
    return defineConfig([
      {
        // The demo vault ships illustrative scripts that intentionally break lint rules; it is linted for markdown + spelling only.
        ignores: ['demo-vault/**']
      },
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
      }
    ]);
  }
});
