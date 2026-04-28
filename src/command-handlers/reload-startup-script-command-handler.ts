import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { StartupScriptComponent } from '../startup-script.ts';

interface ReloadStartupScriptCommandHandlerConstructorParams {
  readonly pluginName: string;
  readonly startupScriptComponent: StartupScriptComponent;
}

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  private readonly startupScriptComponent: StartupScriptComponent;

  public constructor(params: ReloadStartupScriptCommandHandlerConstructorParams) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script'
    });
    this.startupScriptComponent = params.startupScriptComponent;
  }

  public override async execute(): Promise<void> {
    await this.startupScriptComponent.reloadStartupScript();
  }
}
