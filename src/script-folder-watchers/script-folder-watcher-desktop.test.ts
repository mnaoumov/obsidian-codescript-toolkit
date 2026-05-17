import type { App } from 'obsidian';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { ScriptManager } from '../script.ts';

import {
  createScriptFolderWatcher,
  ScriptFolderWatcherDesktop
} from './script-folder-watcher-desktop.ts';

const mockWatch = vi.fn();
const mockSuperOnload = vi.fn();
const mockRegisterAsyncEvent = vi.fn();
const registeredCallbacks: (() => void)[] = [];

vi.mock('node:fs', () => ({
  default: { watch: (...args: unknown[]): unknown => mockWatch(...args) },
  watch: (...args: unknown[]): unknown => mockWatch(...args)
}));

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Notice: vi.fn()
}));

vi.mock('obsidian-dev-utils/async', () => ({
  invokeAsyncSafely: vi.fn((fn: () => unknown) => fn())
}));

vi.mock('obsidian-dev-utils/path', () => ({
  join: (...segments: string[]): string => segments.join('/')
}));

interface MockDataAdapter {
  basePath: string;
}

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
  getDataAdapterEx: (): MockDataAdapter => ({
    basePath: '/vault'
  })
}));

vi.mock('obsidian-dev-utils/obsidian/components/async-component', () => ({
  AsyncComponentBase: class MockAsyncComponentBase {
    public async onload(): Promise<void> {
      await mockSuperOnload();
    }

    public register(fn: () => void): void {
      registeredCallbacks.push(fn);
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/async-events-component', () => ({
  registerAsyncEvent: (...args: unknown[]): unknown => mockRegisterAsyncEvent(...args)
}));

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
}

interface MockVault {
  exists: ReturnType<typeof vi.fn>;
}

describe('ScriptFolderWatcherDesktop', () => {
  let watcher: ScriptFolderWatcherDesktop;
  let mockApp: MockApp;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockScriptManager: MockScriptManager;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredCallbacks.length = 0;

    mockApp = {
      vault: {
        exists: vi.fn().mockResolvedValue(true)
      }
    };

    mockPluginSettingsComponent = {
      on: vi.fn(),
      settings: {
        getInvocableScriptsFolder: vi.fn().mockReturnValue('scripts')
      }
    };

    mockScriptManager = {
      registerInvocableScripts: vi.fn().mockResolvedValue(undefined)
    };

    watcher = new ScriptFolderWatcherDesktop({
      app: mockApp as never,
      pluginSettingsComponent: mockPluginSettingsComponent as never,
      scriptManager: mockScriptManager as never
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
      vi.mocked(mockPluginSettingsComponent.settings.getInvocableScriptsFolder).mockReturnValue('my/scripts/folder');

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

      // Mock the global sleep function to resolve immediately
      vi.stubGlobal('sleep', vi.fn().mockResolvedValue(undefined));

      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['startWatcher'](onChange);

      // Get the watcher callback passed to watch()
      const watcherCallback = mockWatch.mock.calls[0]?.[2] as () => void;

      // InvokeAsyncSafely calls the async fn but doesn't await it.
      // We need to wait for all microtasks to settle.
      watcherCallback();
      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      // The callback should stop the watcher and call onChange
      expect(mockFSWatcher.close).toHaveBeenCalled();

      // The finally block should call sleep and then startWatcher again
      await vi.waitFor(() => {
        const EXPECTED_WATCH_CALLS = 2;
        expect(mockWatch).toHaveBeenCalledTimes(EXPECTED_WATCH_CALLS);
      });

      vi.unstubAllGlobals();
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

describe('createScriptFolderWatcher', () => {
  it('should return a ScriptFolderWatcherDesktop instance', () => {
    const mockPartialApp: Partial<App> = {};
    const mockPartialPluginSettingsComponent: Partial<PluginSettingsComponent> = { on: vi.fn() as never, settings: {} as never };
    const mockPartialScriptManager: Partial<ScriptManager> = {};
    const params = {
      app: mockPartialApp as App,
      pluginSettingsComponent: mockPartialPluginSettingsComponent as PluginSettingsComponent,
      scriptManager: mockPartialScriptManager as ScriptManager
    };

    const result = createScriptFolderWatcher(params);

    expect(result).toBeInstanceOf(ScriptFolderWatcherDesktop);
  });
});
