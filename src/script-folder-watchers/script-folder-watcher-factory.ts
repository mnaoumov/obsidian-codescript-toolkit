import { Platform } from 'obsidian';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type {
  ScriptFolderWatcherComponentBase,
  ScriptFolderWatcherComponentBaseConstructorParams
} from './script-folder-watcher.ts';

export class ScriptFolderWatcherFactoryComponent extends ComponentEx {
  private _platformScriptFolderWatcher?: ScriptFolderWatcherComponentBase;

  private get platformScriptFolderWatcher(): ScriptFolderWatcherComponentBase {
    return ensureNonNullable(this._platformScriptFolderWatcher);
  }

  public constructor(private readonly params: ScriptFolderWatcherComponentBaseConstructorParams) {
    super();
  }

  public override async onloadAsync(): Promise<void> {
    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document.
    if (document.body.hasClass('emulate-mobile') || Platform.isMobile) {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformScriptFolderWatcher = new (await import('./script-folder-watcher-mobile.ts')).ScriptFolderWatcherMobileComponent(this.params);
    } else {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformScriptFolderWatcher = new (await import('./script-folder-watcher-desktop.ts')).ScriptFolderWatcherDesktopComponent(this.params);
    }

    this.addChild(this.platformScriptFolderWatcher);
  }
}
