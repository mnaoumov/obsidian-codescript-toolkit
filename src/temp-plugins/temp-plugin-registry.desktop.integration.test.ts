// eslint-disable-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type {
  Plugin as ObsidianPlugin,
  WorkspaceLeaf
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { RegisterTempPluginParams as RegisterTemporaryPluginParams } from '../code-buttons/code-button-context.ts';

interface CodeScriptToolkitModule {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly getTempPlugin: (tempPluginClass: string) => null | ObsidianPlugin;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly registerTempPlugin: (params: RegisterTemporaryPluginParams) => Promise<null | ObsidianPlugin>;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly unregisterTempPlugin: (tempPluginClass: string) => void;
}

interface Popout {
  readonly doc: Document;
  readonly leaf: WorkspaceLeaf;
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
          // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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

        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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

        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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

  it('should apply cssText to the main window and to popouts opened before and after registering', async () => {
    const result = await evalInObsidian({
      async callback({ app, obsidianModule }) {
        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<CodeScriptToolkitModule>;
        const cstModule = await requireAsync('codescript-toolkit');

        const TEMP_PLUGIN_NAME = '__IntTestStyledPlugin';
        const STYLE_SELECTOR = `style#__temp-plugin-${TEMP_PLUGIN_NAME}`;
        const POLL_INTERVAL_IN_MILLISECONDS = 50;
        const POLL_TIMEOUT_IN_MILLISECONDS = 6000;

        async function checkEventually(isMet: () => boolean): Promise<boolean> {
          const deadline = Date.now() + POLL_TIMEOUT_IN_MILLISECONDS;
          while (Date.now() < deadline) {
            if (isMet()) {
              return true;
            }
            await sleep(POLL_INTERVAL_IN_MILLISECONDS);
          }
          return isMet();
        }

        async function openPopout(): Promise<Popout> {
          const leaf = app.workspace.openPopoutLeaf();
          await checkEventually(() => leaf.getContainer().doc.readyState === 'complete' && leaf.getContainer().doc !== document);
          return { doc: leaf.getContainer().doc, leaf };
        }

        function countStyles(doc: Document): number {
          return doc.head.querySelectorAll(STYLE_SELECTOR).length;
        }

        const TestPlugin = class extends obsidianModule.Plugin {};
        Object.defineProperty(TestPlugin, 'name', { value: TEMP_PLUGIN_NAME });

        const earlierPopout = await openPopout();
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/44 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        await cstModule.registerTempPlugin({ cssText: '.int-test-styled { color: red; }', tempPluginClass: TestPlugin });
        const laterPopout = await openPopout();

        const isEverywhereAfterRegister = await checkEventually(() => countStyles(document) === 1 && countStyles(earlierPopout.doc) === 1 && countStyles(laterPopout.doc) === 1);
        const countsAfterRegister = [countStyles(document), countStyles(earlierPopout.doc), countStyles(laterPopout.doc)];

        cstModule.unregisterTempPlugin(TEMP_PLUGIN_NAME);
        const isGoneEverywhereAfterUnregister = await checkEventually(() => countStyles(document) === 0 && countStyles(earlierPopout.doc) === 0 && countStyles(laterPopout.doc) === 0);
        const countsAfterUnregister = [countStyles(document), countStyles(earlierPopout.doc), countStyles(laterPopout.doc)];

        earlierPopout.leaf.detach();
        laterPopout.leaf.detach();

        return { countsAfterRegister, countsAfterUnregister, isEverywhereAfterRegister, isGoneEverywhereAfterUnregister };
      },
      vaultPath: vaultPath()
    });

    expect(result.countsAfterRegister).toEqual([1, 1, 1]);
    expect(result.isEverywhereAfterRegister).toBe(true);
    expect(result.countsAfterUnregister).toEqual([0, 0, 0]);
    expect(result.isGoneEverywhereAfterUnregister).toBe(true);
  });
});
