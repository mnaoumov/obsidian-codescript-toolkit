import { convertAsyncToSync } from '@mnaoumov/typescript-lib/async';
import { join } from '@mnaoumov/typescript-lib/path';
import { getDataAdapterEx } from '@obsidian-typings/obsidian-public-latest/implementations';
import { Platform } from 'obsidian';

import { ScriptFolderWatcherComponentBase } from './script-folder-watcher.ts';

type FSWatcher = import('node:fs').FSWatcher;

export class ScriptFolderWatcherDesktopComponent extends ScriptFolderWatcherComponentBase {
  private watcher: FSWatcher | null = null;

  protected override async startWatcher(onChange: () => Promise<void>): Promise<boolean> {
    // `node:fs` is loaded here, behind the guard, rather than imported statically: a static import of a Node built-in
    // cannot be guarded, and the community scanner flags it as unavailable on mobile. It is `require` and not `import()`
    // because the bundle keeps `import()` as a native dynamic import, which the renderer cannot resolve for `node:fs`.
    if (!Platform.isDesktop) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- See above: `import()` does not load `node:fs` in the bundle.
    const { watch } = require('node:fs') as typeof import('node:fs');

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

    const adapter = getDataAdapterEx(this.app);

    const invocableScriptsFolderFullPath = join(adapter.basePath, invocableScriptsFolder);
    this.watcher = watch(
      invocableScriptsFolderFullPath,
      { recursive: true },
      convertAsyncToSync(async (): Promise<void> => {
        try {
          this.stopWatcher();
          await onChange();
        } finally {
          const DELAY_BEFORE_RESTART_IN_MILLISECONDS = 100;
          await sleep(DELAY_BEFORE_RESTART_IN_MILLISECONDS);
          await this.startWatcher(onChange);
        }
      })
    );

    return true;
  }

  protected override stopWatcher(): void {
    if (!this.watcher) {
      return;
    }

    this.watcher.close();
    this.watcher = null;
  }
}
