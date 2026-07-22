import type { Plugin as ObsidianPlugin } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { RegisterTempPluginParams } from './code-button-context.ts';

interface CodeScriptToolkitModule {
  getTempPlugin(tempPluginClass: string): null | ObsidianPlugin;
  registerTempPlugin(params: RegisterTempPluginParams): Promise<null | ObsidianPlugin>;
  unregisterTempPlugin(tempPluginClass: string): void;
}

function vaultPath(): string {
  return getTempVault().path;
}

describe('TempPluginRegistry integration', () => {
  it('should require codescript-toolkit module and access its API', async () => {
    const result = await evalInObsidian({
      async fn() {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<Record<string, unknown>>;
        const cstModule = await requireAsync('codescript-toolkit');

        return {
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
      async fn({ obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<CodeScriptToolkitModule>;
        const cstModule = await requireAsync('codescript-toolkit');

        const TEMP_PLUGIN_NAME = '__IntTestTempPlugin';

        const TestPlugin = class extends obsidianModule.Plugin {
          public override onload(): void {
            Reflect.set(window, '__tempPluginLoaded', true);
          }
        };
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        const plugin = await cstModule.registerTempPlugin({ tempPluginClass: TestPlugin });
        const loaded = Reflect.get(window, '__tempPluginLoaded') === true;
        const hasPlugin = plugin !== null;

        cstModule.unregisterTempPlugin(TEMP_PLUGIN_NAME);

        return { hasPlugin, loaded };
      },
      vaultPath: vaultPath()
    });

    expect(result.loaded).toBe(true);
    expect(result.hasPlugin).toBe(true);
  });

  it('should retrieve a registered temp plugin via getTempPlugin', async () => {
    const result = await evalInObsidian({
      async fn({ obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<CodeScriptToolkitModule>;
        const cstModule = await requireAsync('codescript-toolkit');

        const TEMP_PLUGIN_NAME = '__IntTestGetPlugin';

        const TestPlugin = class extends obsidianModule.Plugin {
          public override onload(): void {
            // No-op
          }
        };
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        const beforeRegister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        await cstModule.registerTempPlugin({ tempPluginClass: TestPlugin });
        const afterRegister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        cstModule.unregisterTempPlugin(TEMP_PLUGIN_NAME);
        const afterUnregister = cstModule.getTempPlugin(TEMP_PLUGIN_NAME) !== null;

        return { afterRegister, afterUnregister, beforeRegister };
      },
      vaultPath: vaultPath()
    });

    expect(result.beforeRegister).toBe(false);
    expect(result.afterRegister).toBe(true);
    expect(result.afterUnregister).toBe(false);
  });
});
