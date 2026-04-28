import type { PlatformDependencies } from '../platform-dependencies.ts';

import { createRequireHandler } from '../require-handlers/require-handler-emulate-mobile.ts';
import { createScriptFolderWatcher } from '../script-folder-watchers/script-folder-watcher-emulate-mobile.ts';

export const platformDependencies: PlatformDependencies = {
  createRequireHandler,
  createScriptFolderWatcher
};
