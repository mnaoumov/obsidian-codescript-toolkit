// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginRegistryComponent } from '../temp-plugin-registry.ts';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
export class UnloadTempPluginsCommandHandler extends GlobalCommandHandler {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public constructor(private readonly tempPluginRegistry: TempPluginRegistryComponent) {
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
