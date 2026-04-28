import type {
  App,
  Plugin
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/plugin/components/layout-ready-component';

import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandler } from './require-handler.ts';
import type { ScriptFolderWatcher } from './script-folder-watcher.ts';

import { registerCodeButtonBlock } from './code-button-block.ts';
import { registerCodeScriptBlock } from './code-script-block.ts';
import { getPlatformDependencies } from './platform-dependencies.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts
} from './script.ts';
import type { MarkdownCodeBlockProcessorRegistrar } from './markdown-code-block-processor-registrar.ts';

interface CodeScriptToolkitComponentConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly plugin: Plugin;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
}

export class CodeScriptToolkitComponent extends AsyncComponentBase implements LayoutReadyComponent {
  private readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;

  private readonly menuEventRegistrar: MenuEventRegistrar;

  private readonly plugin: Plugin;
  private readonly pluginName: string;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private requireHandler?: RequireHandler;
  private scriptFolderWatcher?: ScriptFolderWatcher;

  public constructor(params: CodeScriptToolkitComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.plugin = params.plugin;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.markdownCodeBlockProcessorRegistrar = params.markdownCodeBlockProcessorRegistrar;
  }

  public async onLayoutReady(): Promise<void> {
    await invokeStartupScript({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
    this.register(() => cleanupStartupScript(this.app));

    registerAsyncEvent(this, this.pluginSettingsComponent.on('loadSettings', this.applyNewSettings.bind(this)));
    registerAsyncEvent(this, this.pluginSettingsComponent.on('saveSettings', this.applyNewSettings.bind(this)));
  }

  public override async onload(): Promise<void> {
    await super.onload();
    const platformDependencies = await getPlatformDependencies();
    this.scriptFolderWatcher = platformDependencies.createScriptFolderWatcher({ app: this.app, pluginSettingsComponent: this.pluginSettingsComponent });
    this.requireHandler = platformDependencies.createRequireHandler({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
    this.requireHandler.register(this, require);

    registerCodeButtonBlock({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      codeScriptToolkitComponent: this,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent,
      markdownCodeBlockProcessorRegistrar: this.markdownCodeBlockProcessorRegistrar
    });
    await registerCodeScriptBlock(this);
  }

  public removeCommand(commandId: string): void {
    this.plugin.removeCommand(commandId);
  }

  private async applyNewSettings(): Promise<void> {
    await this.scriptFolderWatcher?.register(this, () =>
      registerInvocableScripts({
        activeFileProvider: this.activeFileProvider,
        app: this.app,
        commandRegistrar: this.commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar: this.menuEventRegistrar,
        pluginName: this.pluginName,
        pluginSettingsComponent: this.pluginSettingsComponent
      }));
  }
}
