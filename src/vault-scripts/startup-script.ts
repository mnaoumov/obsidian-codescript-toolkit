import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { LayoutReadyComponent } from '@mnaoumov/obsidian-lib/components/layout-ready-component';
import { invokeAsyncSafely } from '@mnaoumov/typescript-lib/async';
import { App } from 'obsidian';

import type { RequireHandlerFactoryComponent } from '../require-handlers/require-handler-factory.ts';
import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';
import type { Script } from './script.ts';
import type { StartupScriptTrust } from './startup-script-trust.ts';

interface StartupScript extends Script {
  readonly cleanup?: (app: App) => Promisable<void>;
  readonly shouldExecuteOnLoad?: (app: App) => Promisable<boolean>;
}

interface StartupScriptComponentConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;
  readonly startupScriptTrust: StartupScriptTrust;
}

export class StartupScriptComponent extends LayoutReadyComponent {
  private isWaitingForTrust = false;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  private shouldExecuteOnLoad = false;
  private startupScript: null | StartupScript = null;
  private readonly startupScriptTrust: StartupScriptTrust;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super(params.app);
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactoryComponent = params.requireHandlerFactoryComponent;
    this.startupScriptTrust = params.startupScriptTrust;
  }

  public override async onLayoutReady(): Promise<void> {
    if (this.shouldExecuteOnLoad) {
      return;
    }

    if (this.isWaitingForTrust && this.startupScriptTrust.shouldPromptAutomatically()) {
      // Not awaited: the layout-ready work of the rest of the plugin must not wait for the user to answer. Once trusted,
      // the script loads and runs as it would have at startup.
      invokeAsyncSafely(async () => {
        if (await this.startupScriptTrust.promptForTrust()) {
          await this.reloadStartupScript();
        }
      });
      return;
    }

    await this.executeStartupScript();
  }

  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();

    // Register cleanup once, tied to the component lifecycle, regardless of when the script executes.
    this.register(() => this.cleanupStartupScript());

    try {
      await this.loadStartupScript();
      this.shouldExecuteOnLoad = (await this.startupScript?.shouldExecuteOnLoad?.(this.app)) ?? false;
      if (this.shouldExecuteOnLoad) {
        await this.executeStartupScript();
      }
    } catch (error) {
      // A broken startup script must not abort the whole plugin load, so report instead of rethrowing.
      const message = 'Error executing startup script on load';
      this.pluginNoticeComponent.showNotice(message);
      console.error(message, error);
    }
  }

  /**
   * Cleans up the running startup script, then loads and runs the configured one again.
   *
   * An untrusted script is asked about first, and is neither loaded nor run when the user declines.
   */
  public async reloadStartupScript(): Promise<void> {
    await this.cleanupStartupScript();
    await this.loadStartupScript(true);
    await this.executeStartupScript();
  }

  /**
   * Cleans up the running startup script, so it stops affecting the app, without loading it again.
   */
  public async stopStartupScript(): Promise<void> {
    await this.cleanupStartupScript();
  }

  private async cleanupStartupScript(): Promise<void> {
    if (!this.startupScript) {
      return;
    }

    await this.startupScript.cleanup?.(this.app);

    this.startupScript = null;
  }

  private async executeStartupScript(): Promise<void> {
    if (!this.startupScript) {
      return;
    }

    await this.startupScript.invoke(this.app);
  }

  private async loadStartupScript(shouldPromptForTrust = false): Promise<void> {
    this.startupScript = null;
    this.isWaitingForTrust = false;

    const startupScriptPath = await this.validateStartupScript();
    if (!startupScriptPath) {
      return;
    }

    // Requiring the script already runs its top-level code, so trust is checked before the require, not before `invoke()`.
    if (!this.startupScriptTrust.isTrusted() && !(shouldPromptForTrust && await this.startupScriptTrust.promptForTrust())) {
      console.warn(`Startup script is not trusted on this device: ${startupScriptPath}`);
      this.isWaitingForTrust = true;
      return;
    }

    const startupScript = await this.requireHandlerFactoryComponent.requireVaultScriptAsync(startupScriptPath) as Partial<StartupScript>;
    if (typeof startupScript.invoke !== 'function') {
      // Without this check the script fails later with a bare `invoke is not a function`, which does not say which file or what to fix.
      const message = `Startup script ${startupScriptPath} does not export an \`invoke()\` function. Add \`export async function invoke(app) { ... }\` to it.`;
      this.pluginNoticeComponent.showNotice(message);
      console.error(message);
      return;
    }

    this.startupScript = startupScript as StartupScript;
  }

  private async validateStartupScript(shouldWarnOnNotConfigured = false): Promise<null | string> {
    const startupScriptPath = this.pluginSettingsComponent.settings.getStartupScriptPath();
    if (!startupScriptPath) {
      if (shouldWarnOnNotConfigured) {
        const message = 'Startup script is not configured';
        this.pluginNoticeComponent.showNotice(message);
        console.warn(message);
      }
      return null;
    }

    if (!await this.app.vault.exists(startupScriptPath)) {
      const message = `Startup script not found: ${startupScriptPath}`;
      this.pluginNoticeComponent.showNotice(message);
      console.error(message);
      return null;
    }

    return startupScriptPath;
  }
}
