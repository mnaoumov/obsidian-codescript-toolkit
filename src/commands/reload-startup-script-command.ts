import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/commands/command-base';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/commands/non-editor-command-base';

import type { Plugin } from '../plugin.ts';

import { reloadStartupScript } from '../script.ts';

class ReloadStartupScriptCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    await reloadStartupScript(this.plugin);
  }
}

export class ReloadStartupScriptCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new ReloadStartupScriptCommandInvocation(this.plugin);
  }
}
