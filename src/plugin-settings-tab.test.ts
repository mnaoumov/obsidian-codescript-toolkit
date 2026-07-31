import type {
  Plugin,
  SettingDefinition,
  SettingGroup
} from 'obsidian';
import type { AsyncEventRef } from 'obsidian-dev-utils/async-events';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { SettingEx } from 'obsidian-dev-utils/obsidian/setting-ex';
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

type BindFn = (params: MockBindParams) => unknown;

interface BindTarget {
  bind: BindFn;
}

interface MockBindOptions {
  onChanged(): void;
}

interface MockBindParams {
  onChanged?(): void;
  readonly propertyName: string;
  readonly valueComponent: unknown;
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
      setDestructive: vi.fn().mockReturnThis(),
      setTooltip: vi.fn().mockReturnThis()
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
  // The declarative rows are handed a plain `Setting` that dev-utils re-prototypes into a `SettingEx`;
  // The mock instance already is one, so adoption is the identity.
  adoptSettingEx: (setting: unknown): unknown => setting,
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

/**
 * Flattens the declared items into the rows they contain, unwrapping the groups.
 *
 * @param tab - The settings tab.
 * @returns The declared rows.
 */
function collectRows(tab: PluginSettingsTab): SettingDefinition[] {
  const rows: SettingDefinition[] = [];
  for (const item of tab.getSettingDefinitions()) {
    if ('items' in item) {
      rows.push(...castTo<SettingDefinition[]>(item.items ?? []));
    } else {
      rows.push(castTo<SettingDefinition>(item));
    }
  }

  return rows;
}

/**
 * Reads the names of the declared rows.
 *
 * @param tab - The settings tab.
 * @returns The names.
 */
function getSettingNames(tab: PluginSettingsTab): string[] {
  return collectRows(tab).map((row) => 'name' in row ? row.name : '');
}

/**
 * Invokes every declared row's `render` callback the way Obsidian does when the tab is opened, so the
 * bindings are still exercised now that the rows are declarative.
 *
 * @param tab - The settings tab.
 */
function renderRows(tab: PluginSettingsTab): void {
  for (const row of collectRows(tab)) {
    if ('render' in row) {
      row.render(new SettingEx(tab.containerEl), castTo<SettingGroup>(null));
    }
  }
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
      const EXPECTED_SETTING_COUNT = 10;
      expect(collectRows(tab).length).toBeGreaterThanOrEqual(EXPECTED_SETTING_COUNT);
    });

    it('should group the rows under the expected headings', () => {
      const headings = tab.getSettingDefinitions().map((item) => 'heading' in item ? item.heading : '');

      expect(headings).toStrictEqual(['Paths', 'Desktop', 'Mobile', 'Code button blocks', 'Other']);
    });

    it('should create Script modules root setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Script modules root');
    });

    it('should create Invocable scripts folder setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Invocable scripts folder');
    });

    it('should create Startup script path setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Startup script path');
    });

    it('should create Hotkeys setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Hotkeys');
    });

    it('should create Mobile changes checking interval setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Mobile: Changes checking interval');
    });

    it('should create Desktop synchronous fallback setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Desktop: Synchronous fallback');
    });

    it('should create Handle protocol URLs setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Handle protocol URLs');
    });

    it('should create Should show temp plugin load/unload notices setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Should show temp plugin load/unload notices');
    });

    it('should create Default code button config setting', () => {
      renderRows(tab);

      expect(getSettingNames(tab)).toContain('Default code button config');
    });

    it('should bind text inputs to settings', () => {
      renderRows(tab);

      expect(bindCalls.length).toBeGreaterThan(0);
    });

    it('should bind modulesRoot with onChanged callback that triggers modulesRootChanged', () => {
      renderRows(tab);

      const modulesRootBindCall = findBindCall('modulesRoot');
      expect(modulesRootBindCall).toBeDefined();

      const options = modulesRootBindCall?.options;
      expect(options?.onChanged).toBeDefined();

      // Invoking the onChanged callback triggers the modulesRootChanged event without throwing.
      options?.onChanged();
      expect(mockTextInstances[0]).toBeDefined();
    });

    it('should bind invocableScriptsFolder setting', () => {
      renderRows(tab);

      expect(findBindCall('invocableScriptsFolder')).toBeDefined();
    });

    it('should bind startupScriptPath setting', () => {
      renderRows(tab);

      expect(findBindCall('startupScriptPath')).toBeDefined();
    });

    it('should bind mobileChangesCheckingIntervalInSeconds setting', () => {
      renderRows(tab);

      expect(findBindCall('mobileChangesCheckingIntervalInSeconds')).toBeDefined();
    });

    it('should bind shouldUseSyncFallback setting', () => {
      renderRows(tab);

      expect(findBindCall('shouldUseSyncFallback')).toBeDefined();
    });

    it('should bind shouldHandleProtocolUrls setting', () => {
      renderRows(tab);

      expect(findBindCall('shouldHandleProtocolUrls')).toBeDefined();
    });

    it('should bind shouldShowTempPluginLoadUnloadNotices setting', () => {
      renderRows(tab);

      expect(findBindCall('shouldShowTempPluginLoadUnloadNotices')).toBeDefined();
    });

    it('should bind defaultCodeButtonConfig setting', () => {
      renderRows(tab);

      expect(findBindCall('defaultCodeButtonConfig')).toBeDefined();
    });

    it('should configure hotkeys button that opens hotkeys tab', () => {
      renderRows(tab);

      const buttonCalls = mockSettingExAddButton.mock.calls;
      expect(buttonCalls.length).toBeGreaterThan(0);
    });

    it('should create reset to defaults button with onClick handler', () => {
      const mockEditAndSave = vi.fn().mockResolvedValue(undefined);
      const tabWithMock = createTab({ editAndSave: mockEditAndSave });

      renderRows(tabWithMock);

      expect(mockSettingExAddButton).toHaveBeenCalled();
    });

    it('should invoke modulesRootChanged event which calls onChanged and refresh on dependent settings', () => {
      renderRows(tab);

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
      renderRows(tab);

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

      renderRows(tabWithMock);

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

      renderRows(tabWithMock);

      // First button click handler is for "Reset to plugin default code button config" (in Code button blocks group).
      const RESET_BUTTON_INDEX = 0;
      const resetClickHandler = mockButtonClickHandlers[RESET_BUTTON_INDEX];
      expect(resetClickHandler).toBeDefined();

      resetClickHandler?.();

      expect(mockEditAndSave).toHaveBeenCalled();
    });

    it('should return empty string from modulesRoot PathSuggest getRootPath', () => {
      renderRows(tab);

      // First PathSuggest instance is for modulesRoot (getRootPath returns '').
      const PATH_SUGGEST_INDEX_MODULES_ROOT = 0;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_MODULES_ROOT]?.getRootPath();
      expect(rootPath).toBe('');
    });

    it('should return modulesRoot from startupScriptPath PathSuggest getRootPath', () => {
      const tabWithMock = createTab({ modulesRoot: 'startup/root' });

      mockPathSuggestInstances.length = 0;

      renderRows(tabWithMock);

      // Third PathSuggest instance is for startupScriptPath.
      const PATH_SUGGEST_INDEX_STARTUP = 2;
      const rootPath = mockPathSuggestInstances[PATH_SUGGEST_INDEX_STARTUP]?.getRootPath();
      expect(rootPath).toBe('startup/root');
    });

    it('should return modulesRoot from invocableScriptsFolder PathSuggest getRootPath', () => {
      const tabWithMock = createTab({ modulesRoot: 'custom/root' });

      mockPathSuggestInstances.length = 0;

      renderRows(tabWithMock);

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

    // The reset button asks Obsidian to re-render the tab; there is no rendered tab in a unit test.
    createdTab.refresh = vi.fn();

    // Record bind invocations while delegating to the real base-class `bind`.
    const originalBind = castTo<BindFn>(createdTab.bind.bind(createdTab));
    castTo<BindTarget>(createdTab).bind = vi.fn((bindParams: MockBindParams) => {
      const options = bindParams.onChanged ? { onChanged: bindParams.onChanged } : undefined;
      bindCalls.push({ options, propertyName: bindParams.propertyName });
      return originalBind(bindParams);
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
