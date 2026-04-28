import type {
  App,
  PluginManifest
} from 'obsidian';

import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginMarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import { AppMenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import { PluginObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
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
import { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';
import { ScriptFolderWatcherFactory } from './script-folder-watchers/script-folder-watcher-factory.ts';

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

    const requireHandlerFactory = this.addChild(
      new RequireHandlerFactory({
        activeFileProvider,
        app: this.app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginRequire: require,
        pluginSettingsComponent
      })
    );

    const codeScriptToolkitComponent = this.addChild(
      new CodeScriptToolkitComponent({
        activeFileProvider,
        app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        markdownCodeBlockProcessorRegistrar,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginSettingsComponent,
        requireHandlerFactory
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
            pluginName: this.manifest.name,
            requireHandlerFactory
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
            pluginSettingsComponent,
            requireHandlerFactory
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
        obsidianProtocolHandlerRegistrar: new PluginObsidianProtocolHandlerRegistrar(this),
        pluginName: this.manifest.name,
        pluginSettingsComponent,
        requireHandlerFactory
      })
    );
    this.addChild(
      new ScriptFolderWatcherFactory({
        activeFileProvider,
        app: this.app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginSettingsComponent,
        requireHandlerFactory
      })
    );
  }
}
