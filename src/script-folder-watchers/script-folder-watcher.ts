import type { App } from 'obsidian';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { ScriptManager } from '../script.ts';

export interface ScriptFolderWatcherComponentBaseConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly scriptManager: ScriptManager;
}

export abstract class ScriptFolderWatcherComponentBase extends ComponentEx {
  protected readonly app: App;
  protected readonly pluginNoticeComponent: PluginNoticeComponent;
  protected readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly scriptManager: ScriptManager;
  private wasRegisteredInPlugin = false;

  public constructor(params: ScriptFolderWatcherComponentBaseConstructorParams) {
    super();
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.scriptManager = params.scriptManager;
  }

  public override async onloadAsync(): Promise<void> {
    registerAsyncEvent(this, this.pluginSettingsComponent.on('loadSettings', this.applyNewSettings.bind(this)));
    registerAsyncEvent(this, this.pluginSettingsComponent.on('saveSettings', this.applyNewSettings.bind(this)));
    await this.applyNewSettings();
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
    await this.register2(() => this.scriptManager.registerInvocableScripts());
  }
}
