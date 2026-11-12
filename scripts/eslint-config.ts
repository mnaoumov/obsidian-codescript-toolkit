import type { Linter } from 'eslint';

import { defineEslintConfigs } from '@mnaoumov/obsidian-dev-toolkit/linters/eslint-config';
import { defineConfig } from 'eslint/config';

/**
 * The demo vault's own setup code: the startup script that prepares the vault and the helpers its buttons call.
 * This plugin writes and maintains these, so they take the full rule set like `src/` does. Every other script in
 * the vault is an illustrative example that shows unusual module and `require` styles on purpose, and a linter that
 * "fixed" those would break the lesson.
 */
const DEMO_VAULT_SETUP_FILES = [
  'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts',
  'demo-vault/_assets/CodeScriptToolkit/startup.ts'
];

export const configs: Linter.Config[] = defineEslintConfigs({
  customConfigs() {
    return defineConfig([
      {
        // The illustrative scripts are linted for markdown + spelling only; the setup files are re-included. `demo-vault/**/*`
        // Matches the folders too, and a file inside an ignored folder cannot be un-ignored, so the folders on the way are re-included first.
        ignores: [
          'demo-vault/**/*',
          '!demo-vault/_assets/',
          '!demo-vault/_assets/CodeScriptToolkit/',
          ...DEMO_VAULT_SETUP_FILES.map((file) => `!${file}`)
        ]
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
        files: DEMO_VAULT_SETUP_FILES,
        rules: {
          // The nearest `package.json` is the demo vault's own, which lists only what the example scripts install. `obsidian`
          // And `@mnaoumov/obsidian-lib` are not installed there: the plugin serves both to vault scripts at runtime. The rule is
          // Registered under both plugin names, so both are turned off.
          'import-x/no-extraneous-dependencies': 'off',
          'import/no-extraneous-dependencies': 'off',
          // `_assets/CodeScriptToolkit` is the vault's script folder, named in the plugin's settings and in every note.
          'unicorn/filename-case': 'off'
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
  },
  editContext(context) {
    // Without this the setup files match no config object at all, so un-ignoring them alone would lint them with nothing.
    context.sourceFiles.push(...DEMO_VAULT_SETUP_FILES);
  }
});
