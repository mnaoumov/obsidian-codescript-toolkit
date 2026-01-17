import type { Plugin as ObsidianPlugin } from 'obsidian';

import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/Commands/CommandBase';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/Commands/NonEditorCommandBase';

import type { Plugin } from '../Plugin.ts';

class UnloadTempPluginCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin, private readonly tempPlugin: ObsidianPlugin) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    this.tempPlugin.unload();
  }
}

export class UnloadTempPluginCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin, private readonly tempPlugin: ObsidianPlugin, tempPluginClassName: string) {
    super({
      icon: 'unlink',
      id: `unregister-temp-plugin-${tempPluginClassName}`,
      name: `Unregister Temp Plugin: ${tempPluginClassName}`,
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new UnloadTempPluginCommandInvocation(this.plugin, this.tempPlugin);
  }
}
