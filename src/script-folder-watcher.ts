import type { App } from 'obsidian';
import type { Promisable } from 'type-fest';

import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

export interface ScriptFolderWatcherConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export abstract class ScriptFolderWatcher {
  protected readonly app: App;
  protected readonly pluginSettingsComponent: PluginSettingsComponent;

  protected get plugin(): CodeScriptToolkitComponent {
    return ensureNonNullable(this._plugin);
  }

  private _plugin?: CodeScriptToolkitComponent;

  private wasRegisteredInPlugin = false;

  public constructor(params: ScriptFolderWatcherConstructorParams) {
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  public async register(plugin: CodeScriptToolkitComponent, onChange: () => Promise<void>): Promise<void> {
    if (!this.wasRegisteredInPlugin) {
      this._plugin = plugin;
      this.plugin.register(this.stopWatcher.bind(this));
      this.wasRegisteredInPlugin = true;
    }

    this.stopWatcher();
    if (await this.startWatcher(onChange)) {
      await onChange();
    }

    this.plugin.register(this.stopWatcher.bind(this));
  }

  protected abstract startWatcher(onChange: () => Promise<void>): Promisable<boolean>;
  protected abstract stopWatcher(): void;
}
