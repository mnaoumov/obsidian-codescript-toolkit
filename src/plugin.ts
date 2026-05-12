import type {
  App,
  PluginManifest
} from 'obsidian';

import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { OpenSettingsCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-settings-command-handler';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginMarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import { AppMenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import { PluginObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/plugin/components/plugin-settings-tab-component';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';

import { CodeButtonBlockComponent } from './code-button-block.ts';
import { CodeScriptBlockComponent } from './code-script-block.ts';
import { ClearCacheCommandHandler } from './command-handlers/clear-cache-command-handler.ts';
import { InvokeScriptChooseCommandHandler } from './command-handlers/invoke-script-choose-command-handler.ts';
import { ReloadStartupScriptCommandHandler } from './command-handlers/reload-startup-script-command-handler.ts';
import { UnloadTempPluginsCommandHandler } from './command-handlers/unload-temp-plugins-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';
import { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';
import { ScriptFolderWatcherFactory } from './script-folder-watchers/script-folder-watcher-factory.ts';
import { ScriptRegistry } from './script-registry.ts';
import { ScriptManager } from './script.ts';
import { StartupScriptComponent } from './startup-script.ts';
import { TempPluginRegistry } from './temp-plugin-registry.ts';

export class Plugin extends PluginBase {
  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);

    const markdownCodeBlockProcessorRegistrar = new PluginMarkdownCodeBlockProcessorRegistrar(this);
    const activeFileProvider = new AppActiveFileProvider(app);
    const commandRegistrar = new PluginCommandRegistrar(this);
    const menuEventRegistrar = new AppMenuEventRegistrar(app, this);

    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        app,
        dataHandler: new PluginDataHandler(this)
      })
    );

    const tempPluginRegistry = this.addChild(
      new TempPluginRegistry({
        activeFileProvider,
        app,
        commandRegistrar,
        menuEventRegistrar,
        pluginName: this.manifest.name,
        pluginSettingsComponent
      })
    );

    const requireHandlerFactory = this.addChild(
      new RequireHandlerFactory({
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
        pluginSettingsComponent,
        requireHandlerFactory
      })
    );

    const scriptRegistry = this.addChild(
      new ScriptRegistry({
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

    const scriptManager = new ScriptManager({
      app: this.app,
      consoleDebugComponent: this.consoleDebugComponent,
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
          new OpenSettingsCommandHandler(pluginSettingsTab),
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
        requireHandlerFactory
      })
    );

    this.addChild(
      new ScriptFolderWatcherFactory({
        app: this.app,
        pluginSettingsComponent,
        scriptManager
      })
    );

    this.addChild(
      new CodeButtonBlockComponent({
        app: this.app,
        markdownCodeBlockProcessorRegistrar,
        pluginSettingsComponent,
        requireHandlerFactory,
        tempPluginRegistry
      })
    );
  }
}
