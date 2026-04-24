import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { CodeScriptToolkitComponent } from '../code-script-toolkit-component.ts';
import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { selectAndInvokeScript } from '../script.ts';

export class InvokeScriptChooseCommandHandler extends GlobalCommandHandler {
  public constructor(
    private readonly plugin: CodeScriptToolkitComponent,
    pluginName: string,
    private readonly pluginSettingsComponent: PluginSettingsComponent
  ) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>',
      pluginName
    });
  }

  protected override async execute(): Promise<void> {
    await selectAndInvokeScript(this.plugin, this.pluginSettingsComponent);
  }
}
