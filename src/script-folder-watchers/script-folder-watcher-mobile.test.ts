import type {
  App,
  DataAdapter
} from 'obsidian';
import type { Mock } from 'vitest';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
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

const CHECKING_INTERVAL_IN_SECONDS = 10;

interface MockSettings {
  getInvocableScriptsFolder: Mock<() => string>;
  mobileChangesCheckingIntervalInSeconds: number;
}

describe('ScriptFolderWatcherMobile', () => {
  let watcher: ScriptFolderWatcherMobileComponent;
  let app: App;
  let pluginSettingsComponent: PluginSettingsComponent;
  let scriptManager: ScriptManager;
  let existsMock: Mock<(path: string) => Promise<boolean>>;
  let statMock: Mock<DataAdapter['stat']>;
  let listMock: Mock<DataAdapter['list']>;
  let settings: MockSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    existsMock = vi.fn<(path: string) => Promise<boolean>>().mockResolvedValue(true);
    statMock = vi.fn<DataAdapter['stat']>().mockResolvedValue({ ctime: 0, mtime: 0, size: 0, type: 'folder' });
    listMock = vi.fn<DataAdapter['list']>().mockResolvedValue({ files: [], folders: [] });

    app = strictProxy<App>({
      vault: strictProxy<App['vault']>({
        adapter: strictProxy<DataAdapter>({
          list: listMock,
          stat: statMock
        }),
        exists: existsMock
      })
    });

    settings = {
      getInvocableScriptsFolder: vi.fn<() => string>().mockReturnValue('scripts'),
      mobileChangesCheckingIntervalInSeconds: CHECKING_INTERVAL_IN_SECONDS
    };
    pluginSettingsComponent = strictProxy<PluginSettingsComponent>({
      settings: strictProxy<PluginSettingsComponent['settings']>(settings)
    });

    scriptManager = strictProxy<ScriptManager>({});

    watcher = new ScriptFolderWatcherMobileComponent({
      app,
      pluginSettingsComponent,
      scriptManager
    });
  });

  describe('startWatcher', () => {
    it('should return false when invocableScriptsFolder is empty', async () => {
      settings.getInvocableScriptsFolder.mockReturnValue('');

      const onChange = vi.fn().mockResolvedValue(undefined);
      const result = await watcher['startWatcher'](onChange);

      expect(result).toBe(false);
    });

    it('should return false when folder does not exist', async () => {
      existsMock.mockResolvedValue(false);

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
      settings.mobileChangesCheckingIntervalInSeconds = 0;

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

      statMock.mockResolvedValue({ ctime: 0, mtime: INITIAL_MTIME, size: 0, type: 'folder' });

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // First check should trigger onChange (new entries)
      expect(onChange).toHaveBeenCalledOnce();
      onChange.mockClear();

      // Update mtime for next check
      statMock.mockResolvedValue({ ctime: 0, mtime: UPDATED_MTIME, size: 0, type: 'folder' });

      // Run the scheduled timeout
      await vi.advanceTimersByTimeAsync(CHECKING_INTERVAL_IN_SECONDS * 1000);

      expect(onChange).toHaveBeenCalled();
    });

    it('should not call onChange when files have not changed', async () => {
      const STATIC_MTIME = 100;

      statMock.mockResolvedValue({ ctime: 0, mtime: STATIC_MTIME, size: 0, type: 'folder' });

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

      statMock.mockResolvedValue({ ctime: 0, mtime: MTIME, size: 0, type: 'folder' });
      listMock.mockImplementation(
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
      const statCallCount = statMock.mock.calls.length;
      const MINIMUM_STAT_CALLS = 3;
      expect(statCallCount).toBeGreaterThanOrEqual(MINIMUM_STAT_CALLS);
    });

    it('should propagate subfile modification time when it exceeds parent folder mtime', async () => {
      const FOLDER_MTIME = 200;
      const SUBFILE_INITIAL_MTIME = 200;
      const SUBFILE_UPDATED_MTIME = 300;

      let subfileMtime = SUBFILE_INITIAL_MTIME;

      statMock.mockImplementation(
        (path: string) => {
          if (path === 'scripts') {
            return Promise.resolve({ ctime: 0, mtime: FOLDER_MTIME, size: 0, type: 'folder' });
          }
          return Promise.resolve({ ctime: 0, mtime: subfileMtime, size: 0, type: 'file' });
        }
      );
      listMock.mockImplementation(
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
