import type { DataAdapterEx } from '@obsidian-typings/obsidian-public-latest';
import type { App } from 'obsidian';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Mock } from 'vitest';

import { getDataAdapterEx } from '@obsidian-typings/obsidian-public-latest/implementations';
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

import { ScriptFolderWatcherDesktopComponent } from './script-folder-watcher-desktop.ts';

const mockWatch = vi.fn();

vi.mock('node:fs', () => ({
  default: { watch: (...args: unknown[]): unknown => mockWatch(...args) },
  watch: (...args: unknown[]): unknown => mockWatch(...args)
}));

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
  getDataAdapterEx: vi.fn()
}));

interface MockSettings {
  getInvocableScriptsFolder: Mock<() => string>;
}

describe('ScriptFolderWatcherDesktopComponent', () => {
  let watcher: ScriptFolderWatcherDesktopComponent;
  let app: App;
  let pluginNoticeComponent: PluginNoticeComponent;
  let pluginSettingsComponent: PluginSettingsComponent;
  let scriptManager: ScriptManager;
  let existsMock: Mock<(path: string) => Promise<boolean>>;
  let settings: MockSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    existsMock = vi.fn<(path: string) => Promise<boolean>>().mockResolvedValue(true);
    app = strictProxy<App>({
      vault: strictProxy<App['vault']>({
        exists: existsMock
      })
    });

    settings = {
      getInvocableScriptsFolder: vi.fn<() => string>().mockReturnValue('scripts')
    };

    pluginNoticeComponent = strictProxy<PluginNoticeComponent>({
      showNotice: vi.fn()
    });

    pluginSettingsComponent = strictProxy<PluginSettingsComponent>({
      settings: strictProxy<PluginSettingsComponent['settings']>(settings)
    });

    scriptManager = strictProxy<ScriptManager>({});

    vi.mocked(getDataAdapterEx).mockReturnValue(strictProxy<DataAdapterEx>({ basePath: '/vault' }));

    watcher = new ScriptFolderWatcherDesktopComponent({
      app,
      pluginNoticeComponent,
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

    it('should create a file watcher when folder exists', async () => {
      const mockFSWatcher = { close: vi.fn() };
      mockWatch.mockReturnValue(mockFSWatcher);
      const onChange = vi.fn().mockResolvedValue(undefined);

      const result = await watcher['startWatcher'](onChange);

      expect(result).toBe(true);
      expect(mockWatch).toHaveBeenCalledWith(
        '/vault/scripts',
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should pass correct full path to watch', async () => {
      const mockFSWatcher = { close: vi.fn() };
      mockWatch.mockReturnValue(mockFSWatcher);
      settings.getInvocableScriptsFolder.mockReturnValue('my/scripts/folder');

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      expect(mockWatch).toHaveBeenCalledWith(
        '/vault/my/scripts/folder',
        expect.anything(),
        expect.any(Function)
      );
    });

    it('should stop watcher, call onChange, and restart when file change is detected', async () => {
      const mockFSWatcher = { close: vi.fn() };
      mockWatch.mockReturnValue(mockFSWatcher);

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      const watcherCallback = mockWatch.mock.calls[0]?.[2] as () => void;

      watcherCallback();
      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      expect(mockFSWatcher.close).toHaveBeenCalled();

      await vi.waitFor(() => {
        const EXPECTED_WATCH_CALLS = 2;
        expect(mockWatch).toHaveBeenCalledTimes(EXPECTED_WATCH_CALLS);
      });
    });
  });

  describe('stopWatcher', () => {
    it('should do nothing when no watcher is active', () => {
      expect(() => {
        watcher['stopWatcher']();
      }).not.toThrow();
    });

    it('should close the watcher and set it to null', async () => {
      const mockFSWatcher = { close: vi.fn() };
      mockWatch.mockReturnValue(mockFSWatcher);
      const onChange = vi.fn().mockResolvedValue(undefined);

      await watcher['startWatcher'](onChange);
      watcher['stopWatcher']();

      expect(mockFSWatcher.close).toHaveBeenCalledOnce();
    });

    it('should not call close twice when stopped twice', async () => {
      const mockFSWatcher = { close: vi.fn() };
      mockWatch.mockReturnValue(mockFSWatcher);
      const onChange = vi.fn().mockResolvedValue(undefined);

      await watcher['startWatcher'](onChange);
      watcher['stopWatcher']();
      watcher['stopWatcher']();

      expect(mockFSWatcher.close).toHaveBeenCalledOnce();
    });
  });
});
