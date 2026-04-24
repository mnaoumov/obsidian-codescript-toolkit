import type { PlatformDependencies } from '../platform-dependencies.ts';

import { requireHandler } from './require-handler.ts';
import { scriptFolderWatcher } from './script-folder-watcher.ts';

export const platformDependencies: PlatformDependencies = {
  requireHandler,
  scriptFolderWatcher
};
