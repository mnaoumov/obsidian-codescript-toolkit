import type { Plugin as ObsidianPlugin } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

interface UnloadTempPluginCommandHandlerConstructorParams {
  readonly tempPlugin: ObsidianPlugin;
  readonly tempPluginClassName: string;
}

export class UnloadTempPluginCommandHandler extends GlobalCommandHandler {
  private readonly tempPlugin: ObsidianPlugin;

  public constructor(params: UnloadTempPluginCommandHandlerConstructorParams) {
    super({
      icon: 'unlink',
      id: `unregister-temp-plugin-${params.tempPluginClassName}`,
      name: `Unregister Temp Plugin: ${params.tempPluginClassName}`
    });
    this.tempPlugin = params.tempPlugin;
  }

  public override execute(): void {
    this.tempPlugin.unload();
  }
}
