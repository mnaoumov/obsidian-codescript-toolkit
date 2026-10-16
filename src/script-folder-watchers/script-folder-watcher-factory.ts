import { ComponentEx } from '@mnaoumov/obsidian-lib/components/component-ex';
import { ensureNonNullable } from '@mnaoumov/typescript-lib/type-guards';
import { Platform } from 'obsidian';

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
    if (document.body.hasClass('emulate-mobile') || Platform.isMobile) {
      const mobileModule = await import('./mobile-script-folder-watcher.ts');
      this._platformScriptFolderWatcher = new mobileModule.ScriptFolderWatcherMobileComponent(this.params);
    } else {
      const desktopModule = await import('./desktop-script-folder-watcher.ts');
      this._platformScriptFolderWatcher = new desktopModule.ScriptFolderWatcherDesktopComponent(this.params);
    }

    this.addChild(this.platformScriptFolderWatcher);
  }
}
