import type {
  FSWatcher,
  WatchEventType
} from 'obsidian-dev-utils/ScriptUtils/NodeModules';

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
    this.watcher = watch(invocableScriptsFolderFullPath, { recursive: true }, (eventType: WatchEventType): void => {
      if (eventType === 'rename') {
        invokeAsyncSafely(async () => {
          const RETRY_COUNT = 5;
          const RETRY_DELAY_IN_MILLISECONDS = 100;
          let lastError: unknown = null;
          for (let i = 0; i < RETRY_COUNT; i++) {
            try {
              await onChange();
              return;
            } catch (error) {
              await sleep(RETRY_DELAY_IN_MILLISECONDS);
              lastError = error;
            }
          }
          throw lastError;
        });
      }
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
