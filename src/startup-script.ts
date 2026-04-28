import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/plugin/components/layout-ready-component';

import {
  App,
  Component
} from 'obsidian';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';

import {
  cleanupStartupScript,
  invokeStartupScript
} from './script.ts';

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

  public async onLayoutReady(): Promise<void> {
    await invokeStartupScript({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent,
      requireHandlerFactory: this.requireHandlerFactory
    });
    this.register(() => cleanupStartupScript(this.app));
  }
}
