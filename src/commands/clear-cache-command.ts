import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/commands/command-base';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/commands/non-editor-command-base';

import type { Plugin } from '../plugin.ts';

import { getPlatformDependencies } from '../platform-dependencies.ts';

class ClearCacheCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    platformDependencies.requireHandler.clearCache();
  }
}

export class ClearCacheCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new ClearCacheCommandInvocation(this.plugin);
  }
}
