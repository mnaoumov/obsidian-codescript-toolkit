import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const MODULES_ROOT = '_int-test-invocables';
const INVOCABLES_FOLDER = 'scripts';
const PLUGIN_ID = 'fix-require-modules';
// The first script execution in a fresh Obsidian session loads babel-standalone and primes the require pipeline — a one-time cost far larger than a warm run. The poll timeout is generous enough to absorb that cold start.
const POLL_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 100;

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
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/check-callback.cjs`]: 'exports.invokeCommand = { checkCallback: (checking) => { if (checking) { return true; } window.__checkCallbackInvoked = true; } };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/cmd-invoke.cjs`]: 'exports.invokeCommand = { callback: () => { window.__cmdInvoked = true; } };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/editor-callback.cjs`]: 'exports.invokeCommand = { editorCallback: (editor) => { window.__editorCallbackInvoked = true; window.__editorExists = typeof editor.getValue === "function"; } };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/editor-check-callback.cjs`]: 'exports.invokeCommand = { editorCheckCallback: (checking, editor) => { if (checking) { return editor !== undefined; } window.__editorCheckCallbackInvoked = true; window.__editorCheckHasEditor = typeof editor.getValue === "function"; } };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/hotkey-invoke.cjs`]: 'exports.invokeCommand = { hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "F9" }], callback: () => { window.__hotkeyInvoked = true; } };',
    [`${MODULES_ROOT}/${INVOCABLES_FOLDER}/scratch.md`]: '# Scratch note for editor tests',
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

  it('should register and execute invokeCommand pattern', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      async fn({ app, pluginId }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('cmd-invoke'));

        if (!commandId) {
          return { error: 'Command not found', executed: false };
        }

        Reflect.deleteProperty(window, '__cmdInvoked');
        app.commands.executeCommandById(commandId);
        const COMMAND_EXECUTION_DELAY_MS = 500;
        await sleep(COMMAND_EXECUTION_DELAY_MS);

        const cmdInvoked = Reflect.get(window, '__cmdInvoked') === true;
        return { executed: cmdInvoked };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
  });

  it('should execute checkCallback invocable script', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      async fn({ app, pluginId }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('check-callback'));

        if (!commandId) {
          return { error: 'Command not found', executed: false };
        }

        Reflect.deleteProperty(window, '__checkCallbackInvoked');
        app.commands.executeCommandById(commandId);
        const COMMAND_EXECUTION_DELAY_MS = 500;
        await sleep(COMMAND_EXECUTION_DELAY_MS);

        const checkCallbackInvoked = Reflect.get(window, '__checkCallbackInvoked') === true;
        return { executed: checkCallbackInvoked };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
  });

  it('should execute editorCallback invocable script with editor context', async () => {
    // Open a markdown file to ensure an active editor exists
    await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, invocablesFolder: INVOCABLES_FOLDER, modulesRoot: MODULES_ROOT, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, invocablesFolder, lib: { waitUntil }, modulesRoot, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText(`${modulesRoot}/${invocablesFolder}/scratch`, '', false);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.editor !== undefined,
          timeoutInMilliseconds: timeoutMs
        });
      },
      vaultPath: vaultPath()
    });

    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, lib: { waitUntil }, obsidianModule, pluginId, timeoutMs }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('editor-callback'));

        if (!commandId) {
          return { editorExists: false, error: 'Command not found', executed: false };
        }

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.editor !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        Reflect.deleteProperty(window, '__editorCallbackInvoked');
        Reflect.deleteProperty(window, '__editorExists');
        app.commands.executeCommandById(commandId);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__editorCallbackInvoked') === true,
          timeoutInMilliseconds: timeoutMs
        });

        const executed = Reflect.get(window, '__editorCallbackInvoked') === true;
        const editorExists = Reflect.get(window, '__editorExists') === true;
        return { editorExists, executed };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.editorExists).toBe(true);
  });

  it('should execute editorCheckCallback invocable script with condition check and editor', async () => {
    // The previous test already opened a markdown file — editor should still be active
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, lib: { waitUntil }, obsidianModule, pluginId, timeoutMs }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('editor-check-callback'));

        if (!commandId) {
          return { editorHasEditor: false, error: 'Command not found', executed: false };
        }

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.editor !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        Reflect.deleteProperty(window, '__editorCheckCallbackInvoked');
        Reflect.deleteProperty(window, '__editorCheckHasEditor');
        app.commands.executeCommandById(commandId);

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__editorCheckCallbackInvoked') === true,
          timeoutInMilliseconds: timeoutMs
        });

        const executed = Reflect.get(window, '__editorCheckCallbackInvoked') === true;
        const editorHasEditor = Reflect.get(window, '__editorCheckHasEditor') === true;
        return { editorHasEditor, executed };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.editorHasEditor).toBe(true);
  });

  it('should register command with hotkey and execute it', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      async fn({ app, pluginId }) {
        const commandId = Object.keys(app.commands.commands)
          .find((id) => id.startsWith(`${pluginId}:invoke-script-file-`) && id.includes('hotkey-invoke'));

        if (!commandId) {
          return { error: 'Command not found', executed: false, hasHotkey: false };
        }

        const command = app.commands.commands[commandId];
        const hasHotkey = Array.isArray(command?.hotkeys) && command.hotkeys.length > 0;

        Reflect.deleteProperty(window, '__hotkeyInvoked');
        app.commands.executeCommandById(commandId);
        const COMMAND_EXECUTION_DELAY_MS = 500;
        await sleep(COMMAND_EXECUTION_DELAY_MS);

        const executed = Reflect.get(window, '__hotkeyInvoked') === true;
        return { executed, hasHotkey };
      },
      vaultPath: vaultPath()
    });

    expect(result.hasHotkey).toBe(true);
    expect(result.executed).toBe(true);
  });
});
