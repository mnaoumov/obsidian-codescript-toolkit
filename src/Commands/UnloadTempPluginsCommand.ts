import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/Commands/CommandBase';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/Commands/NonEditorCommandBase';

import type { Plugin } from '../Plugin.ts';

import { unloadTempPlugins } from '../TempPluginRegistry.ts';

class UnloadTempPluginsCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    unloadTempPlugins();
  }
}

export class UnloadTempPluginsCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'upload',
      id: 'unload-temp-plugins',
      name: 'Unload temp plugins',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new UnloadTempPluginsCommandInvocation(this.plugin);
  }
}
