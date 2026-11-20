import type { Linter } from 'eslint';

import { defineEslintConfigs } from '@mnaoumov/obsidian-dev-toolkit/linters/eslint-config';
import { defineConfig } from 'eslint/config';

export const configs: Linter.Config[] = defineEslintConfigs({
  customConfigs(context) {
    return defineConfig([
      {
        // The illustrative scripts show unusual module and `require` styles on purpose, so they are linted for markdown and spelling only.
        // The shared config re-includes the vault's own setup files, `demoSetup.ts` and `startup.ts`, past this ignore.
        ignores: ['demo-vault/**/*']
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
        // Scoped to the files the toolkit's own rules apply to: the rule's plugin is registered only there.
        files: context.allFiles(),
        rules: {
          'typescript-dev-toolkit/no-undefined-return-type': 'error'
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
