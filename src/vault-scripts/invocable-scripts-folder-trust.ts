import type { App } from 'obsidian';

import { appendCodeBlock } from '@mnaoumov/obsidian-lib/html-element';
import { confirm } from '@mnaoumov/obsidian-lib/modals/confirm';

import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';

import { isSameOrUnderFolder } from './is-same-or-under-folder.ts';
import { TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY } from './trusted-invocable-scripts-folder-key.ts';

interface InvocableScriptsFolderTrustConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

/**
 * Decides whether the scripts in the invocable scripts folder may run on this device.
 *
 * Registering a script evaluates it, so a file synced into that folder would otherwise run without anybody invoking it.
 * Until the user trusts the folder on this device, nothing in it is registered or invoked.
 *
 * The device keeps a list of trusted folders, as VS Code's workspace trust does: switching the setting between folders
 * that were each trusted once does not ask again, and a folder under a trusted folder is trusted too.
 */
export class InvocableScriptsFolderTrust {
  private readonly app: App;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly promptedFolders = new Set<string>();

  public constructor(params: InvocableScriptsFolderTrustConstructorParams) {
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  /**
   * Gets the folder the trust applies to: the configured invocable scripts folder, resolved under the modules root.
   *
   * @returns The folder path, or `''` when none is configured.
   */
  public getFolder(): string {
    return this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
  }

  /**
   * Gets the folders trusted on this device.
   *
   * A single path left by an earlier version is migrated into a one-entry list the first time it is read.
   *
   * @returns The trusted folder paths, sorted.
   */
  public getTrustedFolders(): string[] {
    const stored: unknown = this.app.loadLocalStorage(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY);

    if (typeof stored === 'string') {
      const migrated = stored ? [stored] : [];
      this.saveTrustedFolders(migrated);
      return migrated;
    }

    if (!Array.isArray(stored)) {
      return [];
    }

    const folders = stored.filter((folder): folder is string => typeof folder === 'string' && folder !== '');
    return [...new Set(folders)].sort();
  }

  /**
   * Checks whether a folder is covered by a trusted folder: it is listed, or it sits under a listed folder.
   *
   * @param folder - The folder path.
   * @returns `true` when the folder is trusted on this device.
   */
  public isFolderTrusted(folder: string): boolean {
    return this.getTrustedFolders().some((trustedFolder) => isSameOrUnderFolder(folder, trustedFolder));
  }

  /**
   * Checks whether the configured invocable scripts folder is trusted on this device.
   *
   * @returns `true` when a folder is configured and it is trusted.
   */
  public isTrusted(): boolean {
    return this.isFolderTrusted(this.getFolder());
  }

  /**
   * Asks the user whether to trust the configured folder, and trusts it on this device when they agree.
   *
   * @returns Whether the folder is trusted once the prompt closes.
   */
  public async promptForTrust(): Promise<boolean> {
    const folder = this.getFolder();
    if (!folder) {
      return false;
    }

    if (this.isTrusted()) {
      return true;
    }

    this.promptedFolders.add(folder);

    const shouldTrust = await confirm({
      app: this.app,
      cancelButtonText: 'Don\'t trust',
      message: createFragment((f) => {
        f.appendText('The invocable scripts folder ');
        appendCodeBlock(f, folder);
        f.appendText(' is not trusted on this device.');
        f.createEl('br');
        f.createEl('br');
        f.appendText('Registering a script runs its code, with full access to your computer. A folder that syncs from other devices or other people can receive scripts you never wrote.');
        f.createEl('br');
        f.createEl('br');
        f.appendText('Trust it only if you trust everyone who can write to it. Until you do, its scripts are not registered and cannot be invoked.');
      }),
      okButtonText: 'Trust this folder',
      title: 'Trust the invocable scripts folder?'
    });

    if (shouldTrust) {
      this.trust();
    }

    return shouldTrust;
  }

  /**
   * Removes one folder from the trusted folders on this device.
   *
   * @param folder - The trusted folder path to remove.
   */
  public removeTrustedFolder(folder: string): void {
    this.saveTrustedFolders(this.getTrustedFolders().filter((trustedFolder) => trustedFolder !== folder));
  }

  /**
   * Checks whether the user should be asked about the configured folder without having asked for it: once per folder
   * per session, so a declined prompt is not repeated on every change the folder watcher reports.
   *
   * @returns `true` when the folder is untrusted and has not been asked about in this session.
   */
  public shouldPromptAutomatically(): boolean {
    const folder = this.getFolder();
    return !!folder && !this.isTrusted() && !this.promptedFolders.has(folder);
  }

  /**
   * Trusts the configured folder on this device, adding it to the trusted folders.
   */
  public trust(): void {
    const folder = this.getFolder();
    if (!folder || this.isTrusted()) {
      return;
    }

    this.saveTrustedFolders([...this.getTrustedFolders(), folder]);
  }

  /**
   * Stops trusting the configured folder on this device.
   *
   * Removes its own entry and every trusted folder above it, since any of them would otherwise keep it trusted.
   */
  public untrust(): void {
    const folder = this.getFolder();
    if (!folder) {
      return;
    }

    this.saveTrustedFolders(this.getTrustedFolders().filter((trustedFolder) => !isSameOrUnderFolder(folder, trustedFolder)));
  }

  private saveTrustedFolders(folders: readonly string[]): void {
    this.app.saveLocalStorage(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, folders.length > 0 ? [...new Set(folders)].sort() : null);
  }
}
