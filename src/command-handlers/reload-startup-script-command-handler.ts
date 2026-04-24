import type { App } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { reloadStartupScript } from '../script.ts';

interface ReloadStartupScriptCommandHandlerConstructorParams {
  app: App;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  private readonly app: App;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: ReloadStartupScriptCommandHandlerConstructorParams) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script',
      pluginName: params.pluginName
    });
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  public override async execute(): Promise<void> {
    await reloadStartupScript(this.pluginSettingsComponent, this.app);
  }
}
