import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
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
  const vault = getTemporaryVault();

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
    async callback({ app, pluginId }) {
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      const PLUGIN_LOAD_DELAY_MS = 2000;
      await sleep(PLUGIN_LOAD_DELAY_MS);
    },
    input: { pluginId: PLUGIN_ID },
    vaultPath: vault.path
  });
}, 30_000);

function vaultPath(): string {
  return getTemporaryVault().path;
}

describe('ProtocolHandler integration', () => {
  it('should execute module via protocol URL code param with requireAsync', async () => {
    const result = await evalInObsidian({
      async callback({ app, executionDelay }) {
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
      input: { executionDelay: EXECUTION_DELAY_MS },
      vaultPath: vaultPath()
    });

    expect(result.invoked).toBe(true);
    expect(result.prototypeInvoked).toBe('yes');
  });

  it('should execute inline code via protocol URL', async () => {
    const result = await evalInObsidian({
      async callback({ app, executionDelay }) {
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
      input: { executionDelay: EXECUTION_DELAY_MS },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.codeResult).toBe('executed');
  });

  it('should unregister the protocol handler when the plugin is disabled', async () => {
    const result = await evalInObsidian({
      async callback({ app, pluginId }) {
        const workspaceUnknown: unknown = app.workspace;
        const workspaceWithProtocolHandler = workspaceUnknown as WorkspaceWithProtocolHandler;
        await app.plugins.disablePlugin(pluginId);
        const isRegisteredWhileDisabled = workspaceWithProtocolHandler.protocolHandler.handlers.has('CodeScriptToolkit');
        await app.plugins.enablePlugin(pluginId);
        const PLUGIN_LOAD_DELAY_MS = 2000;
        await sleep(PLUGIN_LOAD_DELAY_MS);
        return {
          isRegisteredAfterEnable: workspaceWithProtocolHandler.protocolHandler.handlers.has('CodeScriptToolkit'),
          isRegisteredWhileDisabled
        };
      },
      input: { pluginId: PLUGIN_ID },
      vaultPath: vaultPath()
    });

    expect(result.isRegisteredWhileDisabled).toBe(false);
    expect(result.isRegisteredAfterEnable).toBe(true);
  });

  it('should load despite a handler left behind by a previous instance that did not unload cleanly', async () => {
    const result = await evalInObsidian({
      async callback({ app, pluginId }) {
        const workspaceUnknown: unknown = app.workspace;
        const workspaceWithProtocolHandler = workspaceUnknown as WorkspaceWithProtocolHandler;
        const handlers = workspaceWithProtocolHandler.protocolHandler.handlers;
        await app.plugins.disablePlugin(pluginId);

        // What an instance whose unload threw before its protocol-handler cleanup leaves behind.
        function staleHandler(): void {
          Reflect.set(window, '__protoStaleInvoked', 'yes');
        }
        handlers.set('CodeScriptToolkit', staleHandler);

        await app.plugins.enablePlugin(pluginId);
        const PLUGIN_LOAD_DELAY_MS = 2000;
        await sleep(PLUGIN_LOAD_DELAY_MS);

        const handler = handlers.get('CodeScriptToolkit');
        return {
          isPluginLoaded: app.plugins.getPlugin(pluginId) !== null,
          isReplaced: handler !== undefined && handler !== staleHandler
        };
      },
      input: { pluginId: PLUGIN_ID },
      vaultPath: vaultPath()
    });

    expect(result.isPluginLoaded).toBe(true);
    expect(result.isReplaced).toBe(true);
  });
});
