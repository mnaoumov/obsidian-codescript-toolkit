import type { App } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { CodeScriptToolkitComponent } from '../code-script-toolkit-component.ts';
import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { selectAndInvokeScript } from '../script.ts';

interface InvokeScriptChooseCommandHandlerConstructorParams {
  app: App;
  codeScriptToolkitComponent: CodeScriptToolkitComponent;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export class InvokeScriptChooseCommandHandler extends GlobalCommandHandler {
  private readonly app: App;
  private readonly codeScriptToolkitComponent: CodeScriptToolkitComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: InvokeScriptChooseCommandHandlerConstructorParams) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>',
      pluginName: params.pluginName
    });
    this.app = params.app;
    this.codeScriptToolkitComponent = params.codeScriptToolkitComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  protected override async execute(): Promise<void> {
    await selectAndInvokeScript(this.codeScriptToolkitComponent, this.pluginSettingsComponent, this.app);
  }
}
