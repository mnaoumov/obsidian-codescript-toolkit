import { Platform } from 'obsidian';
import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type {
  ScriptFolderWatcher,
  ScriptFolderWatcherConstructorParams
} from './script-folder-watcher.ts';

export class ScriptFolderWatcherFactory extends AsyncComponentBase {
  public get platformScriptFolderWatcher(): ScriptFolderWatcher {
    return ensureNonNullable(this._platformScriptFolderWatcher);
  }

  private _platformScriptFolderWatcher?: ScriptFolderWatcher;

  public constructor(private readonly params: ScriptFolderWatcherConstructorParams) {
    super();
  }

  public override async onload(): Promise<void> {
    await super.onload();

    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document.
    if (document.body.hasClass('emulate-mobile') || Platform.isMobile) {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformScriptFolderWatcher = new (await import('./script-folder-watcher-mobile.ts')).ScriptFolderWatcherMobile(this.params);
    } else {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformScriptFolderWatcher = new (await import('./script-folder-watcher-desktop.ts')).ScriptFolderWatcherDesktop(this.params);
    }

    this.addChild(this._platformScriptFolderWatcher);
  }
}
