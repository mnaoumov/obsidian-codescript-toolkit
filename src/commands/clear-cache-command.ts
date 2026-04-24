import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { getPlatformDependencies } from '../platform-dependencies.ts';

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  public constructor(pluginName: string, private readonly pluginSettingsComponent: PluginSettingsComponent) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache',
      pluginName
    });
  }

  public override async execute(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    platformDependencies.createRequireHandler(this.pluginSettingsComponent).clearCache();
  }
}
