/**
 * The `localStorage` key holding the startup scripts trusted on this device.
 *
 * `App.saveLocalStorage` scopes it to the vault, and `localStorage` is never synced, so trust is per vault and per
 * device. The value is a list of trusted startup script paths: pointing the setting at a file that is not listed makes
 * the startup script untrusted again.
 *
 * Kept in a module of its own, with no imports, so the integration tests can read it in Node, where `obsidian` cannot be
 * loaded.
 */
export const TRUSTED_STARTUP_SCRIPTS_KEY = 'codescript-toolkit-trusted-startup-scripts';
