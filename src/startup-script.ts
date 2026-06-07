import type { Promisable } from 'type-fest';

import { App } from 'obsidian';
import { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/components/layout-ready-component';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
}

interface StartupScriptComponentConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

export class StartupScriptComponent extends LayoutReadyComponent {
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  private startupScript: null | StartupScript = null;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super(params.app);
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.RequireHandlerFactoryComponent = params.RequireHandlerFactoryComponent;
  }

  public async cleanupStartupScript(): Promise<void> {
    if (!this.startupScript) {
      return;
    }

    await this.startupScript.cleanup?.(this.app);

    this.startupScript = null;
  }

  public async invokeStartupScript(): Promise<void> {
    if (this.startupScript) {
      throw new Error('Startup script already invoked');
    }

    const startupScriptPath = await this.validateStartupScript();
    if (!startupScriptPath) {
      return;
    }

    this.startupScript = await this.RequireHandlerFactoryComponent.requireVaultScriptAsync(startupScriptPath) as StartupScript;
    await this.startupScript.invoke(this.app);
  }

  public override async onLayoutReady(): Promise<void> {
    await this.invokeStartupScript();
    this.register(() => this.cleanupStartupScript());
  }

  public async reloadStartupScript(): Promise<void> {
    await this.cleanupStartupScript();
    await this.invokeStartupScript();
  }

  private async validateStartupScript(shouldWarnOnNotConfigured = false): Promise<null | string> {
    const startupScriptPath = this.pluginSettingsComponent.settings.getStartupScriptPath();
    if (!startupScriptPath) {
      if (shouldWarnOnNotConfigured) {
        const message = 'Startup script is not configured';
        new Notice(message);
        console.warn(message);
      }
      return null;
    }

    if (!await this.app.vault.exists(startupScriptPath)) {
      const message = `Startup script not found: ${startupScriptPath}`;
      new Notice(message);
      console.error(message);
      return null;
    }

    return startupScriptPath;
  }
}
