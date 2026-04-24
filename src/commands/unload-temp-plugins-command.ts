import { unloadTempPlugins } from '../temp-plugin-registry.ts';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

export class UnloadTempPluginsCommandHandler extends GlobalCommandHandler {
  public constructor(pluginName: string) {
    super({
      icon: 'upload',
      id: 'unload-temp-plugins',
      name: 'Unload temp plugins',
      pluginName
    });
  }

  public override execute(): void {
    unloadTempPlugins();
  }
}
