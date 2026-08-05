import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

interface ProtocolHandlerRegistry {
  handlers: Map<string, (data: Record<string, string>) => void>;
}

interface WorkspaceWithProtocolHandler {
  protocolHandler: ProtocolHandlerRegistry;
}

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
    // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
    args: { pluginId: PLUGIN_ID },
    // eslint-disable-next-line unicorn/name-replacements -- `fn` is an `obsidian-integration-testing` parameter name.
    async fn({ app, pluginId }) {
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      const PLUGIN_LOAD_DELAY_MS = 2000;
      await sleep(PLUGIN_LOAD_DELAY_MS);
    },
    vaultPath: vault.path
  });
}, 30_000);

function vaultPath(): string {
  return getTempVault().path;
}

describe('ProtocolHandler integration', () => {
  it('should execute module via protocol URL code param with requireAsync', async () => {
    const result = await evalInObsidian({
      // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
      args: { executionDelay: EXECUTION_DELAY_MS },
      // eslint-disable-next-line unicorn/name-replacements -- `fn` is an `obsidian-integration-testing` parameter name.
      async fn({ app, executionDelay }) {
        Reflect.deleteProperty(window, '__protoInvoked');

        const workspaceUnknown: unknown = app.workspace;
        const workspaceWithProtocolHandler = workspaceUnknown as WorkspaceWithProtocolHandler;
        const handler = workspaceWithProtocolHandler.protocolHandler.handlers.get('CodeScriptToolkit');
        if (!handler) {
          return { error: 'Protocol handler not registered', invoked: false };
        }

        const protocolData = {
          action: 'CodeScriptToolkit',
          code: 'const m = await requireAsync("//_int-test-protocol/proto-module.js"); m.invoke();'
        };
        handler(protocolData);

        await sleep(executionDelay);

        const prototypeInvoked = Reflect.get(window, '__protoInvoked') as string | undefined;
        return { invoked: prototypeInvoked !== undefined, prototypeInvoked };
      },
      vaultPath: vaultPath()
    });

    expect(result.invoked).toBe(true);
    expect(result.prototypeInvoked).toBe('yes');
  });

  it('should execute inline code via protocol URL', async () => {
    const result = await evalInObsidian({
      // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
      args: { executionDelay: EXECUTION_DELAY_MS },
      // eslint-disable-next-line unicorn/name-replacements -- `fn` is an `obsidian-integration-testing` parameter name.
      async fn({ app, executionDelay }) {
        Reflect.deleteProperty(window, '__protoCodeResult');

        const workspaceUnknown: unknown = app.workspace;
        const workspaceWithProtocolHandler = workspaceUnknown as WorkspaceWithProtocolHandler;
        const handler = workspaceWithProtocolHandler.protocolHandler.handlers.get('CodeScriptToolkit');
        if (!handler) {
          return { error: 'Protocol handler not registered', executed: false };
        }

        const protocolData = { action: 'CodeScriptToolkit', code: 'window.__protoCodeResult = "executed";' };
        handler(protocolData);

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
