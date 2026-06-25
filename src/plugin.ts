import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { OpenSettingsCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-settings-command-handler';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { MenuEventRegistrarComponent } from 'obsidian-dev-utils/obsidian/components/menu-event-registrar-component';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginMarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import { PluginObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';

import { CodeButtonBlockComponent } from './code-button-block.ts';
import { CodeScriptBlockComponent } from './code-script-block.ts';
import { ClearCacheCommandHandler } from './command-handlers/clear-cache-command-handler.ts';
import { InvokeScriptChooseCommandHandler } from './command-handlers/invoke-script-choose-command-handler.ts';
import { ReloadStartupScriptCommandHandler } from './command-handlers/reload-startup-script-command-handler.ts';
import { UnloadTempPluginsCommandHandler } from './command-handlers/unload-temp-plugins-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';
import { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import { ScriptFolderWatcherFactoryComponent } from './script-folder-watchers/script-folder-watcher-factory.ts';
import { ScriptRegistryComponent } from './script-registry.ts';
import { ScriptManager } from './script.ts';
import { StartupScriptComponent } from './startup-script.ts';
import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

export class Plugin extends PluginBase {
  protected override onloadImpl(): void {
    const markdownCodeBlockProcessorRegistrar = new PluginMarkdownCodeBlockProcessorRegistrar(this);
    const activeFileProvider = new AppActiveFileProvider(this.app);
    const commandRegistrar = new PluginCommandRegistrar(this);
    const menuEventRegistrar = this.addChild(new MenuEventRegistrarComponent(this.app));

    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        app: this.app,
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );

    const tempPluginRegistry = this.addChild(
      new TempPluginRegistryComponent({
        activeFileProvider,
        app: this.app,
        commandRegistrar,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent
      })
    );

    const requireHandlerFactory = this.addChild(
      new RequireHandlerFactoryComponent({
        app: this.app,
        consoleDebugComponent: this.consoleDebugComponent,
        pluginRequire: require,
        pluginSettingsComponent,
        tempPluginRegistry
      })
    );

    const startupScriptComponent = this.addChild(
      new StartupScriptComponent({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        requireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    const scriptRegistry = this.addChild(
      new ScriptRegistryComponent({
        activeFileProvider,
        app: this.app,
        commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    const scriptManager = new ScriptManager({
      app: this.app,
      consoleDebugComponent: this.consoleDebugComponent,
      pluginNoticeComponent: this.pluginNoticeComponent,
      pluginSettingsComponent,
      scriptRegistry
    });

    this.addChild(new CodeScriptBlockComponent());

    const pluginSettingsTab = new PluginSettingsTab({
      plugin: this,
      pluginName: this.manifest.name,
      pluginSettingsComponent
    });

    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab
      })
    );

    this.addChild(
      new CommandHandlerComponent({
        activeFileProvider,
        commandHandlers: [
          new ClearCacheCommandHandler(requireHandlerFactory),
          new InvokeScriptChooseCommandHandler(scriptManager),
          new OpenSettingsCommandHandler({
            app: this.app,
            settingTab: pluginSettingsTab
          }),
          new ReloadStartupScriptCommandHandler(startupScriptComponent),
          new UnloadTempPluginsCommandHandler(tempPluginRegistry)
        ],
        commandRegistrar,
        menuEventRegistrar,
        pluginName: this.manifest.name
      })
    );

    this.addChild(
      new ProtocolHandlerComponent({
        consoleDebugComponent: this.consoleDebugComponent,
        obsidianProtocolHandlerRegistrar: new PluginObsidianProtocolHandlerRegistrar(this),
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    this.addChild(
      new ScriptFolderWatcherFactoryComponent({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        scriptManager
      })
    );

    this.addChild(
      new CodeButtonBlockComponent({
        app: this.app,
        markdownCodeBlockProcessorRegistrar,
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory,
        tempPluginRegistry
      })
    );
  }
}
