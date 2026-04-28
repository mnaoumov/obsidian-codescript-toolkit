import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { reloadStartupScript } from '../script.ts';

interface ReloadStartupScriptCommandHandlerConstructorParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  commandRegistrar: CommandRegistrar;
  consoleDebugComponent: ConsoleDebugComponent;
  menuEventRegistrar: MenuEventRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: ReloadStartupScriptCommandHandlerConstructorParams) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script',
      pluginName: params.pluginName
    });
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.consoleDebugComponent = params.consoleDebugComponent;
  }

  public override async execute(): Promise<void> {
    await reloadStartupScript({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }
}
