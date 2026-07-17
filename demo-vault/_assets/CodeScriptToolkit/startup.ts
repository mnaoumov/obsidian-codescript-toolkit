import { Notice } from 'obsidian';

const START_NOTE_PATH = '00 Start.md';
const HOTKEY_COMMAND_ID = 'fix-require-modules:invoke-script-file-hotkey.js';

// Run by CodeScript Toolkit on load (its `startupScriptPath` setting, which the
// Demo Vault Helper points here). Opens the start note and binds the demo hotkey,
// so the vault needs no committed config and no manual setup.
export async function invoke(app) {
  const message = 'Demo vault ready';
  new Notice(message);
  console.log(message);

  const startNote = app.vault.getFileByPath(START_NOTE_PATH);
  if (startNote) {
    await app.workspace.getLeaf(false).openFile(startNote);
  }

  app.hotkeyManager.setHotkeys(HOTKEY_COMMAND_ID, [{ modifiers: ['Alt'], key: 'F1' }]);
  app.hotkeyManager.save();
  app.hotkeyManager.bake();
}
