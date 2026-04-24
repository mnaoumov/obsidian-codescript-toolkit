import type {
  App,
  PluginManifest
} from 'obsidian';

import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/plugin/components/plugin-settings-tab-component';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';

import { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import { ClearCacheCommandHandler } from './command-handlers/clear-cache-command-handler.ts';
import { InvokeScriptChooseCommandHandler } from './command-handlers/invoke-script-choose-command-handler.ts';
import { ReloadStartupScriptCommandHandler } from './command-handlers/reload-startup-script-command-handler.ts';
import { UnloadTempPluginsCommandHandler } from './command-handlers/unload-temp-plugins-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';

export class Plugin extends PluginBase {
  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    const pluginSettingsComponent = this.addChild(new PluginSettingsComponent(this, app));
    const codeScriptToolkitComponent = this.addChild(new CodeScriptToolkitComponent(app, pluginSettingsComponent, this.consoleDebugComponent, this));
    this.addChild(
      new PluginSettingsTabComponent(
        this,
        new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent
        }, this.manifest.name)
      )
    );
    this.addChild(
      new CommandHandlerComponent(this, new InvokeScriptChooseCommandHandler(codeScriptToolkitComponent, this.manifest.name, pluginSettingsComponent, this.app))
    );
    this.addChild(new CommandHandlerComponent(this, new UnloadTempPluginsCommandHandler(this.manifest.name)));
    this.addChild(new CommandHandlerComponent(this, new ClearCacheCommandHandler(this.manifest.name, pluginSettingsComponent, this.app)));
    this.addChild(
      new CommandHandlerComponent(this, new ReloadStartupScriptCommandHandler(this.app, this.manifest.name, pluginSettingsComponent))
    );
    this.addChild(new ProtocolHandlerComponent(codeScriptToolkitComponent, pluginSettingsComponent, this.app));
  }
}
