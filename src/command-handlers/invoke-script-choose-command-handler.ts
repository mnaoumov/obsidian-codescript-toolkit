import type { App } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { selectAndInvokeScript } from '../script.ts';

interface InvokeScriptChooseCommandHandlerConstructorParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export class InvokeScriptChooseCommandHandler extends GlobalCommandHandler {
  private readonly app: App;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  public constructor(params: InvokeScriptChooseCommandHandlerConstructorParams) {
    super({
      icon: 'circle-play',
      id: 'invoke-script',
      name: 'Invoke script: <<Choose>>'
    });
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
  }

  protected override async execute(): Promise<void> {
    await selectAndInvokeScript({
      app: this.app,
      consoleDebugComponent: this.consoleDebugComponent,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }
}
