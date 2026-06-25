import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
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
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

export class StartupScriptComponent extends LayoutReadyComponent {
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  private startupScript: null | StartupScript = null;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super(params.app);
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactoryComponent = params.requireHandlerFactoryComponent;
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

    this.startupScript = await this.requireHandlerFactoryComponent.requireVaultScriptAsync(startupScriptPath) as StartupScript;
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
