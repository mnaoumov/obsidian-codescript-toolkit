import { Platform } from 'obsidian';

import type { RequireHandler } from './require-handler.ts';
import type { ScriptFolderWatcher } from './script-folder-watcher.ts';

export interface PlatformDependencies {
  requireHandler: RequireHandler;
  scriptFolderWatcher: ScriptFolderWatcher;
}

interface PlatformDependenciesModule {
  platformDependencies: PlatformDependencies;
}

export async function getPlatformDependencies(): Promise<PlatformDependencies> {
  let module: PlatformDependenciesModule;
  if (document.body.hasClass('emulate-mobile')) {
    module = await import('./emulate-mobile/dependencies.ts');
  } else if (Platform.isMobile) {
    module = await import('./mobile/dependencies.ts');
  } else {
    module = await import('./desktop/dependencies.ts');
  }

  return module.platformDependencies;
}
