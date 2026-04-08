import type { Promisable } from 'type-fest';

import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { Plugin } from './Plugin.ts';

export abstract class ScriptFolderWatcher {
  protected get plugin(): Plugin {
    return ensureNonNullable(this._plugin);
  }

  private _plugin?: Plugin;

  private wasRegisteredInPlugin = false;

  public async register(plugin: Plugin, onChange: () => Promise<void>): Promise<void> {
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
