import type { FSWatcher } from 'obsidian-dev-utils/ScriptUtils/NodeModules';

import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { join } from 'obsidian-dev-utils/Path';
import { watch } from 'obsidian-dev-utils/ScriptUtils/NodeModules';

import { ScriptFolderWatcher } from '../ScriptFolderWatcher.ts';

class ScriptFolderWatcherImpl extends ScriptFolderWatcher {
  private watcher: FSWatcher | null = null;

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    const invocableScriptsFolder = this.plugin?.settings.getInvocableScriptsFolder();
    if (!invocableScriptsFolder) {
      return false;
    }

    if (!(await this.plugin?.app.vault.exists(invocableScriptsFolder))) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      new Notice(message);
      console.error(message);
      return false;
    }

    const invocableScriptsFolderFullPath = join(this.plugin?.app.vault.adapter.basePath ?? '', invocableScriptsFolder);
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

export const scriptFolderWatcher: ScriptFolderWatcher = new ScriptFolderWatcherImpl();
