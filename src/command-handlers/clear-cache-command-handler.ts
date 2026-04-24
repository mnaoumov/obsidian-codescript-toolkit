import type { App } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { getPlatformDependencies } from '../platform-dependencies.ts';

interface ClearCacheCommandHandlerConstructorParams {
  app: App;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  private readonly app: App;
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
  }

  public override async execute(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    platformDependencies.createRequireHandler({ app: this.app, pluginSettingsComponent: this.pluginSettingsComponent }).clearCache();
  }
}
