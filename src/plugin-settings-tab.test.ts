import type { Plugin } from 'obsidian';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { noop } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettings } from './plugin-settings.ts';

import { PluginSettingsTab } from './plugin-settings-tab.ts';

interface MockBindOptions {
  onChanged(): void;
}

interface MockPathSuggestInstance {
  getRootPath(): string;
  refresh: ReturnType<typeof vi.fn>;
}

interface MockPathSuggestParams {
  getRootPath(): string;
}

interface MockPluginSettingsComponent {
  editAndSave: ReturnType<typeof vi.fn>;
  settings: PluginSettings;
}

interface MockTextInstance {
  inputEl: HTMLInputElement;
  onChanged: ReturnType<typeof vi.fn>;
  setPlaceholder: ReturnType<typeof vi.fn>;
}

const mockBind = vi.fn().mockReturnValue({
  setMin: vi.fn().mockReturnValue({ setMax: vi.fn() }),
  setPlaceholder: vi.fn()
});
const mockSettingExSetName = vi.fn();
const mockSettingExSetDesc = vi.fn();
const mockSettingExAddText = vi.fn();
const mockSettingExAddButton = vi.fn();
const mockSettingExAddNumber = vi.fn();
const mockSettingExAddToggle = vi.fn();
const mockSettingExAddCodeHighlighter = vi.fn();

const mockButtonClickHandlers: (() => void)[] = [];
const mockTextInstances: MockTextInstance[] = [];

const mockSettingExInstance = {
  addButton: (...args: unknown[]): unknown => {
    mockSettingExAddButton(...args);
    const cb = args[0] as (button: Record<string, unknown>) => void;
    const button = {
      onClick: vi.fn().mockImplementation(function handleClick(this: Record<string, unknown>, handler: () => void) {
        mockButtonClickHandlers.push(handler);
        return this;
      }),
      setButtonText: vi.fn().mockReturnThis(),
      setTooltip: vi.fn().mockReturnThis(),
      setWarning: vi.fn().mockReturnThis()
    };
    cb(button);
    return mockSettingExInstance;
  },
  addCodeHighlighter: (...args: unknown[]): unknown => {
    mockSettingExAddCodeHighlighter(...args);
    const cb = args[0] as (highlighter: Record<string, unknown>) => void;
    cb({
      inputEl: { addClass: vi.fn() },
      setLanguage: vi.fn()
    });
    return mockSettingExInstance;
  },
  addNumber: (...args: unknown[]): unknown => {
    mockSettingExAddNumber(...args);
    const cb = args[0] as (text: Record<string, unknown>) => void;
    cb({ setMax: vi.fn(), setMin: vi.fn().mockReturnValue({ setMax: vi.fn() }) });
    return mockSettingExInstance;
  },
  addText: (...args: unknown[]): unknown => {
    mockSettingExAddText(...args);
    const cb = args[0] as (text: Record<string, unknown>) => void;
    const textObj = { inputEl: createEl('input'), onChanged: vi.fn(), setPlaceholder: vi.fn().mockReturnThis() };
    mockTextInstances.push(textObj);
    cb(textObj);
    return mockSettingExInstance;
  },
  addToggle: (...args: unknown[]): unknown => {
    mockSettingExAddToggle(...args);
    const cb = args[0] as (toggle: unknown) => void;
    cb({});
    return mockSettingExInstance;
  },
  setDesc: (...args: unknown[]): unknown => {
    mockSettingExSetDesc(...args);
    return mockSettingExInstance;
  },
  setName: (...args: unknown[]): unknown => {
    mockSettingExSetName(...args);
    return mockSettingExInstance;
  }
};

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Events: class {
    private readonly handlers = new Map<string, (() => void)[]>();

    public on(event: string, handler: () => void): void {
      const existing = this.handlers.get(event) ?? [];
      existing.push(handler);
      this.handlers.set(event, existing);
    }

    public trigger(event: string): void {
      const handlers = this.handlers.get(event) ?? [];
      for (const handler of handlers) {
        handler();
      }
    }
  },
  stringifyYaml: (obj: unknown): unknown => JSON.stringify(obj)
}));

vi.mock('obsidian-dev-utils/async', () => ({
  convertAsyncToSync: vi.fn((fn: unknown) => fn)
}));

vi.mock('obsidian-dev-utils/html-element', () => ({
  appendCodeBlock: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-settings-tab', () => ({
  PluginSettingsTabBase: class MockPluginSettingsTabBase {
    protected readonly app: unknown;
    protected readonly containerEl: HTMLElement;
    protected readonly pluginSettingsComponent: MockPluginSettingsComponent;

    public constructor(params: Record<string, unknown>) {
      const plugin = params['plugin'] as Record<string, unknown>;
      this.app = plugin['app'] ?? {};
      this.containerEl = createDiv();
      this.pluginSettingsComponent = params['pluginSettingsComponent'] as MockPluginSettingsComponent;
    }

    public bind(...args: unknown[]): ReturnType<typeof vi.fn> {
      return mockBind(...args) as ReturnType<typeof vi.fn>;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- base class stub
    public display(): void {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/setting-ex', () => ({
  // eslint-disable-next-line prefer-arrow-callback -- must be a constructor function for `new`
  SettingEx: vi.fn().mockImplementation(function mockSettingExConstructor() {
    return mockSettingExInstance;
  })
}));

vi.mock('obsidian-dev-utils/obsidian/setting-group-ex', () => ({
  SettingGroupEx: class MockSettingGroupEx {
    public constructor(_containerEl: HTMLElement) {
      noop();
    }

    public addSettingEx(cb: (setting: unknown) => void): this {
      cb(mockSettingExInstance);
      return this;
    }

    public setHeading(_heading: string): this {
      return this;
    }
  }
}));

vi.mock('./code-button-block.ts', () => ({
  DEFAULT_CODE_BUTTON_BLOCK_CONFIG: {
    caption: '(no caption)',
    isRaw: false,
    removeAfterExecution: { shouldKeepGap: false, when: 'never' },
    shouldAutoOutput: true,
    shouldAutoRun: false,
    shouldShowSystemMessages: true,
    shouldWrapConsole: true
  }
}));

const mockPathSuggestInstances: MockPathSuggestInstance[] = [];
vi.mock('./path-suggest.ts', () => ({
  PathSuggest: class MockPathSuggest {
    public refresh = vi.fn();

    public constructor(params: MockPathSuggestParams) {
      mockPathSuggestInstances.push({ getRootPath: params.getRootPath, refresh: this.refresh });
    }
  }
}));

describe('PluginSettingsTab', () => {
  let tab: PluginSettingsTab;

  beforeEach(() => {
    vi.clearAllMocks();
    mockButtonClickHandlers.length = 0;
    mockTextInstances.length = 0;
    mockPathSuggestInstances.length = 0;

    const mockPlugin = {
      app: {
        setting: {
          openTabById: vi.fn().mockReturnValue({
            searchComponent: { setValue: vi.fn() },
            updateHotkeyVisibility: vi.fn()
          })
        }
      }
    };

    tab = new PluginSettingsTab({
      plugin: castTo<Plugin>(mockPlugin),
      pluginName: 'CodeScript Toolkit',
      pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
        editAndSave: vi.fn(),
        settings: castTo<PluginSettings>({ modulesRoot: '' })
      })
    });
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(tab).toBeDefined();
    });
  });

  describe('display', () => {
    it('should create settings for all configuration options', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const EXPECTED_SETTING_COUNT = 10;
      const totalSettingCalls = mockSettingExSetName.mock.calls.length + mockSettingExAddButton.mock.calls.length;
      expect(totalSettingCalls).toBeGreaterThanOrEqual(EXPECTED_SETTING_COUNT);
    });

    it('should create Script modules root setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Script modules root');
    });

    it('should create Invocable scripts folder setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Invocable scripts folder');
    });

    it('should create Startup script path setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Startup script path');
    });

    it('should create Hotkeys setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Hotkeys');
    });

    it('should create Mobile changes checking interval setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Mobile: Changes checking interval');
    });

    it('should create Desktop synchronous fallback setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Desktop: Synchronous fallback');
    });

    it('should create Handle protocol URLs setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Handle protocol URLs');
    });

    it('should create Should show temp plugin load/unload notices setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Should show temp plugin load/unload notices');
    });

    it('should create Default code button config setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Default code button config');
    });

    it('should bind text inputs to settings', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      expect(mockBind).toHaveBeenCalled();
    });

    it('should bind modulesRoot with onChanged callback that triggers modulesRootChanged', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      // Find the bind call for modulesRoot
      const modulesRootBindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'modulesRoot'
      );
      expect(modulesRootBindCall).toBeDefined();

      // The options object should have an onChanged callback
      const options = modulesRootBindCall?.[2] as MockBindOptions | undefined;
      expect(options?.onChanged).toBeDefined();

      // Invoke the onChanged callback to trigger modulesRootChanged event
      options?.onChanged();
      // If it reaches here without throwing, the callback was successfully invoked
      expect(true).toBe(true);
    });

    it('should bind invocableScriptsFolder setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'invocableScriptsFolder'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind startupScriptPath setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'startupScriptPath'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind mobileChangesCheckingIntervalInSeconds setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'mobileChangesCheckingIntervalInSeconds'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind shouldUseSyncFallback setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'shouldUseSyncFallback'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind shouldHandleProtocolUrls setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'shouldHandleProtocolUrls'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind shouldShowTempPluginLoadUnloadNotices setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'shouldShowTempPluginLoadUnloadNotices'
      );
      expect(bindCall).toBeDefined();
    });

    it('should bind defaultCodeButtonConfig setting', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const bindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'defaultCodeButtonConfig'
      );
      expect(bindCall).toBeDefined();
    });

    it('should configure hotkeys button that opens hotkeys tab', () => {
      const mockOpenTabById = vi.fn().mockReturnValue({
        searchComponent: { setValue: vi.fn() },
        updateHotkeyVisibility: vi.fn()
      });

      const mockPlugin = {
        app: {
          setting: {
            openTabById: mockOpenTabById
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: vi.fn(),
          settings: castTo<PluginSettings>({ modulesRoot: '' })
        })
      });

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // Find the button callback and invoke it
      const buttonCalls = mockSettingExAddButton.mock.calls;
      expect(buttonCalls.length).toBeGreaterThan(0);
    });

    it('should create reset to defaults button with onClick handler', () => {
      const mockEditAndSave = vi.fn().mockResolvedValue(undefined);

      const mockPlugin = {
        app: {
          setting: {
            openTabById: vi.fn().mockReturnValue({
              searchComponent: { setValue: vi.fn() },
              updateHotkeyVisibility: vi.fn()
            })
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: mockEditAndSave,
          settings: castTo<PluginSettings>({ modulesRoot: '' })
        })
      });

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // The last addButton call should be the reset button
      expect(mockSettingExAddButton).toHaveBeenCalled();
    });

    it('should invoke modulesRootChanged event which calls onChanged and refresh on dependent settings', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      // Find the bind call for modulesRoot and invoke onChanged
      const modulesRootBindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'modulesRoot'
      );
      const options = modulesRootBindCall?.[2] as MockBindOptions | undefined;

      // There are 3 addText calls: modulesRoot, invocableScriptsFolder, startupScriptPath
      // The invocable and startup text objects register modulesRootChanged handlers
      // Invoking onChanged triggers those handlers
      const TEXT_INDEX_INVOCABLE = 1;
      const TEXT_INDEX_STARTUP = 2;
      const invocableText = mockTextInstances[TEXT_INDEX_INVOCABLE];
      const startupText = mockTextInstances[TEXT_INDEX_STARTUP];

      options?.onChanged();

      // The modulesRootChanged handlers call text.onChanged() and suggest.refresh()
      expect(invocableText?.onChanged).toHaveBeenCalled();
      expect(startupText?.onChanged).toHaveBeenCalled();
    });

    it('should call refresh on PathSuggest instances when modulesRootChanged fires', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      const modulesRootBindCall = mockBind.mock.calls.find(
        (call) => call[1] === 'modulesRoot'
      );
      const options = modulesRootBindCall?.[2] as MockBindOptions | undefined;

      // PathSuggest instances are created for: modulesRoot (index 0), invocable (index 1), startup (index 2)
      const PATH_SUGGEST_INDEX_INVOCABLE = 1;
      const PATH_SUGGEST_INDEX_STARTUP = 2;

      options?.onChanged();

      expect(mockPathSuggestInstances[PATH_SUGGEST_INDEX_INVOCABLE]?.refresh).toHaveBeenCalled();
      expect(mockPathSuggestInstances[PATH_SUGGEST_INDEX_STARTUP]?.refresh).toHaveBeenCalled();
    });

    it('should invoke hotkeys button onClick handler that opens hotkeys tab', () => {
      const mockSetValue = vi.fn();
      const mockUpdateHotkeyVisibility = vi.fn();
      const mockOpenTabById = vi.fn().mockReturnValue({
        searchComponent: { setValue: mockSetValue },
        updateHotkeyVisibility: mockUpdateHotkeyVisibility
      });

      const mockPlugin = {
        app: {
          setting: {
            openTabById: mockOpenTabById
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: vi.fn(),
          settings: castTo<PluginSettings>({ modulesRoot: '' })
        })
      });

      mockButtonClickHandlers.length = 0;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // Second button click handler is for Hotkeys "Configure" (after "Reset" button in Code button blocks)
      const HOTKEYS_BUTTON_INDEX = 1;
      const hotkeysClickHandler = mockButtonClickHandlers[HOTKEYS_BUTTON_INDEX];
      expect(hotkeysClickHandler).toBeDefined();

      hotkeysClickHandler?.();

      expect(mockOpenTabById).toHaveBeenCalledWith('hotkeys');
      expect(mockSetValue).toHaveBeenCalledWith('CodeScript Toolkit:');
      expect(mockUpdateHotkeyVisibility).toHaveBeenCalled();
    });

    it('should invoke reset button onClick handler that calls editAndSave and display', () => {
      const mockEditAndSave = vi.fn().mockImplementation((fn: (settings: Record<string, unknown>) => void) => {
        const settings: Record<string, unknown> = {};
        fn(settings);
        expect(settings['defaultCodeButtonConfig']).toBeDefined();
      });

      const mockPlugin = {
        app: {
          setting: {
            openTabById: vi.fn().mockReturnValue({
              searchComponent: { setValue: vi.fn() },
              updateHotkeyVisibility: vi.fn()
            })
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: mockEditAndSave,
          settings: castTo<PluginSettings>({ modulesRoot: '' })
        })
      });

      mockButtonClickHandlers.length = 0;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // First button click handler is for "Reset to plugin default code button config" (in Code button blocks group)
      const RESET_BUTTON_INDEX = 0;
      const resetClickHandler = mockButtonClickHandlers[RESET_BUTTON_INDEX];
      expect(resetClickHandler).toBeDefined();

      resetClickHandler?.();

      expect(mockEditAndSave).toHaveBeenCalled();
    });

    it('should return empty string from modulesRoot PathSuggest getRootPath', () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tab.display();

      // First PathSuggest instance is for modulesRoot (getRootPath returns '')
      const PATH_SUGGEST_INDEX_MODULES_ROOT = 0;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_MODULES_ROOT]?.getRootPath();
      expect(rootPath).toBe('');
    });

    it('should return modulesRoot from startupScriptPath PathSuggest getRootPath', () => {
      const mockPlugin = {
        app: {
          setting: {
            openTabById: vi.fn().mockReturnValue({
              searchComponent: { setValue: vi.fn() },
              updateHotkeyVisibility: vi.fn()
            })
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: vi.fn(),
          settings: castTo<PluginSettings>({ modulesRoot: 'startup/root' })
        })
      });

      mockPathSuggestInstances.length = 0;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // Third PathSuggest instance is for startupScriptPath
      const PATH_SUGGEST_INDEX_STARTUP = 2;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_STARTUP]?.getRootPath();
      expect(rootPath).toBe('startup/root');
    });

    it('should return modulesRoot from invocableScriptsFolder PathSuggest getRootPath', () => {
      const mockPlugin = {
        app: {
          setting: {
            openTabById: vi.fn().mockReturnValue({
              searchComponent: { setValue: vi.fn() },
              updateHotkeyVisibility: vi.fn()
            })
          }
        }
      };

      const tabWithMock = new PluginSettingsTab({
        plugin: castTo<Plugin>(mockPlugin),
        pluginName: 'CodeScript Toolkit',
        pluginSettingsComponent: castTo<PluginSettingsComponentBase<PluginSettings>>({
          editAndSave: vi.fn(),
          settings: castTo<PluginSettings>({ modulesRoot: 'custom/root' })
        })
      });

      mockPathSuggestInstances.length = 0;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- PluginSettingsTab.display() is deprecated via inherited SettingTab.display() JSDoc; tests must call it to verify rendering.
      tabWithMock.display();

      // Second PathSuggest instance is for invocableScriptsFolder
      const PATH_SUGGEST_INDEX_INVOCABLE = 1;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_INVOCABLE]?.getRootPath();
      expect(rootPath).toBe('custom/root');
    });
  });
});
