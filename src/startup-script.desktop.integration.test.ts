import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const MODULES_ROOT = '_int-test-startup';
const STARTUP_SCRIPT = 'startup.js';
const PLUGIN_ID = 'fix-require-modules';

beforeAll(async () => {
  const vault = getTempVault();

  vault.populate({
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      defaultCodeButtonConfig: '',
      invocableScriptsFolder: '',
      mobileChangesCheckingIntervalInSeconds: 30,
      modulesRoot: MODULES_ROOT,
      shouldHandleProtocolUrls: false,
      shouldUseSyncFallback: false,
      startupScriptPath: STARTUP_SCRIPT
    }),
    [`${MODULES_ROOT}/${STARTUP_SCRIPT}`]: [
      'exports.invoke = (app) => { window.__startupInvoked = true; window.__startupApp = typeof app; };',
      'exports.cleanup = () => { window.__startupCleaned = true; };'
    ].join('\n')
  });

  await evalInObsidian({
    args: { pluginId: PLUGIN_ID },
    async fn({ app, pluginId }) {
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      const STARTUP_DELAY_MS = 3000;
      await sleep(STARTUP_DELAY_MS);
    },
    vaultPath: vault.path
  });
}, 30000);

function vaultPath(): string {
  return getTempVault().path;
}

describe('StartupScript integration', () => {
  it('should run startup script invoke on plugin load', async () => {
    const result = await evalInObsidian({
      fn() {
        return {
          appType: Reflect.get(window, '__startupApp') as string | undefined,
          invoked: Reflect.get(window, '__startupInvoked') as boolean | undefined
        };
      },
      vaultPath: vaultPath()
    });

    expect(result.invoked).toBe(true);
    expect(result.appType).toBe('object');
  });

  it('should run cleanup on reload', async () => {
    const result = await evalInObsidian({
      args: { pluginId: PLUGIN_ID },
      async fn({ app, pluginId }) {
        Reflect.deleteProperty(window, '__startupCleaned');
        Reflect.deleteProperty(window, '__startupInvoked');

        app.commands.executeCommandById(`${pluginId}:reload-startup-script`);

        const RELOAD_DELAY_MS = 2000;
        await sleep(RELOAD_DELAY_MS);

        return {
          cleaned: Reflect.get(window, '__startupCleaned') as boolean | undefined,
          reInvoked: Reflect.get(window, '__startupInvoked') as boolean | undefined
        };
      },
      vaultPath: vaultPath()
    });

    expect(result.cleaned).toBe(true);
    expect(result.reInvoked).toBe(true);
  });
});
