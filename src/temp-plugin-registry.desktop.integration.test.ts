import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  describe,
  expect,
  it
} from 'vitest';

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
          hasRegister: typeof cstModule['registerTempPlugin'] === 'function',
          hasUnregister: typeof cstModule['unregisterTempPlugin'] === 'function',
          keys: Object.keys(cstModule)
        };
      },
      vaultPath: vaultPath()
    });

    expect(result.hasRegister).toBe(true);
    expect(result.hasUnregister).toBe(true);
  });

  it('should register and unregister a temp plugin', async () => {
    const result = await evalInObsidian({
      async fn({ obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<Record<string, unknown>>;
        const cstModule = await requireAsync('codescript-toolkit');
        type RegisterFn = (cls: unknown, css?: string) => void;
        type UnregisterFn = (name: string) => void;
        const registerTempPlugin = (cstModule['registerTempPlugin'] as RegisterFn).bind(cstModule);
        const unregisterTempPlugin = (cstModule['unregisterTempPlugin'] as UnregisterFn).bind(cstModule);

        const TEMP_PLUGIN_NAME = '__IntTestTempPlugin';

        const TestPlugin = class extends obsidianModule.Plugin {
          public override onload(): void {
            Reflect.set(window, '__tempPluginLoaded', true);
          }
        };
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        let registerError: string | undefined;
        try {
          registerTempPlugin(TestPlugin);
        } catch (e) {
          registerError = String(e);
        }

        const LOAD_DELAY_MS = 500;
        await sleep(LOAD_DELAY_MS);

        const loaded = Reflect.get(window, '__tempPluginLoaded') === true;

        let unregisterError: string | undefined;
        try {
          unregisterTempPlugin(TEMP_PLUGIN_NAME);
        } catch (e) {
          unregisterError = String(e);
        }

        return { loaded, registerError, unregisterError };
      },
      vaultPath: vaultPath()
    });

    expect(result.registerError).toBeUndefined();
    expect(result.loaded).toBe(true);
    expect(result.unregisterError).toBeUndefined();
  });
});
