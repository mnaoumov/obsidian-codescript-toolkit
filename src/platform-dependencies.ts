import { Platform } from 'obsidian';

import type {
  RequireHandler,
  RequireHandlerConstructorParams
} from './require-handler.ts';
import type {
  ScriptFolderWatcher,
  ScriptFolderWatcherConstructorParams
} from './script-folder-watcher.ts';

export interface PlatformDependencies {
  createRequireHandler(params: RequireHandlerConstructorParams): RequireHandler;
  createScriptFolderWatcher(params: ScriptFolderWatcherConstructorParams): ScriptFolderWatcher;
}

interface PlatformDependenciesModule {
  platformDependencies: PlatformDependencies;
}

export async function getPlatformDependencies(): Promise<PlatformDependencies> {
  let module: PlatformDependenciesModule;
  // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document.
  if (document.body.hasClass('emulate-mobile')) {
    // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
    module = await import('./emulate-mobile/dependencies.ts');
  } else if (Platform.isMobile) {
    // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
    module = await import('./mobile/dependencies.ts');
  } else {
    // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
    module = await import('./desktop/dependencies.ts');
  }

  return module.platformDependencies;
}
