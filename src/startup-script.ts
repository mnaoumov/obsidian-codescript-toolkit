import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/components/layout-ready-component';
import type { Promisable } from 'type-fest';

import {
  App,
  Component
} from 'obsidian';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
}

interface StartupScriptComponentConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export class StartupScriptComponent extends Component implements LayoutReadyComponent {
  private readonly app: App;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;

  private startupScript: null | StartupScript = null;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactory = params.requireHandlerFactory;
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

    this.startupScript = await this.requireHandlerFactory.requireVaultScriptAsync(startupScriptPath) as StartupScript;
    await this.startupScript.invoke(this.app);
  }

  public async onLayoutReady(): Promise<void> {
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
