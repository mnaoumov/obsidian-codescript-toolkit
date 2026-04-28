import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/plugin/components/layout-ready-component';
import type { Promisable } from 'type-fest';

import {
  App,
  Component
} from 'obsidian';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

import { requireVaultScriptAsync } from './require-handlers/require-handler-utils.ts';

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
}

interface StartupScriptComponentConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export class StartupScriptComponent extends Component implements LayoutReadyComponent {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;

  private startupScript: null | StartupScript = null;

  public constructor(params: StartupScriptComponentConstructorParams) {
    super();
    this.activeFileProvider = params.activeFileProvider;
    this.app = params.app;
    this.commandRegistrar = params.commandRegistrar;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
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

    this.startupScript = await requireVaultScriptAsync({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      id: startupScriptPath,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginRequire: require,
      pluginSettingsComponent: this.pluginSettingsComponent,
      requireHandlerFactory: this.requireHandlerFactory
    }) as StartupScript;
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
