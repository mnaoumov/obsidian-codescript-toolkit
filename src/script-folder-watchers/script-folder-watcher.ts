import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { Promisable } from 'type-fest';

import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { RequireHandlerFactory } from '../require-handlers/require-handler-factory.ts';

import { registerInvocableScripts } from '../script.ts';

export interface ScriptFolderWatcherConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export abstract class ScriptFolderWatcher extends AsyncComponentBase {
  protected readonly app: App;
  protected readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly requireHandlerFactory: RequireHandlerFactory;
  private wasRegisteredInPlugin = false;
  public constructor(params: ScriptFolderWatcherConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.requireHandlerFactory = params.requireHandlerFactory;
  }

  public override async onload(): Promise<void> {
    await super.onload();
    registerAsyncEvent(this, this.pluginSettingsComponent.on('loadSettings', this.applyNewSettings.bind(this)));
    registerAsyncEvent(this, this.pluginSettingsComponent.on('saveSettings', this.applyNewSettings.bind(this)));
  }

  public async register2(onChange: () => Promise<void>): Promise<void> {
    if (!this.wasRegisteredInPlugin) {
      this.register(this.stopWatcher.bind(this));
      this.wasRegisteredInPlugin = true;
    }

    this.stopWatcher();
    if (await this.startWatcher(onChange)) {
      await onChange();
    }

    this.register(this.stopWatcher.bind(this));
  }

  protected abstract startWatcher(onChange: () => Promise<void>): Promisable<boolean>;

  protected abstract stopWatcher(): void;
  private async applyNewSettings(): Promise<void> {
    await this.register2(() =>
      registerInvocableScripts({
        activeFileProvider: this.activeFileProvider,
        app: this.app,
        commandRegistrar: this.commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar: this.menuEventRegistrar,
        pluginName: this.pluginName,
        pluginSettingsComponent: this.pluginSettingsComponent,
        requireHandlerFactory: this.requireHandlerFactory
      })
    );
  }
}
