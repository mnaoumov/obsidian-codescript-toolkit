import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/commands/command-base';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/commands/non-editor-command-base';

import type { Plugin } from '../plugin.ts';

import { unloadTempPlugins } from '../temp-plugin-registry.ts';

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
