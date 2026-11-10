import type { App } from 'obsidian';

import { appendCodeBlock } from '@mnaoumov/obsidian-lib/html-element';
import { confirm } from '@mnaoumov/obsidian-lib/modals/confirm';

import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';

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
   * Checks whether the configured invocable scripts folder is trusted on this device.
   *
   * @returns `true` when a folder is configured and it is the one stored as trusted.
   */
  public isTrusted(): boolean {
    const folder = this.getFolder();
    return !!folder && this.app.loadLocalStorage(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY) === folder;
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
   * Revokes the trust on this device.
   */
  public revoke(): void {
    this.app.saveLocalStorage(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, null);
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
   * Trusts the configured folder on this device.
   */
  public trust(): void {
    const folder = this.getFolder();
    if (!folder) {
      return;
    }

    this.app.saveLocalStorage(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, folder);
  }
}
