import type { App } from 'obsidian';

import { appendCodeBlock } from '@mnaoumov/obsidian-lib/html-element';
import { confirm } from '@mnaoumov/obsidian-lib/modals/confirm';

import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';

import { TRUSTED_STARTUP_SCRIPTS_KEY } from './trusted-startup-scripts-key.ts';

interface StartupScriptTrustConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

/**
 * Decides whether the configured startup script may run on this device.
 *
 * The startup script runs at every launch without a click, and both its path (in the synced `data.json`) and its file
 * (an ordinary vault file) can arrive from another device. Until the user trusts the configured path on this device,
 * the script is neither loaded nor run.
 *
 * The device keeps a list of trusted paths, so switching the setting between scripts that were each trusted once does
 * not ask again. Only an exact path is trusted: a trusted invocable scripts folder does not trust a startup script in
 * it, because pointing the setting at another file there must ask again.
 */
export class StartupScriptTrust {
  private readonly app: App;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly promptedPaths = new Set<string>();

  public constructor(params: StartupScriptTrustConstructorParams) {
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  /**
   * Gets the path the trust applies to: the configured startup script, resolved under the modules root.
   *
   * @returns The script path, or `''` when none is configured.
   */
  public getPath(): string {
    return this.pluginSettingsComponent.settings.getStartupScriptPath();
  }

  /**
   * Gets the startup script paths trusted on this device.
   *
   * @returns The trusted paths, sorted.
   */
  public getTrustedPaths(): string[] {
    const stored: unknown = this.app.loadLocalStorage(TRUSTED_STARTUP_SCRIPTS_KEY);

    if (!Array.isArray(stored)) {
      return [];
    }

    const paths = stored.filter((path): path is string => typeof path === 'string' && path !== '');
    return [...new Set(paths)].sort();
  }

  /**
   * Checks whether the configured startup script is trusted on this device.
   *
   * @returns `true` when a script is configured and its path is trusted.
   */
  public isTrusted(): boolean {
    const path = this.getPath();
    return !!path && this.getTrustedPaths().includes(path);
  }

  /**
   * Asks the user whether to trust the configured startup script, and trusts it on this device when they agree.
   *
   * @returns Whether the script is trusted once the prompt closes.
   */
  public async promptForTrust(): Promise<boolean> {
    const path = this.getPath();
    if (!path) {
      return false;
    }

    if (this.isTrusted()) {
      return true;
    }

    this.promptedPaths.add(path);

    const shouldTrust = await confirm({
      app: this.app,
      cancelButtonText: 'Don\'t trust',
      message: createFragment((f) => {
        f.appendText('The startup script ');
        appendCodeBlock(f, path);
        f.appendText(' is not trusted on this device.');
        f.createEl('br');
        f.createEl('br');
        f.appendText('It runs every time the vault opens, with full access to your computer. Its path and its file both sync, so another device or another person can set or change it.');
        f.createEl('br');
        f.createEl('br');
        f.appendText('Trust it only if you trust everyone who can write to this vault. Until you do, it does not run.');
      }),
      okButtonText: 'Trust this script',
      title: 'Trust the startup script?'
    });

    if (shouldTrust) {
      this.trust();
    }

    return shouldTrust;
  }

  /**
   * Removes one path from the trusted startup scripts on this device.
   *
   * @param path - The trusted path to remove.
   */
  public removeTrustedPath(path: string): void {
    this.saveTrustedPaths(this.getTrustedPaths().filter((trustedPath) => trustedPath !== path));
  }

  /**
   * Checks whether the user should be asked about the configured startup script without having asked for it: once per
   * path per session, so a declined prompt is not repeated.
   *
   * @returns `true` when the script is untrusted and has not been asked about in this session.
   */
  public shouldPromptAutomatically(): boolean {
    const path = this.getPath();
    return !!path && !this.isTrusted() && !this.promptedPaths.has(path);
  }

  /**
   * Trusts the configured startup script on this device, adding it to the trusted paths.
   */
  public trust(): void {
    const path = this.getPath();
    if (!path || this.isTrusted()) {
      return;
    }

    this.saveTrustedPaths([...this.getTrustedPaths(), path]);
  }

  /**
   * Stops trusting the configured startup script on this device.
   */
  public untrust(): void {
    const path = this.getPath();
    if (!path) {
      return;
    }

    this.removeTrustedPath(path);
  }

  private saveTrustedPaths(paths: readonly string[]): void {
    this.app.saveLocalStorage(TRUSTED_STARTUP_SCRIPTS_KEY, paths.length > 0 ? [...new Set(paths)].sort() : null);
  }
}
