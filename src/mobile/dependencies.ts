import type { PlatformDependencies } from '../platform-dependencies.ts';

import { createRequireHandler } from './require-handler.ts';
import { createScriptFolderWatcher } from '../script-folder-watchers/script-folder-watcher-mobile.ts';

export const platformDependencies: PlatformDependencies = {
  createRequireHandler,
  createScriptFolderWatcher
};
