// eslint-disable-next-line import/no-nodejs-modules, import-x/no-nodejs-modules -- Deliberate, executes only on desktop.
import type { FSWatcher } from 'node:fs';

import { getDataAdapterEx } from '@obsidian-typings/obsidian-public-latest/implementations';
// eslint-disable-next-line import/no-nodejs-modules, import-x/no-nodejs-modules -- Deliberate, executes only on desktop.
import { watch } from 'node:fs';
import { Notice } from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { join } from 'obsidian-dev-utils/path';

import type { ScriptFolderWatcherComponentBaseConstructorParams } from './script-folder-watcher.ts';

import { ScriptFolderWatcherComponentBase } from './script-folder-watcher.ts';

type CreateScriptFolderWatcherParams = ScriptFolderWatcherComponentBaseConstructorParams;

export class ScriptFolderWatcherDesktopComponent extends ScriptFolderWatcherComponentBase {
  private watcher: FSWatcher | null = null;

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
    if (!invocableScriptsFolder) {
      return false;
    }

    if (!(await this.app.vault.exists(invocableScriptsFolder))) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      new Notice(message);
      console.error(message);
      return false;
    }

    const adapter = getDataAdapterEx(this.app);

    const invocableScriptsFolderFullPath = join(adapter.basePath, invocableScriptsFolder);
    this.watcher = watch(invocableScriptsFolderFullPath, { recursive: true }, convertAsyncToSync(async (): Promise<void> => {
      try {
        this.stopWatcher();
        await onChange();
      } finally {
        const DELAY_BEFORE_RESTART_IN_MILLISECONDS = 100;
        await sleep(DELAY_BEFORE_RESTART_IN_MILLISECONDS);
        await this.startWatcher(onChange);
      }
    }));

    return true;
  }

  protected override stopWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export function createScriptFolderWatcher(params: CreateScriptFolderWatcherParams): ScriptFolderWatcherComponentBase {
  return new ScriptFolderWatcherDesktopComponent(params);
}
