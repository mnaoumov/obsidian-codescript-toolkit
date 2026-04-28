import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';
import type { TempPluginRegistry } from '../temp-plugin-registry.ts';

export class UnloadTempPluginsCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly tempPluginRegistry: TempPluginRegistry) {
    super({
      icon: 'upload',
      id: 'unload-temp-plugins',
      name: 'Unload temp plugins'
    });
  }

  public override execute(): void {
    this.tempPluginRegistry.unloadTempPlugins();
  }
}
