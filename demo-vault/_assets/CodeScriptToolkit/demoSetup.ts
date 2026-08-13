import type { App } from 'obsidian';

import { Notice } from 'obsidian';
import {
  configureCommunityPlugin,
  enableCommunityPlugin,
  installCommunityPlugin
} from 'obsidian-dev-utils/obsidian/community-plugins';

const CODE_SCRIPT_TOOLKIT_PLUGIN_ID = 'fix-require-modules';
const INVOKE_SCRIPT_COMMAND_ID_PREFIX = `${CODE_SCRIPT_TOOLKIT_PLUGIN_ID}:invoke-script-file-`;
const POLL_INTERVAL_IN_MILLISECONDS = 100;
const POLL_TIMEOUT_IN_MILLISECONDS = 5000;
const STABLE_POLL_COUNT = 3;
const WATCHER_REARM_DELAY_IN_MILLISECONDS = 250;

/**
 * Installs a community plugin, writes its settings, THEN enables it — in that order — so the
 * plugin reads the correct configuration on its first load (a plugin enabled before it is
 * configured runs its `onload` with default settings and does nothing useful).
 */
export async function installConfigureEnable(app: App, pluginId: string, settings?: Record<string, unknown>): Promise<void> {
  await installCommunityPlugin({ app, pluginId });
  if (settings) {
    await configureCommunityPlugin({ app, pluginId, settings });
  }
  await enableCommunityPlugin({ app, pluginId });
  new Notice(`Installed, configured and enabled: ${pluginId}`);
}

/**
 * Waits until a script's command has appeared in (or disappeared from) the command palette, after the
 * script was added to or removed from the invocable scripts folder. Adding a file to that folder does not
 * register it directly: the plugin's folder watcher notices the change and re-registers every script, so a
 * button that just wrote the file has to wait for that to happen before the command exists.
 *
 * This vault is desktop-only, where the watcher is `fs.watch` and fires at once, so the timeout below only
 * has to absorb the re-registration itself. Not finding the command within it means the mechanism is
 * broken, which is why this throws rather than returning quietly.
 *
 * @param app - Obsidian app instance.
 * @param relativeScriptPath - The script's path relative to the invocable scripts folder.
 * @param shouldBeRegistered - Whether to wait for the command to appear (`true`) or to disappear (`false`).
 */
export async function waitForInvocableCommand(app: App, relativeScriptPath: string, shouldBeRegistered: boolean): Promise<void> {
  const commandId = `${INVOKE_SCRIPT_COMMAND_ID_PREFIX}${relativeScriptPath}`;

  for (let elapsed = 0; elapsed <= POLL_TIMEOUT_IN_MILLISECONDS; elapsed += POLL_INTERVAL_IN_MILLISECONDS) {
    if (Boolean(app.commands.commands[commandId]) === shouldBeRegistered) {
      await waitForRegistrationToSettle(app);
      return;
    }

    await sleep(POLL_INTERVAL_IN_MILLISECONDS);
  }

  throw new Error(`Timed out waiting for ${relativeScriptPath} to be ${shouldBeRegistered ? 'registered' : 'unregistered'}`);
}

/**
 * Waits for a re-registration pass to finish, not merely for one command to appear. The watcher stops
 * itself while it re-registers and re-arms shortly after, so a file changed in between is not noticed at
 * all — and the command asked about above can show up long before the pass that produced it is done.
 * Returning right then would hand control back inside that blind window, and the very next thing these
 * demos do is change the same folder again.
 *
 * The pass is treated as finished once the number of registered invocable commands has stopped moving.
 *
 * @param app - Obsidian app instance.
 */
async function waitForRegistrationToSettle(app: App): Promise<void> {
  function count(): number {
    return Object.keys(app.commands.commands).filter((id) => id.startsWith(INVOKE_SCRIPT_COMMAND_ID_PREFIX)).length;
  }

  let previousCount = count();
  let stablePolls = 0;

  for (let elapsed = 0; elapsed <= POLL_TIMEOUT_IN_MILLISECONDS && stablePolls < STABLE_POLL_COUNT; elapsed += POLL_INTERVAL_IN_MILLISECONDS) {
    await sleep(POLL_INTERVAL_IN_MILLISECONDS);
    const currentCount = count();
    stablePolls = currentCount === previousCount ? stablePolls + 1 : 0;
    previousCount = currentCount;
  }

  await sleep(WATCHER_REARM_DELAY_IN_MILLISECONDS);
}
