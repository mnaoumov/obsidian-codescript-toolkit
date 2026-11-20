import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const PLUGIN_ID = 'fix-require-modules';
const FIXTURE_PATH = '_int-test-plugin/reload.md';
const POLL_INTERVAL_MS = 50;
// Two waits share one evalInObsidian call, which the transport caps at 30 s.
const POLL_TIMEOUT_MS = 10_000;

beforeAll(() => {
  getTemporaryVault().populate({
    [FIXTURE_PATH]: dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      window.__pluginReloadResult = "reloaded";
      \`\`\`
    `
  });
});

describe('Smoke test', () => {
  it('should load plugin on Desktop', () => {
    const vault = getTemporaryVault();
    expect(vault.path).toBeTruthy();
  });

  // A plugin update or a reinstall unloads one plugin instance while its onload may still be running. That instance used to resume and register the code-button processor after its unload, which nothing ever removes, so the next instance failed with "Code block postprocessor for language code-button is already registered". The test holds the first instance inside its settings read, unloads it there, lets it finish, and then loads the next instance.
  it('should load again after an instance is unloaded while it is still loading', async () => {
    const vaultPath = getTemporaryVault().path;

    const loadState = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, pluginId, timeoutMs }) {
        const errors: string[] = [];
        const originalConsoleError = console.error.bind(console);
        // Obsidian reports a failed plugin load only through console.error, so the test listens there.
        Reflect.set(console, 'error', (...errorArguments: unknown[]): void => {
          errors.push(errorArguments.map((errorArgument) => errorArgument instanceof Error ? `${errorArgument.message} ${String(errorArgument.cause)}` : String(errorArgument)).join(' '));
          originalConsoleError(...errorArguments);
        });

        const vault = app.vault;
        const originalReadPluginData = vault.readPluginData.bind(vault);
        const pluginDirectory = app.plugins.manifests[pluginId]?.dir;
        let isFirstReadHeld = false;
        const firstReadReleases: (() => void)[] = [];
        const firstReadGate = new Promise<void>((resolve) => {
          firstReadReleases.push(resolve);
        });

        vault.readPluginData = async (directory: string): Promise<null | object> => {
          if (directory === pluginDirectory && !isFirstReadHeld) {
            isFirstReadHeld = true;
            await firstReadGate;
          }
          return await originalReadPluginData(directory);
        };

        try {
          await app.plugins.disablePlugin(pluginId);

          const firstEnable = app.plugins.enablePlugin(pluginId);
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            predicate: (): boolean => isFirstReadHeld,
            timeoutInMilliseconds: timeoutMs
          });

          const firstInstance = app.plugins.plugins[pluginId];
          await app.plugins.disablePlugin(pluginId);
          releaseFirstRead();
          await firstEnable;

          await app.plugins.enablePlugin(pluginId);
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            predicate: (): boolean => isLoaded(),
            timeoutInMilliseconds: timeoutMs
          });

          return {
            errors,
            isFirstInstanceLoaded: firstInstance !== undefined && Reflect.get(firstInstance, '_loaded'),
            isNewInstance: app.plugins.plugins[pluginId] !== firstInstance,
            isSecondInstanceLoaded: isLoaded(),
            wasFirstReadHeld: firstInstance !== undefined
          };
        } finally {
          releaseFirstRead();
          vault.readPluginData = originalReadPluginData;
          Reflect.set(console, 'error', originalConsoleError);
        }

        function releaseFirstRead(): void {
          for (const release of firstReadReleases) {
            release();
          }
        }

        function isLoaded(): boolean {
          const plugin = app.plugins.plugins[pluginId];
          return plugin !== undefined && Reflect.get(plugin, '_loaded');
        }
      },
      input: { intervalMs: POLL_INTERVAL_MS, pluginId: PLUGIN_ID, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath
    });

    const renderState = await evalInObsidian({
      async callback({ app, fixturePath, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
        Reflect.deleteProperty(window, '__pluginReloadResult');

        await app.workspace.getLeaf(false).setViewState({
          state: { file: fixturePath, mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__pluginReloadResult') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        const reloadResult = Reflect.get(window, '__pluginReloadResult') as string | undefined;
        Reflect.deleteProperty(window, '__pluginReloadResult');
        return {
          reloadResult,
          renderedBlockCount: view?.containerEl.querySelectorAll(':scope .markdown-reading-view .block-language-code-button').length ?? 0
        };
      },
      input: { fixturePath: FIXTURE_PATH, intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath
    });

    expect(loadState.wasFirstReadHeld).toBe(true);
    expect(loadState.isFirstInstanceLoaded).toBe(false);
    expect(loadState.isNewInstance).toBe(true);
    expect(loadState.isSecondInstanceLoaded).toBe(true);
    expect(loadState.errors.filter((error) => error.includes('Plugin failure') || error.includes('already registered'))).toEqual([]);
    expect(renderState.reloadResult).toBe('reloaded');
    expect(renderState.renderedBlockCount).toBe(1);
  });
});
