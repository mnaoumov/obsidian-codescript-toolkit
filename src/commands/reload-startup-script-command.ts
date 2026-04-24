import { reloadStartupScript } from '../script.ts';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';
import type { CodeScriptToolkitComponent } from '../code-script-toolkit-component.ts';

export class ReloadStartupScriptCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly plugin: CodeScriptToolkitComponent, pluginName: string) {
    super({
      icon: 'upload',
      id: 'reload-startup-script',
      name: 'Reload startup script',
      pluginName
    });
  }

  public override async execute(): Promise<void> {
    await reloadStartupScript(this.plugin);
  }
}
