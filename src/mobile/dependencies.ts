import type { PlatformDependencies } from '../platform-dependencies.ts';

import { createRequireHandler } from './require-handler.ts';
import { createScriptFolderWatcher } from './script-folder-watcher.ts';

export const platformDependencies: PlatformDependencies = {
  createRequireHandler,
  createScriptFolderWatcher
};
