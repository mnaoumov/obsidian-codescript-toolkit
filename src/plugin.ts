import type {
  App,
  PluginManifest
} from 'obsidian';

import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { AppMenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
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
import { PluginMarkdownCodeBlockProcessorRegistrar } from './markdown-code-block-processor-registrar.ts';
import { PluginObsidianProtocolHandlerRegistrar } from './obsidian-protocol-handler-registrar.ts';

export class Plugin extends PluginBase {
  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    const markdownCodeBlockProcessorRegistrar = new PluginMarkdownCodeBlockProcessorRegistrar(this);
    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        app,
        dataHandler: new PluginDataHandler(this)
      })
    );
    const activeFileProvider = new AppActiveFileProvider(app);
    const commandRegistrar = new PluginCommandRegistrar(this);
    const menuEventRegistrar = new AppMenuEventRegistrar(app, this);
    const codeScriptToolkitComponent = this.addChild(
      new CodeScriptToolkitComponent({
        activeFileProvider,
        app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar,
        plugin: this,
        pluginName: this.manifest.name,
        pluginSettingsComponent,
        markdownCodeBlockProcessorRegistrar
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
        activeFileProvider,
        commandHandlers: [
          new ClearCacheCommandHandler({
            activeFileProvider,
            app: this.app,
            commandRegistrar,
            consoleDebugComponent: this.consoleDebugComponent,
            menuEventRegistrar,
            pluginName: this.manifest.name,
            pluginSettingsComponent
          }),
          new InvokeScriptChooseCommandHandler({
            app: this.app,
            codeScriptToolkitComponent,
            consoleDebugComponent: this.consoleDebugComponent,
            pluginName: this.manifest.name,
            pluginSettingsComponent
          }),
          new ReloadStartupScriptCommandHandler({
            activeFileProvider,
            app: this.app,
            commandRegistrar,
            consoleDebugComponent: this.consoleDebugComponent,
            menuEventRegistrar,
            pluginName: this.manifest.name,
            pluginSettingsComponent
          }),
          new UnloadTempPluginsCommandHandler(this.manifest.name)
        ],
        commandRegistrar,
        menuEventRegistrar
      })
    );
    this.addChild(
      new ProtocolHandlerComponent({
        activeFileProvider,
        app: this.app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginSettingsComponent,
        obsidianProtocolHandlerRegistrar: new PluginObsidianProtocolHandlerRegistrar(this)
      })
    );
  }
}
