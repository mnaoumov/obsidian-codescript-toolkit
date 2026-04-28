import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { ScriptManager } from '../script.ts';

export class InvokeScriptChooseCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly scriptManager: ScriptManager) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>'
    });
  }

  protected override async execute(): Promise<void> {
    await this.scriptManager.selectAndInvokeScript();
  }
}
