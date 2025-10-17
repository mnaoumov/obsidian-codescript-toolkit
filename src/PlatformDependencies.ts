import { Platform } from 'obsidian';

import type { RequireHandler } from './RequireHandler.ts';
import type { ScriptFolderWatcher } from './ScriptFolderWatcher.ts';

export interface PlatformDependencies {
  requireHandler: RequireHandler;
  scriptFolderWatcher: ScriptFolderWatcher;
}

export async function getPlatformDependencies(): Promise<PlatformDependencies> {
  let module: { platformDependencies: PlatformDependencies };
  if (document.body.hasClass('emulate-mobile')) {
    module = await import('./EmulateMobile/Dependencies.ts');
  } else if (Platform.isMobile) {
    module = await import('./Mobile/Dependencies.ts');
  } else {
    module = await import('./Desktop/Dependencies.ts');
  }

  return module.platformDependencies;
}
