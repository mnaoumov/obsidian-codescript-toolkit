import type { CodeScriptToolkitComponent } from '../code-script-toolkit-component.ts';
import { selectAndInvokeScript } from '../script.ts';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

export class InvokeScriptChooseCommandHandler extends GlobalCommandHandler {
  protected override async execute(): Promise<void> {
    await selectAndInvokeScript(this.plugin);
  }
  public constructor(private readonly plugin: CodeScriptToolkitComponent, pluginName: string) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>',
      pluginName
    });
  }
}
