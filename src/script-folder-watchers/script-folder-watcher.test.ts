import type { App } from 'obsidian';
import type { Promisable } from 'type-fest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ScriptFolderWatcher } from './script-folder-watcher.ts';

const mockRegisterAsyncEvent = vi.fn();
const mockSuperOnload = vi.fn();
const registeredCallbacks: (() => void)[] = [];

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

interface MockPluginSettingsComponent {
  on: ReturnType<typeof vi.fn>;
}

interface MockScriptManager {
  registerInvocableScripts: ReturnType<typeof vi.fn>;
}

class TestScriptFolderWatcher extends ScriptFolderWatcher {
  public startWatcherMock = vi.fn<(onChange: () => Promise<void>) => Promisable<boolean>>().mockResolvedValue(false);
  public stopWatcherMock = vi.fn();

  protected override startWatcher(onChange: () => Promise<void>): Promisable<boolean> {
    return this.startWatcherMock(onChange);
  }

  protected override stopWatcher(): void {
    this.stopWatcherMock();
  }
}

describe('ScriptFolderWatcher', () => {
  let watcher: TestScriptFolderWatcher;
  let mockApp: Partial<App>;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockScriptManager: MockScriptManager;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredCallbacks.length = 0;

    mockApp = {};

    const eventHandlers = new Map<string, ((...args: unknown[]) => unknown)[]>();
    mockPluginSettingsComponent = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        const handlers = eventHandlers.get(event) ?? [];
        handlers.push(handler);
        eventHandlers.set(event, handlers);
        return { event, handler };
      })
    };

    mockScriptManager = {
      registerInvocableScripts: vi.fn().mockResolvedValue(undefined)
    };

    watcher = new TestScriptFolderWatcher({
      app: mockApp as App,
      pluginSettingsComponent: mockPluginSettingsComponent as never,
      scriptManager: mockScriptManager as never
    });
  });

  describe('constructor', () => {
    it('should assign app from params', () => {
      expect(watcher['app']).toBe(mockApp);
    });

    it('should assign pluginSettingsComponent from params', () => {
      expect(watcher['pluginSettingsComponent']).toBe(mockPluginSettingsComponent);
    });
  });

  describe('onload', () => {
    it('should call super.onload', async () => {
      await watcher.onload();
      expect(mockSuperOnload).toHaveBeenCalledOnce();
    });

    it('should register async events for loadSettings and saveSettings', async () => {
      await watcher.onload();

      const EVENT_COUNT = 2;
      expect(mockRegisterAsyncEvent).toHaveBeenCalledTimes(EVENT_COUNT);
    });

    it('should register loadSettings event listener', async () => {
      await watcher.onload();

      expect(mockPluginSettingsComponent.on).toHaveBeenCalledWith('loadSettings', expect.any(Function));
    });

    it('should register saveSettings event listener', async () => {
      await watcher.onload();

      expect(mockPluginSettingsComponent.on).toHaveBeenCalledWith('saveSettings', expect.any(Function));
    });
  });

  describe('register2', () => {
    it('should call stopWatcher before starting', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);

      expect(watcher.stopWatcherMock).toHaveBeenCalled();
    });

    it('should call startWatcher with onChange', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);

      expect(watcher.startWatcherMock).toHaveBeenCalledWith(onChange);
    });

    it('should call onChange when startWatcher returns true', async () => {
      watcher.startWatcherMock.mockResolvedValue(true);
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it('should not call onChange when startWatcher returns false', async () => {
      watcher.startWatcherMock.mockResolvedValue(false);
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should register stopWatcher as cleanup on first call', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);

      // Should have registered stopWatcher for initial cleanup + post-start cleanup
      const EXPECTED_REGISTRATIONS = 2;
      expect(registeredCallbacks).toHaveLength(EXPECTED_REGISTRATIONS);
    });

    it('should not re-register initial cleanup on subsequent calls', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher.register2(onChange);
      registeredCallbacks.length = 0;

      await watcher.register2(onChange);

      // Only the post-start cleanup should be registered
      const EXPECTED_POST_START_REGISTRATIONS = 1;
      expect(registeredCallbacks).toHaveLength(EXPECTED_POST_START_REGISTRATIONS);
    });
  });

  describe('applyNewSettings', () => {
    it('should call register2 with registerInvocableScripts when loadSettings event fires', async () => {
      await watcher.onload();

      // Find the loadSettings event handler from the on() mock
      const onCalls = vi.mocked(mockPluginSettingsComponent.on).mock.calls;
      const eventName = 'loadSettings';
      const loadSettingsCall = onCalls.find((call) => call[0] === eventName);
      const loadSettingsHandler = loadSettingsCall?.[1] as () => Promise<void>;

      // Execute the handler (applyNewSettings)
      await loadSettingsHandler();

      // ApplyNewSettings calls register2 which calls startWatcher
      expect(watcher.startWatcherMock).toHaveBeenCalled();
    });

    it('should call register2 with registerInvocableScripts when saveSettings event fires', async () => {
      await watcher.onload();

      const onCalls = vi.mocked(mockPluginSettingsComponent.on).mock.calls;
      const eventName = 'saveSettings';
      const saveSettingsCall = onCalls.find((call) => call[0] === eventName);
      const saveSettingsHandler = saveSettingsCall?.[1] as () => Promise<void>;

      watcher.startWatcherMock.mockResolvedValue(true);
      await saveSettingsHandler();

      expect(watcher.startWatcherMock).toHaveBeenCalled();
      expect(mockScriptManager.registerInvocableScripts).toHaveBeenCalled();
    });
  });
});
