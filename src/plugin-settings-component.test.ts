import type { App as ObsidianApp } from 'obsidian';
import type { SettingsValidator } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';
import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import type { GenericObject } from 'obsidian-dev-utils/type-guards';

import {
  noop,
  noopAsync
} from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { assertNonNullable } from 'obsidian-dev-utils/type-guards';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettings } from './plugin-settings.ts';

interface LegacyConverter {
  converter(record: GenericObject): void;
  legacySettingsClass: new () => LegacySettingsInstance;
}

interface LegacySettingsInstance {
  invocableScriptsDirectory: string;
}

interface PluginSettingsComponentPrivateApi {
  registerLegacySettingsConverters(): void;
  registerValidators(): void;
}

interface RegisteredValidator {
  propertyName: string;
  validator: SettingsValidator<PluginSettings>;
}

const mockParseYaml = vi.fn();

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  parseYaml: (...args: unknown[]): unknown => mockParseYaml(...args)
}));

vi.mock('./require-handlers/require-handler.ts', () => ({
  EXTENSIONS: ['.js', '.ts']
}));

describe('PluginSettingsComponent', () => {
  let component: PluginSettingsComponent;
  let mockApp: ObsidianApp;
  let registeredValidators: RegisteredValidator[];
  let registeredLegacyConverters: LegacyConverter[];
  let mockExists: ReturnType<typeof vi.fn>;
  let mockStat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockParseYaml.mockReset();

    mockExists = vi.fn();
    mockStat = vi.fn();
    registeredValidators = [];
    registeredLegacyConverters = [];

    const appMock = App.createConfigured__();
    mockApp = appMock.asOriginalType__();
    mockApp.vault.exists = mockExists as ObsidianApp['vault']['exists'];
    mockApp.vault.adapter.stat = mockStat as ObsidianApp['vault']['adapter']['stat'];

    vi.spyOn(PluginSettingsComponentBase.prototype, 'registerValidator').mockImplementation(
      (propertyName, validator) => {
        registeredValidators.push({
          propertyName,
          validator: validator as SettingsValidator<PluginSettings>
        });
      }
    );
    vi.spyOn(PluginSettingsComponentBase.prototype, 'registerLegacySettingsConverter').mockImplementation(
      (legacySettingsClass, converter) => {
        registeredLegacyConverters.push({
          converter: converter as (record: GenericObject) => void,
          legacySettingsClass: legacySettingsClass as new () => LegacySettingsInstance
        });
      }
    );

    component = new PluginSettingsComponent({
      app: mockApp,
      dataHandler: createMockDataHandler(),
      pluginEventSource: createMockPluginEventSource()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseDefaultCodeButtonConfig', () => {
    it('should return empty object when yaml is empty string', () => {
      const result = component.parseDefaultCodeButtonConfig('');
      expect(result).toEqual({});
    });

    it('should return empty object when yaml is undefined and settings default is empty', () => {
      const result = component.parseDefaultCodeButtonConfig();
      expect(result).toEqual({});
    });

    it('should return null when yaml has no --- delimiters', () => {
      const result = component.parseDefaultCodeButtonConfig('invalid yaml');
      expect(result).toBeNull();
    });

    it('should return null when yaml has only opening ---', () => {
      const result = component.parseDefaultCodeButtonConfig('---\nsome: value');
      expect(result).toBeNull();
    });

    it('should parse valid YAML with content between delimiters', () => {
      const parsedResult = { caption: 'Run' };
      mockParseYaml.mockReturnValue(parsedResult);
      const result = component.parseDefaultCodeButtonConfig('---\ncaption: Run\n---');
      expect(result).toBe(parsedResult);
      expect(mockParseYaml).toHaveBeenCalledWith('caption: Run');
    });

    it('should parse empty YAML between delimiters', () => {
      mockParseYaml.mockReturnValue({});
      const result = component.parseDefaultCodeButtonConfig('---\n---');
      expect(result).toEqual({});
      expect(mockParseYaml).toHaveBeenCalledWith('');
    });

    it('should return null when parseYaml throws', () => {
      mockParseYaml.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });
      const result = component.parseDefaultCodeButtonConfig('---\nbad: [yaml\n---');
      expect(result).toBeNull();
    });

    it('should use settings.defaultCodeButtonConfig when yaml argument is undefined', async () => {
      mockParseYaml.mockReturnValue({ caption: 'Default' });
      const dataComponent = new PluginSettingsComponent({
        app: mockApp,
        dataHandler: createMockDataHandler({ defaultCodeButtonConfig: '---\ncaption: Default\n---' }),
        pluginEventSource: createMockPluginEventSource()
      });
      await dataComponent.loadWithPromises();
      const result = dataComponent.parseDefaultCodeButtonConfig();
      expect(result).toEqual({ caption: 'Default' });
    });
  });

  describe('registerLegacySettingsConverters', () => {
    it('should call registerLegacySettingsConverter with a converter function', () => {
      registeredLegacyConverters.length = 0;
      castTo<PluginSettingsComponentPrivateApi>(component).registerLegacySettingsConverters();
      expect(registeredLegacyConverters).toHaveLength(1);
      expect(typeof registeredLegacyConverters[0]?.converter).toBe('function');
    });

    it('should convert invocableScriptsDirectory to invocableScriptsFolder', () => {
      const converterFn = getRegisteredLegacyConverter();
      const legacySettings = { invocableScriptsDirectory: 'my-scripts', invocableScriptsFolder: '' };
      converterFn(legacySettings);
      expect(legacySettings.invocableScriptsFolder).toBe('my-scripts');
    });

    it('should not overwrite invocableScriptsFolder when invocableScriptsDirectory is empty', () => {
      const converterFn = getRegisteredLegacyConverter();
      const legacySettings = { invocableScriptsDirectory: '', invocableScriptsFolder: 'existing' };
      converterFn(legacySettings);
      expect(legacySettings.invocableScriptsFolder).toBe('existing');
    });

    it('should pass LegacySettings class that has invocableScriptsDirectory defaulting to empty string', () => {
      const entry = registeredLegacyConverters[0];
      assertNonNullable(entry);
      const instance = new entry.legacySettingsClass();
      expect(instance.invocableScriptsDirectory).toBe('');
    });
  });

  describe('registerValidators', () => {
    it('should register validators for all settings fields', () => {
      registeredValidators.length = 0;
      castTo<PluginSettingsComponentPrivateApi>(component).registerValidators();
      const EXPECTED_VALIDATOR_COUNT = 4;
      expect(registeredValidators).toHaveLength(EXPECTED_VALIDATOR_COUNT);
    });

    it('should register a modulesRoot validator', () => {
      expect(getRegisteredValidatorNames()).toContain('modulesRoot');
    });

    it('should register an invocableScriptsFolder validator', () => {
      expect(getRegisteredValidatorNames()).toContain('invocableScriptsFolder');
    });

    it('should register a startupScriptPath validator', () => {
      expect(getRegisteredValidatorNames()).toContain('startupScriptPath');
    });

    it('should register a defaultCodeButtonConfig validator', () => {
      expect(getRegisteredValidatorNames()).toContain('defaultCodeButtonConfig');
    });

    describe('modulesRoot validator', () => {
      it('should return undefined for empty value', async () => {
        const validator = getRegisteredValidator('modulesRoot');
        const result = await validator('', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should return error when path does not exist', async () => {
        mockExists.mockResolvedValue(false);
        const validator = getRegisteredValidator('modulesRoot');
        const result = await validator('some/path', new PluginSettings());
        expect(result).toBe('Path does not exist');
      });

      it('should return error when path is not a folder', async () => {
        mockExists.mockResolvedValue(true);
        mockStat.mockResolvedValue({ type: 'file' });
        const validator = getRegisteredValidator('modulesRoot');
        const result = await validator('some/path', new PluginSettings());
        expect(result).toBe('Path is not a folder');
      });

      it('should return undefined when path is a valid folder', async () => {
        mockExists.mockResolvedValue(true);
        mockStat.mockResolvedValue({ type: 'folder' });
        const validator = getRegisteredValidator('modulesRoot');
        const result = await validator('some/path', new PluginSettings());
        expect(result).toBeUndefined();
      });
    });

    describe('invocableScriptsFolder validator', () => {
      it('should return undefined for empty value', async () => {
        const validator = getRegisteredValidator('invocableScriptsFolder');
        const result = await validator('', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should validate joined path with modulesRoot', async () => {
        mockExists.mockResolvedValue(false);
        const validator = getRegisteredValidator('invocableScriptsFolder');
        const settings = new PluginSettings();
        settings.modulesRoot = 'root';
        const result = await validator('scripts', settings);
        expect(result).toBe('Path does not exist');
        expect(mockExists).toHaveBeenCalledWith('root/scripts');
      });
    });

    describe('startupScriptPath validator', () => {
      it('should return undefined for empty value', async () => {
        const validator = getRegisteredValidator('startupScriptPath');
        const result = await validator('', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should return error for unsupported extension', async () => {
        mockExists.mockResolvedValue(true);
        mockStat.mockResolvedValue({ type: 'file' });
        const validator = getRegisteredValidator('startupScriptPath');
        const result = await validator('startup.py', new PluginSettings());
        expect(result).toContain('Only the following extensions are supported');
      });

      it('should return undefined for supported extension', async () => {
        mockExists.mockResolvedValue(true);
        mockStat.mockResolvedValue({ type: 'file' });
        const validator = getRegisteredValidator('startupScriptPath');
        const result = await validator('startup.ts', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should return path validation error when path does not exist', async () => {
        mockExists.mockResolvedValue(false);
        const validator = getRegisteredValidator('startupScriptPath');
        const result = await validator('startup.ts', new PluginSettings());
        expect(result).toBe('Path does not exist');
      });
    });

    describe('defaultCodeButtonConfig validator', () => {
      it('should return undefined for valid YAML', async () => {
        mockParseYaml.mockReturnValue({ caption: 'Run' });
        const validator = getRegisteredValidator('defaultCodeButtonConfig');
        const result = await validator('---\ncaption: Run\n---', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should return Invalid YAML for invalid format', async () => {
        const validator = getRegisteredValidator('defaultCodeButtonConfig');
        const result = await validator('not valid yaml format', new PluginSettings());
        expect(result).toBe('Invalid YAML');
      });
    });
  });

  function createMockDataHandler(data: unknown = {}): DataHandler {
    return strictProxy<DataHandler>({
      loadData: vi.fn(() => Promise.resolve(data)),
      saveData: vi.fn(() => noopAsync())
    });
  }

  function createMockPluginEventSource(): PluginEventSource {
    const source: PluginEventSource = strictProxy<PluginEventSource>({
      offref: noop,
      on: castTo<PluginEventSource['on']>(vi.fn((name: string, callback: () => void, thisArg?: unknown) => ({
        asyncEventSource: source,
        callback,
        name,
        thisArg
      })))
    });
    return source;
  }

  function getRegisteredLegacyConverter(): (record: GenericObject) => void {
    const entry = registeredLegacyConverters[0];
    assertNonNullable(entry);
    return entry.converter;
  }

  function getRegisteredValidator(propertyName: string): SettingsValidator<PluginSettings> {
    const entry = registeredValidators.find((v) => v.propertyName === propertyName);
    assertNonNullable(entry);
    return entry.validator;
  }

  function getRegisteredValidatorNames(): string[] {
    return registeredValidators.map((v) => v.propertyName);
  }
});
