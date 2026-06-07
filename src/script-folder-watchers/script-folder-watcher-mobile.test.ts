import type {
  App,
  ListedFiles,
  Stat
} from 'obsidian';
import type { Mock } from 'vitest';

import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { ScriptManager } from '../script.ts';

import { ScriptFolderWatcherMobileComponent } from './script-folder-watcher-mobile.ts';

const mockSuperOnload = vi.fn();
const mockRegisterAsyncEvent = vi.fn();
const registeredCallbacks: (() => void)[] = [];

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Notice: vi.fn()
}));

vi.mock('obsidian-dev-utils/async', () => ({
  invokeAsyncSafely: vi.fn((fn: () => unknown) => fn())
}));

vi.mock('obsidian-dev-utils/obsidian/components/component-ex', () => ({
  ComponentEx: class MockComponentEx {
    public async loadWithPromises(): Promise<void> {
      await mockSuperOnload();
      await this.onloadAsync();
    }

    public onloadAsync(): Promise<void> {
      return noopAsync();
    }

    public register(fn: () => void): void {
      registeredCallbacks.push(fn);
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/async-events-component', () => ({
  registerAsyncEvent: (...args: unknown[]): unknown => mockRegisterAsyncEvent(...args)
}));

const CHECKING_INTERVAL_IN_SECONDS = 10;

interface MockAdapter {
  list: Mock<(normalizedPath: string) => Promise<ListedFiles>>;
  stat: Mock<(normalizedPath: string) => Promise<null | Stat>>;
}

interface MockApp {
  vault: MockVault;
}

interface MockPluginSettingsComponent {
  on: ReturnType<typeof vi.fn>;
  settings: MockSettings;
}

interface MockScriptManager {
  registerInvocableScripts: ReturnType<typeof vi.fn>;
}

interface MockSettings {
  getInvocableScriptsFolder: ReturnType<typeof vi.fn>;
  mobileChangesCheckingIntervalInSeconds: number;
}

interface MockVault {
  adapter: MockAdapter;
  exists: ReturnType<typeof vi.fn>;
}

interface MutableMobileSettings {
  mobileChangesCheckingIntervalInSeconds: number;
}

describe('ScriptFolderWatcherMobile', () => {
  let watcher: ScriptFolderWatcherMobileComponent;
  let mockApp: MockApp;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockScriptManager: MockScriptManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registeredCallbacks.length = 0;

    mockApp = {
      vault: {
        adapter: {
          list: vi.fn<(normalizedPath: string) => Promise<ListedFiles>>().mockResolvedValue({ files: [], folders: [] }),
          stat: vi.fn<(normalizedPath: string) => Promise<null | Stat>>().mockResolvedValue({ ctime: 0, mtime: 0, size: 0, type: 'folder' })
        },
        exists: vi.fn().mockResolvedValue(true)
      }
    };

    mockPluginSettingsComponent = {
      on: vi.fn(),
      settings: {
        getInvocableScriptsFolder: vi.fn().mockReturnValue('scripts'),
        mobileChangesCheckingIntervalInSeconds: CHECKING_INTERVAL_IN_SECONDS
      }
    };

    mockScriptManager = {
      registerInvocableScripts: vi.fn().mockResolvedValue(undefined)
    };

    watcher = new ScriptFolderWatcherMobileComponent({
      app: castTo<App>(mockApp),
      pluginSettingsComponent: castTo<PluginSettingsComponent>(mockPluginSettingsComponent),
      scriptManager: castTo<ScriptManager>(mockScriptManager)
    });
  });

  describe('startWatcher', () => {
    it('should return false when invocableScriptsFolder is empty', async () => {
      vi.mocked(mockPluginSettingsComponent.settings.getInvocableScriptsFolder).mockReturnValue('');

      const onChange = vi.fn().mockResolvedValue(undefined);
      const result = await watcher['startWatcher'](onChange);

      expect(result).toBe(false);
    });

    it('should return false when folder does not exist', async () => {
      vi.mocked(mockApp.vault.exists).mockResolvedValue(false);

      const onChange = vi.fn().mockResolvedValue(undefined);
      const result = await watcher['startWatcher'](onChange);

      expect(result).toBe(false);
    });

    it('should return true when folder exists and watching starts', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      const result = await watcher['startWatcher'](onChange);

      expect(result).toBe(true);
    });

    it('should call onChange on first check because all files are new', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it('should not start polling when interval is 0', async () => {
      (mockPluginSettingsComponent.settings as MutableMobileSettings).mobileChangesCheckingIntervalInSeconds = 0;

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // OnChange should NOT be called since watch() returns early when interval is 0
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('stopWatcher', () => {
    it('should clear modification times', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      watcher['stopWatcher']();

      // After stopping and restarting, it should detect changes again because cache is cleared
      onChange.mockClear();
      await watcher['startWatcher'](onChange);

      expect(onChange).toHaveBeenCalled();
    });

    it('should clear the timeout', async () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      watcher['stopWatcher']();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should be safe to call when no timeout is active', () => {
      expect(() => {
        watcher['stopWatcher']();
      }).not.toThrow();
    });
  });

  describe('file change detection', () => {
    it('should detect file modification time changes', async () => {
      const INITIAL_MTIME = 100;
      const UPDATED_MTIME = 200;

      vi.mocked(mockApp.vault.adapter.stat).mockResolvedValue({ ctime: 0, mtime: INITIAL_MTIME, size: 0, type: 'folder' });

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // First check should trigger onChange (new entries)
      expect(onChange).toHaveBeenCalledOnce();
      onChange.mockClear();

      // Update mtime for next check
      vi.mocked(mockApp.vault.adapter.stat).mockResolvedValue({ ctime: 0, mtime: UPDATED_MTIME, size: 0, type: 'folder' });

      // Run the scheduled timeout
      await vi.advanceTimersByTimeAsync(CHECKING_INTERVAL_IN_SECONDS * 1000);

      expect(onChange).toHaveBeenCalled();
    });

    it('should not call onChange when files have not changed', async () => {
      const STATIC_MTIME = 100;

      vi.mocked(mockApp.vault.adapter.stat).mockResolvedValue({ ctime: 0, mtime: STATIC_MTIME, size: 0, type: 'folder' });

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // First check triggers onChange
      expect(onChange).toHaveBeenCalledOnce();
      onChange.mockClear();

      // Same mtime on second check
      await vi.advanceTimersByTimeAsync(CHECKING_INTERVAL_IN_SECONDS * 1000);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should recursively check subfiles and subfolders', async () => {
      const MTIME = 50;

      vi.mocked(mockApp.vault.adapter.stat).mockResolvedValue({ ctime: 0, mtime: MTIME, size: 0, type: 'folder' });
      vi.mocked(mockApp.vault.adapter.list).mockImplementation(
        (path: string) => {
          if (path === 'scripts') {
            return Promise.resolve({ files: ['scripts/a.ts'], folders: ['scripts/sub'] });
          }
          if (path === 'scripts/sub') {
            return Promise.resolve({ files: ['scripts/sub/b.ts'], folders: [] });
          }
          return Promise.resolve({ files: [], folders: [] });
        }
      );

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // Stat should be called for the folder, subfiles, and subfolders
      const statCallCount = vi.mocked(mockApp.vault.adapter.stat).mock.calls.length;
      const MINIMUM_STAT_CALLS = 3;
      expect(statCallCount).toBeGreaterThanOrEqual(MINIMUM_STAT_CALLS);
    });

    it('should propagate subfile modification time when it exceeds parent folder mtime', async () => {
      const FOLDER_MTIME = 200;
      const SUBFILE_INITIAL_MTIME = 200;
      const SUBFILE_UPDATED_MTIME = 300;

      let subfileMtime = SUBFILE_INITIAL_MTIME;

      vi.mocked(mockApp.vault.adapter.stat).mockImplementation(
        (path: string) => {
          if (path === 'scripts') {
            return Promise.resolve({ ctime: 0, mtime: FOLDER_MTIME, size: 0, type: 'folder' });
          }
          return Promise.resolve({ ctime: 0, mtime: subfileMtime, size: 0, type: 'file' });
        }
      );
      vi.mocked(mockApp.vault.adapter.list).mockImplementation(
        (path: string) => {
          if (path === 'scripts') {
            return Promise.resolve({ files: ['scripts/a.ts'], folders: [] });
          }
          return Promise.resolve({ files: [], folders: [] });
        }
      );

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // First check triggers onChange because all entries are new
      expect(onChange).toHaveBeenCalledOnce();
      onChange.mockClear();

      // Second check with same mtimes - no change
      await vi.advanceTimersByTimeAsync(CHECKING_INTERVAL_IN_SECONDS * 1000);
      expect(onChange).not.toHaveBeenCalled();

      // Update subfile mtime to trigger change detection via propagation
      subfileMtime = SUBFILE_UPDATED_MTIME;
      await vi.advanceTimersByTimeAsync(CHECKING_INTERVAL_IN_SECONDS * 1000);
      expect(onChange).toHaveBeenCalledOnce();
    });
  });
});
