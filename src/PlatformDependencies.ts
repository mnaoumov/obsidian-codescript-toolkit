import {
  App,
  Platform
} from 'obsidian';

import type { FileSystemWrapper } from './FileSystemWrapper.ts';
import type { FixRequireModulesPlugin } from './FixRequireModulesPlugin.ts';

export interface PlatformDependencies {
  getFileSystemWrapper(app: App): FileSystemWrapper;
  registerScriptDirectoryWatcher: (plugin: FixRequireModulesPlugin, onChange: () => Promise<void>) => void;
}

export async function getPlatformDependencies(): Promise<PlatformDependencies> {
  return Platform.isMobile
    ? await import('./Mobile/MobileDependencies.ts') as PlatformDependencies
    : await import('./Desktop/DesktopDependencies.ts') as PlatformDependencies;
}
