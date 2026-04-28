import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { StartupScriptComponent } from '../startup-script.ts';

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly startupScriptComponent: StartupScriptComponent) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script'
    });
  }

  public override async execute(): Promise<void> {
    await this.startupScriptComponent.reloadStartupScript();
  }
}
