/**
 * The `localStorage` key holding the invocable scripts folders trusted on this device.
 *
 * `App.saveLocalStorage` scopes it to the vault, and `localStorage` is never synced, so trust is per vault and per
 * device. The value is a list of trusted folder paths, not a flag: pointing the setting at a folder that is not listed,
 * and not under a listed one, makes it untrusted again. Version 15.3.0 stored a single path string under the same key;
 * it is read as a one-entry list.
 *
 * Kept in a module of its own, with no imports, so the integration tests can read it in Node, where `obsidian` cannot be
 * loaded.
 */
export const TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY = 'codescript-toolkit-trusted-invocable-scripts-folder';
