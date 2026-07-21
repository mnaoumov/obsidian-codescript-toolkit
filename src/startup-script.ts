import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { App } from 'obsidian';
import { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/components/layout-ready-component';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
  shouldExecuteOnLoad?(app: App): Promisable<boolean>;
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

  private shouldExecuteOnLoad = false;
  private startupScript: null | StartupScript = null;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super(params.app);
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactoryComponent = params.requireHandlerFactoryComponent;
  }

  public override async onLayoutReady(): Promise<void> {
    if (this.shouldExecuteOnLoad) {
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

  public async reloadStartupScript(): Promise<void> {
    await this.cleanupStartupScript();
    await this.loadStartupScript();
    await this.executeStartupScript();
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

  private async loadStartupScript(): Promise<void> {
    const startupScriptPath = await this.validateStartupScript();
    if (!startupScriptPath) {
      this.startupScript = null;
      return;
    }

    this.startupScript = await this.requireHandlerFactoryComponent.requireVaultScriptAsync(startupScriptPath) as StartupScript;
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
