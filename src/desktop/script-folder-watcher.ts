// eslint-disable-next-line import/no-nodejs-modules, import-x/no-nodejs-modules -- Deliberate, executes only on desktop.
import type { FSWatcher } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules, import-x/no-nodejs-modules -- Deliberate, executes only on desktop.
import { watch } from 'node:fs';
import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { join } from 'obsidian-dev-utils/path';
import { getDataAdapterEx } from 'obsidian-typings/implementations';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { ScriptFolderWatcher } from '../script-folder-watcher.ts';

class ScriptFolderWatcherImpl extends ScriptFolderWatcher {
  private watcher: FSWatcher | null = null;

  public constructor(private readonly pluginSettingsComponent: PluginSettingsComponent) {
    super();
  }

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
    if (!invocableScriptsFolder) {
      return false;
    }

    if (!(await this.plugin.app.vault.exists(invocableScriptsFolder))) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      new Notice(message);
      console.error(message);
      return false;
    }

    const adapter = getDataAdapterEx(this.plugin.app);

    const invocableScriptsFolderFullPath = join(adapter.basePath, invocableScriptsFolder);
    this.watcher = watch(invocableScriptsFolderFullPath, { recursive: true }, (): void => {
      invokeAsyncSafely(async () => {
        try {
          this.stopWatcher();
          await onChange();
        } finally {
          const DELAY_BEFORE_RESTART_IN_MILLISECONDS = 100;
          await sleep(DELAY_BEFORE_RESTART_IN_MILLISECONDS);
          await this.startWatcher(onChange);
        }
      });
    });

    return true;
  }

  protected override stopWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export function createScriptFolderWatcher(pluginSettingsComponent: PluginSettingsComponent): ScriptFolderWatcher {
  return new ScriptFolderWatcherImpl(pluginSettingsComponent);
}
