import type { App } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { reloadStartupScript } from '../script.ts';

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  public constructor(
    private readonly app: App,
    pluginName: string,
    private readonly pluginSettingsComponent: PluginSettingsComponent
  ) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script',
      pluginName
    });
  }

  public override async execute(): Promise<void> {
    await reloadStartupScript(this.pluginSettingsComponent, this.app);
  }
}
