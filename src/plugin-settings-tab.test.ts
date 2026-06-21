import type { Plugin } from 'obsidian';
import type { AsyncEventRef } from 'obsidian-dev-utils/async-events';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { PluginSettings } from './plugin-settings.ts';

interface AppSetting {
  openTabById: ReturnType<typeof vi.fn>;
}

interface AppWithSetting {
  setting: AppSetting;
}

interface BindCall {
  options: MockBindOptions | undefined;
  propertyName: string;
}

type BindFn = (valueComponent: unknown, propertyName: string, options?: MockBindOptions) => unknown;

interface BindTarget {
  bind: BindFn;
}

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

interface MockTextInstance {
  inputEl: HTMLInputElement;
  onChanged: ReturnType<typeof vi.fn>;
  setPlaceholder: ReturnType<typeof vi.fn>;
}

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
      onChange: vi.fn().mockReturnThis(),
      setLanguage: vi.fn(),
      setValue: vi.fn()
    });
    return mockSettingExInstance;
  },
  addNumber: (...args: unknown[]): unknown => {
    mockSettingExAddNumber(...args);
    const cb = args[0] as (text: Record<string, unknown>) => void;
    cb({
      onChange: vi.fn().mockReturnThis(),
      setMax: vi.fn(),
      setMin: vi.fn().mockReturnValue({ setMax: vi.fn() }),
      setValue: vi.fn()
    });
    return mockSettingExInstance;
  },
  addText: (...args: unknown[]): unknown => {
    mockSettingExAddText(...args);
    const cb = args[0] as (text: Record<string, unknown>) => void;
    const textObj = {
      inputEl: createEl('input'),
      onChange: vi.fn().mockReturnThis(),
      onChanged: vi.fn(),
      setPlaceholder: vi.fn().mockReturnThis(),
      setValue: vi.fn()
    };
    mockTextInstances.push(textObj);
    cb(textObj);
    return mockSettingExInstance;
  },
  addToggle: (...args: unknown[]): unknown => {
    mockSettingExAddToggle(...args);
    const cb = args[0] as (toggle: unknown) => void;
    cb({ onChange: vi.fn().mockReturnThis(), setValue: vi.fn() });
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

vi.mock('obsidian-dev-utils/async', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/async')>(),
  convertAsyncToSync: vi.fn((fn: unknown) => fn)
}));

vi.mock('obsidian-dev-utils/html-element', () => ({
  appendCodeBlock: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/setting-ex', () => ({
  // eslint-disable-next-line prefer-arrow-callback -- must be a constructor function for `new`
  SettingEx: vi.fn().mockImplementation(function mockSettingExConstructor() {
    return mockSettingExInstance;
  })
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

interface CreateTabParams {
  readonly editAndSave?: ReturnType<typeof vi.fn>;
  readonly modulesRoot?: string;
  readonly openTabById?: ReturnType<typeof vi.fn>;
}

describe('PluginSettingsTab', () => {
  let tab: PluginSettingsTab;
  let bindCalls: BindCall[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockButtonClickHandlers.length = 0;
    mockTextInstances.length = 0;
    mockPathSuggestInstances.length = 0;
    bindCalls = [];

    tab = createTab();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(tab).toBeDefined();
    });
  });

  describe('display', () => {
    it('should create settings for all configuration options', () => {
      tab.displayLegacy();

      const EXPECTED_SETTING_COUNT = 10;
      const totalSettingCalls = mockSettingExSetName.mock.calls.length + mockSettingExAddButton.mock.calls.length;
      expect(totalSettingCalls).toBeGreaterThanOrEqual(EXPECTED_SETTING_COUNT);
    });

    it('should create Script modules root setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Script modules root');
    });

    it('should create Invocable scripts folder setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Invocable scripts folder');
    });

    it('should create Startup script path setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Startup script path');
    });

    it('should create Hotkeys setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Hotkeys');
    });

    it('should create Mobile changes checking interval setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Mobile: Changes checking interval');
    });

    it('should create Desktop synchronous fallback setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Desktop: Synchronous fallback');
    });

    it('should create Handle protocol URLs setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Handle protocol URLs');
    });

    it('should create Should show temp plugin load/unload notices setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Should show temp plugin load/unload notices');
    });

    it('should create Default code button config setting', () => {
      tab.displayLegacy();

      expect(mockSettingExSetName).toHaveBeenCalledWith('Default code button config');
    });

    it('should bind text inputs to settings', () => {
      tab.displayLegacy();

      expect(bindCalls.length).toBeGreaterThan(0);
    });

    it('should bind modulesRoot with onChanged callback that triggers modulesRootChanged', () => {
      tab.displayLegacy();

      const modulesRootBindCall = findBindCall('modulesRoot');
      expect(modulesRootBindCall).toBeDefined();

      const options = modulesRootBindCall?.options;
      expect(options?.onChanged).toBeDefined();

      // Invoking the onChanged callback triggers the modulesRootChanged event without throwing.
      options?.onChanged();
      expect(mockTextInstances[0]).toBeDefined();
    });

    it('should bind invocableScriptsFolder setting', () => {
      tab.displayLegacy();

      expect(findBindCall('invocableScriptsFolder')).toBeDefined();
    });

    it('should bind startupScriptPath setting', () => {
      tab.displayLegacy();

      expect(findBindCall('startupScriptPath')).toBeDefined();
    });

    it('should bind mobileChangesCheckingIntervalInSeconds setting', () => {
      tab.displayLegacy();

      expect(findBindCall('mobileChangesCheckingIntervalInSeconds')).toBeDefined();
    });

    it('should bind shouldUseSyncFallback setting', () => {
      tab.displayLegacy();

      expect(findBindCall('shouldUseSyncFallback')).toBeDefined();
    });

    it('should bind shouldHandleProtocolUrls setting', () => {
      tab.displayLegacy();

      expect(findBindCall('shouldHandleProtocolUrls')).toBeDefined();
    });

    it('should bind shouldShowTempPluginLoadUnloadNotices setting', () => {
      tab.displayLegacy();

      expect(findBindCall('shouldShowTempPluginLoadUnloadNotices')).toBeDefined();
    });

    it('should bind defaultCodeButtonConfig setting', () => {
      tab.displayLegacy();

      expect(findBindCall('defaultCodeButtonConfig')).toBeDefined();
    });

    it('should configure hotkeys button that opens hotkeys tab', () => {
      tab.displayLegacy();

      const buttonCalls = mockSettingExAddButton.mock.calls;
      expect(buttonCalls.length).toBeGreaterThan(0);
    });

    it('should create reset to defaults button with onClick handler', () => {
      const mockEditAndSave = vi.fn().mockResolvedValue(undefined);
      const tabWithMock = createTab({ editAndSave: mockEditAndSave });

      tabWithMock.displayLegacy();

      expect(mockSettingExAddButton).toHaveBeenCalled();
    });

    it('should invoke modulesRootChanged event which calls onChanged and refresh on dependent settings', () => {
      tab.displayLegacy();

      const modulesRootBindCall = findBindCall('modulesRoot');
      const options = modulesRootBindCall?.options;

      // There are 3 addText calls: modulesRoot, invocableScriptsFolder, startupScriptPath.
      // The invocable and startup text objects register modulesRootChanged handlers.
      const TEXT_INDEX_INVOCABLE = 1;
      const TEXT_INDEX_STARTUP = 2;
      const invocableText = mockTextInstances[TEXT_INDEX_INVOCABLE];
      const startupText = mockTextInstances[TEXT_INDEX_STARTUP];

      options?.onChanged();

      expect(invocableText?.onChanged).toHaveBeenCalled();
      expect(startupText?.onChanged).toHaveBeenCalled();
    });

    it('should call refresh on PathSuggest instances when modulesRootChanged fires', () => {
      tab.displayLegacy();

      const modulesRootBindCall = findBindCall('modulesRoot');
      const options = modulesRootBindCall?.options;

      // PathSuggest instances are created for: modulesRoot (index 0), invocable (index 1), startup (index 2).
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

      const tabWithMock = createTab({ openTabById: mockOpenTabById });

      mockButtonClickHandlers.length = 0;

      tabWithMock.displayLegacy();

      // Second button click handler is for Hotkeys "Configure" (after "Reset" button in Code button blocks).
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

      const tabWithMock = createTab({ editAndSave: mockEditAndSave });

      mockButtonClickHandlers.length = 0;

      tabWithMock.displayLegacy();

      // First button click handler is for "Reset to plugin default code button config" (in Code button blocks group).
      const RESET_BUTTON_INDEX = 0;
      const resetClickHandler = mockButtonClickHandlers[RESET_BUTTON_INDEX];
      expect(resetClickHandler).toBeDefined();

      resetClickHandler?.();

      expect(mockEditAndSave).toHaveBeenCalled();
    });

    it('should return empty string from modulesRoot PathSuggest getRootPath', () => {
      tab.displayLegacy();

      // First PathSuggest instance is for modulesRoot (getRootPath returns '').
      const PATH_SUGGEST_INDEX_MODULES_ROOT = 0;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_MODULES_ROOT]?.getRootPath();
      expect(rootPath).toBe('');
    });

    it('should return modulesRoot from startupScriptPath PathSuggest getRootPath', () => {
      const tabWithMock = createTab({ modulesRoot: 'startup/root' });

      mockPathSuggestInstances.length = 0;

      tabWithMock.displayLegacy();

      // Third PathSuggest instance is for startupScriptPath.
      const PATH_SUGGEST_INDEX_STARTUP = 2;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_STARTUP]?.getRootPath();
      expect(rootPath).toBe('startup/root');
    });

    it('should return modulesRoot from invocableScriptsFolder PathSuggest getRootPath', () => {
      const tabWithMock = createTab({ modulesRoot: 'custom/root' });

      mockPathSuggestInstances.length = 0;

      tabWithMock.displayLegacy();

      // Second PathSuggest instance is for invocableScriptsFolder.
      const PATH_SUGGEST_INDEX_INVOCABLE = 1;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_INVOCABLE]?.getRootPath();
      expect(rootPath).toBe('custom/root');
    });
  });

  function createTab(params: CreateTabParams = {}): PluginSettingsTab {
    const openTabById = params.openTabById ?? vi.fn().mockReturnValue({
      searchComponent: { setValue: vi.fn() },
      updateHotkeyVisibility: vi.fn()
    });

    const app = App.createConfigured__().asOriginalType__();
    castTo<AppWithSetting>(app).setting = { openTabById };

    const plugin = strictProxy<Plugin>({
      app,
      manifest: { id: 'test-plugin' }
    });

    const settings = new PluginSettings();
    settings.modulesRoot = params.modulesRoot ?? '';

    const createdTab = new PluginSettingsTab({
      plugin,
      pluginName: 'CodeScript Toolkit',
      pluginSettingsComponent: createSettingsComponent(settings, params.editAndSave)
    });

    // Record bind invocations while delegating to the real base-class `bind`.
    const originalBind = castTo<BindFn>(createdTab.bind.bind(createdTab));
    castTo<BindTarget>(createdTab).bind = vi.fn((valueComponent: unknown, propertyName: string, options?: MockBindOptions) => {
      bindCalls.push({ options, propertyName });
      return originalBind(valueComponent, propertyName, options);
    });

    return createdTab;
  }

  function createSettingsComponent(
    settings: PluginSettings,
    editAndSave?: ReturnType<typeof vi.fn>
  ): PluginSettingsComponentBase<PluginSettings> {
    const validationMessages: Record<string, string> = {};
    for (const key of Object.keys(settings)) {
      validationMessages[key] = '';
    }

    const source = strictProxy<PluginSettingsComponentBase<PluginSettings>>({
      defaultSettings: new PluginSettings(),
      editAndSave: castTo<PluginSettingsComponentBase<PluginSettings>['editAndSave']>(editAndSave ?? vi.fn()),
      offref: vi.fn(),
      on: castTo<PluginSettingsComponentBase<PluginSettings>['on']>(vi.fn((name: string, callback: unknown, thisArg?: unknown): AsyncEventRef => ({
        asyncEventSource: source,
        callback: castTo<AsyncEventRef['callback']>(callback),
        name,
        thisArg
      }))),
      setProperty: vi.fn(() => Promise.resolve('')),
      settings,
      settingsState: {
        effectiveValues: settings,
        inputValues: settings,
        validationMessages
      }
    });
    return source;
  }

  function findBindCall(propertyName: string): BindCall | undefined {
    return bindCalls.find((call) => call.propertyName === propertyName);
  }
});
