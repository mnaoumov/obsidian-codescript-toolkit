import type { App } from 'obsidian';

import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';

import { ScriptDirectoryWatcher } from '../ScriptDirectoryWatcher.ts';

interface ModificationEntry {
  isChanged: boolean;
  modificationTime: number;
}

const MILLISECONDS_IN_SECOND = 1000;

class ScriptDirectoryWatcherImpl extends ScriptDirectoryWatcher {
  private modificationTimes = new Map<string, number>();
  private timeoutId: null | number = null;

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    const invocableScriptsDirectory = this.plugin.settingsCopy.getInvocableScriptsDirectory();
    if (!invocableScriptsDirectory) {
      return false;
    }

    if (!(await this.plugin.app.vault.exists(invocableScriptsDirectory))) {
      const message = `Invocable scripts folder not found: ${invocableScriptsDirectory}`;
      new Notice(message);
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
    let modificationTime = stat?.mtime ?? 0;
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
    const modificationEntry = await this.checkFile(this.plugin.app, this.plugin.settingsCopy.getInvocableScriptsDirectory());
    if (modificationEntry.isChanged) {
      await onChange();
    }

    this.timeoutId = window.setTimeout(
      () => { invokeAsyncSafely(() => this.watch(onChange)); },
      this.plugin.settingsCopy.mobileChangesCheckingIntervalInSeconds * MILLISECONDS_IN_SECOND
    );
  }
}

export const scriptDirectoryWatcher = new ScriptDirectoryWatcherImpl();
