import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { LayoutReadyComponent } from '@mnaoumov/obsidian-lib/components/layout-ready-component';
import { App } from 'obsidian';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

interface StartupScript extends Script {
  cleanup?: (app: App) => Promisable<void>;
  shouldExecuteOnLoad?: (app: App) => Promisable<boolean>;
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

    const startupScript = await this.requireHandlerFactoryComponent.requireVaultScriptAsync(startupScriptPath) as Partial<StartupScript>;
    if (typeof startupScript.invoke !== 'function') {
      // Without this check the script fails later with a bare `invoke is not a function`, which does not say which file or what to fix.
      const message = `Startup script ${startupScriptPath} does not export an \`invoke()\` function. Add \`export async function invoke(app) { ... }\` to it.`;
      this.pluginNoticeComponent.showNotice(message);
      console.error(message);
      this.startupScript = null;
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
