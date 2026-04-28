import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { getPlatformDependencies } from '../platform-dependencies.ts';

interface ClearCacheCommandHandlerConstructorParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  commandRegistrar: CommandRegistrar;
  menuEventRegistrar: MenuEventRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: ClearCacheCommandHandlerConstructorParams) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache',
      pluginName: params.pluginName
    });
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
  }

  public override async execute(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    platformDependencies.createRequireHandler({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent
    }).clearCache();
  }
}
