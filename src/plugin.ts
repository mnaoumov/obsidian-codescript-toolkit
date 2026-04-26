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
    const pluginSettingsComponent = this.addChild(new PluginSettingsComponent({ app, loadData: this.loadData.bind(this), saveData: this.saveData.bind(this) }));
    const codeScriptToolkitComponent = this.addChild(
      new CodeScriptToolkitComponent({
        app,
        consoleDebugComponent: this.consoleDebugComponent,
        plugin: this,
        pluginSettingsComponent
      })
    );
    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginName: this.manifest.name,
          pluginSettingsComponent
        })
      })
    );
    this.addChild(
      new CommandHandlerComponent({
        commandHandler: new InvokeScriptChooseCommandHandler({
          app: this.app,
          plugin: codeScriptToolkitComponent,
          pluginName: this.manifest.name,
          pluginSettingsComponent
        }),
        plugin: this
      })
    );
    this.addChild(
      new CommandHandlerComponent({
        commandHandler: new UnloadTempPluginsCommandHandler(this.manifest.name),
        plugin: this
      })
    );
    this.addChild(
      new CommandHandlerComponent({
        commandHandler: new ClearCacheCommandHandler({
          app: this.app,
          pluginName: this.manifest.name,
          pluginSettingsComponent
        }),
        plugin: this
      })
    );
    this.addChild(
      new CommandHandlerComponent({
        commandHandler: new ReloadStartupScriptCommandHandler({
          app: this.app,
          pluginName: this.manifest.name,
          pluginSettingsComponent
        }),
        plugin: this
      })
    );
    this.addChild(
      new ProtocolHandlerComponent({
        app: this.app,
        plugin: codeScriptToolkitComponent,
        pluginSettingsComponent
      })
    );
  }
}
