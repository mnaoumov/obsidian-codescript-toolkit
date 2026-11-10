/**
 * The `localStorage` key holding the invocable scripts folder trusted on this device.
 *
 * `App.saveLocalStorage` scopes it to the vault, and `localStorage` is never synced, so trust is per vault and per
 * device. The value is the trusted folder's path, not a flag: pointing the setting at another folder makes it untrusted
 * again.
 *
 * Kept in a module of its own, with no imports, so the integration tests can read it in Node, where `obsidian` cannot be
 * loaded.
 */
export const TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY = 'codescript-toolkit-trusted-invocable-scripts-folder';
