// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { Plugin as ObsidianPlugin } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { RegisterTempPluginParams as RegisterTemporaryPluginParams } from './code-button-context.ts';

interface CodeScriptToolkitModule {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  getTempPlugin(tempPluginClass: string): null | ObsidianPlugin;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  registerTempPlugin(params: RegisterTemporaryPluginParams): Promise<null | ObsidianPlugin>;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  unregisterTempPlugin(tempPluginClass: string): void;
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

describe('TempPluginRegistry integration', () => {
  it('should require codescript-toolkit module and access its API', async () => {
    const result = await evalInObsidian({
      async callback() {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<Record<string, unknown>>;
        const cstModule = await requireAsync('codescript-toolkit');

        return {
          // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
          hasGetTempPlugin: typeof cstModule['getTempPlugin'] === 'function',
          hasRegister: typeof cstModule['registerTempPlugin'] === 'function',
          hasUnregister: typeof cstModule['unregisterTempPlugin'] === 'function'
        };
      },
      vaultPath: vaultPath()
    });

    expect(result.hasGetTempPlugin).toBe(true);
    expect(result.hasRegister).toBe(true);
    expect(result.hasUnregister).toBe(true);
  });

  it('should register and unregister a temp plugin', async () => {
    const result = await evalInObsidian({
      async callback({ obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<CodeScriptToolkitModule>;
        const cstModule = await requireAsync('codescript-toolkit');

        const TEMP_PLUGIN_NAME = '__IntTestTempPlugin';

        const TestPlugin = class extends obsidianModule.Plugin {
          public override onload(): void {
            Reflect.set(window, '__tempPluginLoaded', true);
          }
        };
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        const plugin = await cstModule.registerTempPlugin({ tempPluginClass: TestPlugin });
        const isLoaded = Reflect.get(window, '__tempPluginLoaded') === true;
        const hasPlugin = plugin !== null;

        cstModule.unregisterTempPlugin(TEMP_PLUGIN_NAME);

        return { hasPlugin, loaded: isLoaded };
      },
      vaultPath: vaultPath()
    });

    expect(result.loaded).toBe(true);
    expect(result.hasPlugin).toBe(true);
  });

  it('should retrieve a registered temp plugin via getTempPlugin', async () => {
    const result = await evalInObsidian({
      async callback({ obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<CodeScriptToolkitModule>;
        const cstModule = await requireAsync('codescript-toolkit');

        const TEMP_PLUGIN_NAME = '__IntTestGetPlugin';

        const TestPlugin = class extends obsidianModule.Plugin {
          public override onload(): void {
            // No-op
          }
        };
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        const isBeforeRegister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        await cstModule.registerTempPlugin({ tempPluginClass: TestPlugin });
        const isAfterRegister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        cstModule.unregisterTempPlugin(TEMP_PLUGIN_NAME);
        const isAfterUnregister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        return { afterRegister: isAfterRegister, afterUnregister: isAfterUnregister, beforeRegister: isBeforeRegister };
      },
      vaultPath: vaultPath()
    });

    expect(result.beforeRegister).toBe(false);
    expect(result.afterRegister).toBe(true);
    expect(result.afterUnregister).toBe(false);
  });
});
