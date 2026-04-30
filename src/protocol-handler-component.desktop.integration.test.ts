import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const MODULES_ROOT = '_int-test-protocol';
const PLUGIN_ID = 'fix-require-modules';
const EXECUTION_DELAY_MS = 3000;

beforeAll(async () => {
  const vault = getTempVault();

  vault.populate({
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      defaultCodeButtonConfig: '',
      invocableScriptsFolder: '',
      mobileChangesCheckingIntervalInSeconds: 30,
      modulesRoot: MODULES_ROOT,
      shouldHandleProtocolUrls: true,
      shouldUseSyncFallback: false,
      startupScriptPath: ''
    }),
    [`${MODULES_ROOT}/proto-module.js`]: 'exports.invoke = () => { window.__protoInvoked = "yes"; };'
  });

  await evalInObsidian({
    args: { pluginId: PLUGIN_ID },
    async fn({ app, pluginId }) {
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      const PLUGIN_LOAD_DELAY_MS = 2000;
      await sleep(PLUGIN_LOAD_DELAY_MS);
    },
    vaultPath: vault.path
  });
}, 30000);

function vaultPath(): string {
  return getTempVault().path;
}

describe('ProtocolHandler integration', () => {
  it('should execute module via protocol URL code param with requireAsync', async () => {
    const result = await evalInObsidian({
      args: { executionDelay: EXECUTION_DELAY_MS },
      async fn({ app, executionDelay }) {
        Reflect.deleteProperty(window, '__protoInvoked');

        const handler = app.workspace.protocolHandlers.get('CodeScriptToolkit');
        if (!handler) {
          return { error: 'Protocol handler not registered', invoked: false };
        }

        const protocolData = {
          action: 'CodeScriptToolkit',
          code: 'const m = await requireAsync("//_int-test-protocol/proto-module.js"); m.invoke();'
        };
        (handler as (data: Record<string, string>) => void)(protocolData);

        await sleep(executionDelay);

        const protoInvoked = Reflect.get(window, '__protoInvoked') as string | undefined;
        return { invoked: protoInvoked !== undefined, protoInvoked };
      },
      vaultPath: vaultPath()
    });

    expect(result.invoked).toBe(true);
    expect(result.protoInvoked).toBe('yes');
  });

  it('should execute inline code via protocol URL', async () => {
    const result = await evalInObsidian({
      args: { executionDelay: EXECUTION_DELAY_MS },
      async fn({ app, executionDelay }) {
        Reflect.deleteProperty(window, '__protoCodeResult');

        const handler = app.workspace.protocolHandlers.get('CodeScriptToolkit');
        if (!handler) {
          return { error: 'Protocol handler not registered', executed: false };
        }

        const protocolData = { action: 'CodeScriptToolkit', code: 'window.__protoCodeResult = "executed";' };
        (handler as (data: Record<string, string>) => void)(protocolData);

        await sleep(executionDelay);

        const codeResult = Reflect.get(window, '__protoCodeResult') as string | undefined;
        return { codeResult, executed: codeResult !== undefined };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.codeResult).toBe('executed');
  });
});
