import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import { getPlatformDependencies } from '../platform-dependencies.ts';

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  public constructor(pluginName: string) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache',
      pluginName
    });
  }

  public override async execute(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    platformDependencies.requireHandler.clearCache();
  }
}
