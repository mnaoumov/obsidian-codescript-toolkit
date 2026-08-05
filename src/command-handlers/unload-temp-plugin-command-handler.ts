// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { Plugin as ObsidianPlugin } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
interface UnloadTempPluginCommandHandlerConstructorParams {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly tempPlugin: ObsidianPlugin;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly tempPluginClassName: string;
}

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
export class UnloadTempPluginCommandHandler extends GlobalCommandHandler {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  private readonly tempPlugin: ObsidianPlugin;

  public constructor(params: UnloadTempPluginCommandHandlerConstructorParams) {
    super({
      icon: 'unlink',
      id: `unregister-temp-plugin-${params.tempPluginClassName}`,
      name: `Unregister Temp Plugin: ${params.tempPluginClassName}`
    });
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    this.tempPlugin = params.tempPlugin;
  }

  public override execute(): void {
    this.tempPlugin.unload();
  }
}
