import { Notice } from 'obsidian';
import { configureCommunityPlugin } from 'obsidian-dev-utils/obsidian/community-plugins';

const START_NOTE_PATH = '00 Start.md';
const HOTKEY_COMMAND_ID = 'fix-require-modules:invoke-script-file-hotkey.js';
const CODE_SCRIPT_TOOLKIT_PLUGIN_ID = 'fix-require-modules';

// Settings this vault wants that the Demo Vault Helper does not set, because the helper configures
// EVERY demo vault and these are ours alone. `shouldAutoScrollToConsoleMessages` is off because a demo
// Vault is read, not just clicked: a `shouldAutoRun` button writing to its results panel would scroll
// The note down to itself while the note is still rendering, landing you mid-note instead of at the top.
const DEMO_VAULT_CODE_BUTTON_CONFIG = '---\nshouldAutoScrollToConsoleMessages: false\nsourceVisibility: collapsed\n---';

// Run by CodeScript Toolkit on load (its `startupScriptPath` setting, which the
// Demo Vault Helper points here). Applies this vault's own settings, opens the start
// Note and binds the demo hotkey, so the vault needs no committed config and no manual setup.
export async function invoke(app) {
  const message = 'Demo vault ready';
  new Notice(message);
  console.log(message);

  // Applied through the running plugin's settings component, so it takes effect for every note rendered
  // Afterwards with no reload — which matters here, because the plugin being reconfigured is the one
  // Running this very script. Done before the start note opens, so the first render already sees it.
  await configureCommunityPlugin({
    app,
    pluginId: CODE_SCRIPT_TOOLKIT_PLUGIN_ID,
    settings: { defaultCodeButtonConfig: DEMO_VAULT_CODE_BUTTON_CONFIG }
  });

  const startNote = app.vault.getFileByPath(START_NOTE_PATH);
  if (startNote) {
    await app.workspace.getLeaf(false).openFile(startNote);
  }

  app.hotkeyManager.setHotkeys(HOTKEY_COMMAND_ID, [{ modifiers: ['Alt'], key: 'F1' }]);
  app.hotkeyManager.save();
  app.hotkeyManager.bake();
}
