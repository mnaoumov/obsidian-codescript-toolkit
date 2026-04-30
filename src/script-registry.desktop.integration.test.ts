import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const MODULES_ROOT = '_int-test-invocables';
const INVOCABLES_FOLDER = 'scripts';
const PLUGIN_ID = 'fix-require-modules';

beforeAll(async () => {
  const vault = getTempVault();

  vault.populate({
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      defaultCodeButtonConfig: '',
      invocableScriptsFolder: INVOCABLES_FOLDER,
      mobileChangesCheckingIntervalInSeconds: 30,
      modulesRoot: MODULES_ROOT,
      shouldHandleProtocolUrls: false,
      shouldUseSyncFallback: false,
      startupScriptPath: ''
    }),
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/simple-invoke.cjs`]: 'exports.invoke = () => { window.__invocableResult = "invoked"; };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/ts-invoke.ts`]: 'export function invoke(): void { (window as Record<string, unknown>).__tsInvoked = true; }'
  });

  await evalInObsidian({
    args: { pluginId: PLUGIN_ID },
    async fn({ app, pluginId }) {
      // Reload plugin to pick up new data.json + scripts
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      // Wait for async onload and script folder watcher to complete
      const WATCHER_SETTLE_DELAY_MS = 3000;
      await sleep(WATCHER_SETTLE_DELAY_MS);
    },
    vaultPath: vault.path
  });
}, 30000);

function vaultPath(): string {
  return getTempVault().path;
}

describe('ScriptRegistry integration', () => {
  it('should register invocable script as Obsidian command', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      fn({ app, pluginId }) {
        const invokeCommands = Object.keys(app.commands.commands)
          .filter((id) => id.startsWith(`${pluginId}:invoke-script-file-`));
        return { invokeCommands };
      },
      vaultPath: vaultPath()
    });

    expect(result.invokeCommands.length).toBeGreaterThan(0);
  });

  it('should execute invocable CJS script via command', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      async fn({ app, pluginId }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('simple-invoke'));

        if (!commandId) {
          return { error: 'Command not found', executed: false };
        }

        app.commands.executeCommandById(commandId);
        const COMMAND_EXECUTION_DELAY_MS = 500;
        await sleep(COMMAND_EXECUTION_DELAY_MS);
        const invocableResult = Reflect.get(window, '__invocableResult') as string | undefined;
        return { executed: true, result: invocableResult };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.result).toBe('invoked');
  });

  it('should register TypeScript invocable script', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      fn({ app, pluginId }) {
        const tsCommand = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('ts-invoke'));
        return { found: tsCommand !== undefined };
      },
      vaultPath: vaultPath()
    });

    expect(result.found).toBe(true);
  });
});
