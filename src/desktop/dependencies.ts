import type { PlatformDependencies } from '../platform-dependencies.ts';

import { createRequireHandler } from '../require-handlers/require-handler-desktop.ts';
import { createScriptFolderWatcher } from '../script-folder-watchers/script-folder-watcher-desktop.ts';

export const platformDependencies: PlatformDependencies = {
  createRequireHandler,
  createScriptFolderWatcher
};
