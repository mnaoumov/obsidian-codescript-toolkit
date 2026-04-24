import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';


import type { App, PluginManifest } from 'obsidian';
import { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/plugin/components/plugin-settings-tab-component';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { InvokeScriptChooseCommandHandler } from './commands/invoke-script-choose-command.ts';
import { ClearCacheCommandHandler as ClearCacheCommandHandler } from './commands/clear-cache-command.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';
import { UnloadTempPluginsCommandHandler as UnloadTempPluginsCommandHandler } from './commands/unload-temp-plugins-command.ts';
import { ReloadStartupScriptCommandHandler as ReloadStartupScriptCommandHandler } from './commands/reload-startup-script-command.ts';

export class Plugin extends PluginBase {
  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    const pluginSettingsComponent = this.addChild(new PluginSettingsComponent(this, app));
    const codeScriptToolkitComponent = this.addChild(new CodeScriptToolkitComponent(app, pluginSettingsComponent, this.consoleDebugComponent, this));
    this.addChild(new PluginSettingsTabComponent(this, new PluginSettingsTab({
      plugin: this,
      pluginSettingsComponent
    }, this.manifest.name)));
    this.addChild(new CommandHandlerComponent(this, new InvokeScriptChooseCommandHandler(codeScriptToolkitComponent, this.manifest.name)))
    this.addChild(new CommandHandlerComponent(this, new UnloadTempPluginsCommandHandler(this.manifest.name)))
    this.addChild(new CommandHandlerComponent(this, new ClearCacheCommandHandler(this.manifest.name)))
    this.addChild(new CommandHandlerComponent(this, new ReloadStartupScriptCommandHandler(codeScriptToolkitComponent, this.manifest.name)))
    this.addChild(new ProtocolHandlerComponent(codeScriptToolkitComponent))
  }
}
