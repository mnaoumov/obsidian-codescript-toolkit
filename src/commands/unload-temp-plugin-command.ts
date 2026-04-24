import type { Plugin as ObsidianPlugin } from 'obsidian';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

export class UnloadTempPluginCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly tempPlugin: ObsidianPlugin, tempPluginClassName: string, pluginName: string) {
    super({
      icon: 'unlink',
      id: `unregister-temp-plugin-${tempPluginClassName}`,
      name: `Unregister Temp Plugin: ${tempPluginClassName}`,
      pluginName
    });
  }

  public override async execute(): Promise<void> {
    this.tempPlugin.unload();
  }
}
