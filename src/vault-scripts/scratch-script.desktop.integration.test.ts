import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const MODULES_ROOT = '_int-test-scratch';
const SCRATCH_SCRIPT_PATH = 'Scratch/My scratch.md';
const PLUGIN_ID = 'fix-require-modules';
const INTERVAL_MS = 50;
const TIMEOUT_MS = 10_000;

beforeAll(async () => {
  const vault = getTemporaryVault();

  vault.populate({
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      modulesRoot: MODULES_ROOT,
      scratchScriptPath: SCRATCH_SCRIPT_PATH
    }),
    [`${MODULES_ROOT}/${SCRATCH_SCRIPT_PATH}`]: dedent`
      # Scratch

      \`\`\`code-script
      import type { App } from 'obsidian';

      export async function invoke(app: App): Promise<void> {
        (window as unknown as Record<string, unknown>)['__scratchInvoked'] = typeof app;
      }
      \`\`\`
    `
  });

  await evalInObsidian({
    async callback({ app, pluginId }) {
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);
    },
    input: { pluginId: PLUGIN_ID },
    vaultPath: vault.path
  });
}, 30_000);

function vaultPath(): string {
  return getTemporaryVault().path;
}

describe('ScratchScript integration', () => {
  it('should run the scratch script without opening its note', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, pluginId, timeoutMs }) {
        Reflect.deleteProperty(window, '__scratchInvoked');
        const activePathBefore = app.workspace.getActiveFile()?.path ?? null;

        app.commands.executeCommandById(`${pluginId}:run-scratch-script`);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          message: 'The scratch script must run',
          predicate: (): boolean => Reflect.get(window, '__scratchInvoked') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        return {
          activePathAfter: app.workspace.getActiveFile()?.path ?? null,
          activePathBefore,
          invokedWith: Reflect.get(window, '__scratchInvoked') as string
        };
      },
      input: { intervalMs: INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.invokedWith).toBe('object');
    expect(result.activePathAfter).toBe(result.activePathBefore);
  });

  it('should open the scratch script note on edit', async () => {
    const result = await evalInObsidian({
      async callback({ app, expectedPath, intervalMs, lib: { waitUntil }, pluginId, timeoutMs }) {
        app.commands.executeCommandById(`${pluginId}:edit-scratch-script`);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          message: 'The scratch script note must open',
          predicate: (): boolean => app.workspace.getActiveFile()?.path === expectedPath,
          timeoutInMilliseconds: timeoutMs
        });

        return app.workspace.getActiveFile()?.path ?? null;
      },
      input: { expectedPath: `${MODULES_ROOT}/${SCRATCH_SCRIPT_PATH}`, intervalMs: INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result).toBe(`${MODULES_ROOT}/${SCRATCH_SCRIPT_PATH}`);
  });

  it('should recreate a deleted note from the template and open it instead of running it', async () => {
    const result = await evalInObsidian({
      async callback({ app, expectedPath, intervalMs, lib: { waitUntil }, pluginId, timeoutMs }) {
        const file = app.vault.getFileByPath(expectedPath);
        if (file) {
          await app.fileManager.trashFile(file);
        }
        Reflect.deleteProperty(window, '__scratchInvoked');
        app.workspace.getLeaf(false).detach();

        app.commands.executeCommandById(`${pluginId}:run-scratch-script`);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          message: 'The recreated scratch script note must open',
          predicate: (): boolean => app.workspace.getActiveFile()?.path === expectedPath,
          timeoutInMilliseconds: timeoutMs
        });

        return {
          content: await app.vault.adapter.read(expectedPath),
          isInvoked: Reflect.get(window, '__scratchInvoked') !== undefined
        };
      },
      input: { expectedPath: `${MODULES_ROOT}/${SCRATCH_SCRIPT_PATH}`, intervalMs: INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.content).toContain('```code-script');
    expect(result.content).toContain('export async function invoke(app: App): Promise<void>');
    expect(result.isInvoked).toBe(false);
  });
});
