import type { App } from 'obsidian';

import { convertAsyncToSync } from 'obsidian-dev-utils/async';

import { ScriptFolderWatcherComponentBase } from './script-folder-watcher.ts';

interface ModificationEntry {
  isChanged: boolean;
  modificationTime: number;
}

const MILLISECONDS_IN_SECOND = 1000;

export class ScriptFolderWatcherMobileComponent extends ScriptFolderWatcherComponentBase {
  private readonly modificationTimes = new Map<string, number>();

  private timeoutId: null | number = null;

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
    if (!invocableScriptsFolder) {
      return false;
    }

    if (!(await this.app.vault.exists(invocableScriptsFolder))) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      this.pluginNoticeComponent.showNotice(message);
      console.error(message);
      return false;
    }

    await this.watch(onChange);
    return true;
  }

  protected override stopWatcher(): void {
    this.modificationTimes.clear();
    if (this.timeoutId === null) {
      return;
    }
    window.clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private async checkFile(app: App, file: string): Promise<ModificationEntry> {
    const stat = await app.vault.adapter.stat(file);
    /* v8 ignore start -- stat returns null only for non-existent files which are filtered by the list call. */
    let modificationTime = stat?.mtime ?? 0;
    /* v8 ignore stop */
    let isUpdated = this.modificationTimes.get(file) !== modificationTime;

    if (stat?.type === 'folder') {
      const listedFiles = await app.vault.adapter.list(file);

      for (const subFile of [...listedFiles.files, ...listedFiles.folders]) {
        const subFileModificationEntry = await this.checkFile(app, subFile);
        if (subFileModificationEntry.isChanged) {
          isUpdated = true;
        }
        if (subFileModificationEntry.modificationTime > modificationTime) {
          modificationTime = subFileModificationEntry.modificationTime;
        }
      }
    }

    this.modificationTimes.set(file, modificationTime);
    return { isChanged: isUpdated, modificationTime };
  }

  private async watch(onChange: () => Promise<void>): Promise<void> {
    if (this.pluginSettingsComponent.settings.mobileChangesCheckingIntervalInSeconds === 0) {
      return;
    }

    const modificationEntry = await this.checkFile(this.app, this.pluginSettingsComponent.settings.getInvocableScriptsFolder());
    if (modificationEntry.isChanged) {
      await onChange();
    }

    this.timeoutId = window.setTimeout(
      convertAsyncToSync(async () => {
        await this.watch(onChange);
      }),
      this.pluginSettingsComponent.settings.mobileChangesCheckingIntervalInSeconds * MILLISECONDS_IN_SECOND
    );
  }
}
