import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/Commands/CommandBase';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/Commands/NonEditorCommandBase';

import type { Plugin } from '../Plugin.ts';

import { selectAndInvokeScript } from '../Script.ts';

class InvokeScriptChooseCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    await selectAndInvokeScript(this.plugin);
  }
}

export class InvokeScriptChooseCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new InvokeScriptChooseCommandInvocation(this.plugin);
  }
}
