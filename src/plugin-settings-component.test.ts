import type { App } from 'obsidian';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettings } from './plugin-settings.ts';

interface LegacySettingsInstance {
  invocableScriptsDirectory: string;
}

interface PluginSettingsComponentPrivateApi {
  createDefaultSettings(): PluginSettings;
  registerLegacySettingsConverters(): void;
  registerValidators(): void;
}

const mockParseYaml = vi.fn();
const mockRegisterLegacySettingsConverter = vi.fn();
const mockRegisterValidator = vi.fn();

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  parseYaml: (...args: unknown[]): unknown => mockParseYaml(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/components/plugin-settings-component', () => ({
  PluginSettingsComponentBase: class MockPluginSettingsComponentBase {
    public settings: unknown = {};

    public registerLegacySettingsConverter(...args: unknown[]): void {
      mockRegisterLegacySettingsConverter(...args);
    }

    public registerValidator(...args: unknown[]): void {
      mockRegisterValidator(...args);
    }
  }
}));

vi.mock('obsidian-dev-utils/path', () => ({
  extname: (path: string): string => {
    const dotIndex = path.lastIndexOf('.');
    return dotIndex === -1 ? '' : path.slice(dotIndex);
  },
  join: (...segments: string[]): string => segments.join('/')
}));

vi.mock('./require-handlers/require-handler.ts', () => ({
  EXTENSIONS: ['.js', '.ts']
}));

describe('PluginSettingsComponent', () => {
  let component: PluginSettingsComponent;
  let mockApp: App;

  beforeEach(() => {
    mockParseYaml.mockReset();
    mockRegisterLegacySettingsConverter.mockReset();
    mockRegisterValidator.mockReset();

    const partialAdapter: Partial<App['vault']['adapter']> = {
      stat: vi.fn() as App['vault']['adapter']['stat']
    };
    const partialVault: Partial<App['vault']> = {
      adapter: partialAdapter as App['vault']['adapter'],
      exists: vi.fn() as App['vault']['exists']
    };
    const partialApp: Partial<App> = {
      vault: partialVault as App['vault']
    };
    mockApp = partialApp as App;

    component = new PluginSettingsComponent({
      app: mockApp,
      dataHandler: {} as never
    });
  });

  describe('parseDefaultCodeButtonConfig', () => {
    it('should return empty object when yaml is empty string', () => {
      const result = component.parseDefaultCodeButtonConfig('');
      expect(result).toEqual({});
    });

    it('should return empty object when yaml is undefined and settings default is empty', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to override readonly getter
      (component as unknown as { settings: PluginSettings }).settings = new PluginSettings();
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

    it('should use settings.defaultCodeButtonConfig when yaml argument is undefined', () => {
      const mutableSettings = new PluginSettings();
      mutableSettings.defaultCodeButtonConfig = '---\ncaption: Default\n---';
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to override readonly getter
      (component as unknown as { settings: PluginSettings }).settings = mutableSettings;
      mockParseYaml.mockReturnValue({ caption: 'Default' });
      const result = component.parseDefaultCodeButtonConfig();
      expect(result).toEqual({ caption: 'Default' });
    });
  });

  describe('createDefaultSettings', () => {
    it('should return a PluginSettings instance', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      const result = (component as unknown as PluginSettingsComponentPrivateApi).createDefaultSettings();
      expect(result).toBeInstanceOf(PluginSettings);
    });
  });

  describe('registerLegacySettingsConverters', () => {
    it('should call registerLegacySettingsConverter with a converter function', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerLegacySettingsConverters();
      expect(mockRegisterLegacySettingsConverter).toHaveBeenCalledOnce();
    });

    it('should convert invocableScriptsDirectory to invocableScriptsFolder', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerLegacySettingsConverters();
      const converterFn = mockRegisterLegacySettingsConverter.mock.calls[0]?.[1] as (settings: Record<string, string>) => void;
      const legacySettings = { invocableScriptsDirectory: 'my-scripts', invocableScriptsFolder: '' };
      converterFn(legacySettings);
      expect(legacySettings.invocableScriptsFolder).toBe('my-scripts');
    });

    it('should not overwrite invocableScriptsFolder when invocableScriptsDirectory is empty', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerLegacySettingsConverters();
      const converterFn = mockRegisterLegacySettingsConverter.mock.calls[0]?.[1] as (settings: Record<string, string>) => void;
      const legacySettings = { invocableScriptsDirectory: '', invocableScriptsFolder: 'existing' };
      converterFn(legacySettings);
      expect(legacySettings.invocableScriptsFolder).toBe('existing');
    });

    it('should pass LegacySettings class that has invocableScriptsDirectory defaulting to empty string', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerLegacySettingsConverters();
      const LegacySettingsClass = mockRegisterLegacySettingsConverter.mock.calls[0]?.[0] as new () => LegacySettingsInstance;
      const instance = new LegacySettingsClass();
      expect(instance.invocableScriptsDirectory).toBe('');
    });
  });

  describe('registerValidators', () => {
    it('should register validators for all settings fields', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
      const EXPECTED_VALIDATOR_COUNT = 4;
      expect(mockRegisterValidator).toHaveBeenCalledTimes(EXPECTED_VALIDATOR_COUNT);
    });

    it('should register a modulesRoot validator', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
      const validatorNames = mockRegisterValidator.mock.calls.map((call) => call[0] as string);
      expect(validatorNames).toContain('modulesRoot');
    });

    it('should register an invocableScriptsFolder validator', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
      const validatorNames = mockRegisterValidator.mock.calls.map((call) => call[0] as string);
      expect(validatorNames).toContain('invocableScriptsFolder');
    });

    it('should register a startupScriptPath validator', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
      const validatorNames = mockRegisterValidator.mock.calls.map((call) => call[0] as string);
      expect(validatorNames).toContain('startupScriptPath');
    });

    it('should register a defaultCodeButtonConfig validator', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
      (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
      const validatorNames = mockRegisterValidator.mock.calls.map((call) => call[0] as string);
      expect(validatorNames).toContain('defaultCodeButtonConfig');
    });

    describe('modulesRoot validator', () => {
      it('should return undefined for empty value', async () => {
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'modulesRoot');
        const validator = validatorCall?.[1] as (value: string) => Promise<string | undefined>;
        const result = await validator('');
        expect(result).toBeUndefined();
      });

      it('should return error when path does not exist', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'modulesRoot');
        const validator = validatorCall?.[1] as (value: string) => Promise<string | undefined>;
        const result = await validator('some/path');
        expect(result).toBe('Path does not exist');
      });

      it('should return error when path is not a folder', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        vi.mocked(mockApp.vault.adapter.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'file' });
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'modulesRoot');
        const validator = validatorCall?.[1] as (value: string) => Promise<string | undefined>;
        const result = await validator('some/path');
        expect(result).toBe('Path is not a folder');
      });

      it('should return undefined when path is a valid folder', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        vi.mocked(mockApp.vault.adapter.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'folder' });
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'modulesRoot');
        const validator = validatorCall?.[1] as (value: string) => Promise<string | undefined>;
        const result = await validator('some/path');
        expect(result).toBeUndefined();
      });
    });

    describe('invocableScriptsFolder validator', () => {
      it('should return undefined for empty value', async () => {
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'invocableScriptsFolder');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const result = await validator('', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should validate joined path with modulesRoot', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'invocableScriptsFolder');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const settings = new PluginSettings();
        settings.modulesRoot = 'root';
        const result = await validator('scripts', settings);
        expect(result).toBe('Path does not exist');
      });
    });

    describe('startupScriptPath validator', () => {
      it('should return undefined for empty value', async () => {
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'startupScriptPath');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const result = await validator('', new PluginSettings());
        expect(result).toBeUndefined();
      });

      it('should return error for unsupported extension', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        vi.mocked(mockApp.vault.adapter.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'file' });
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'startupScriptPath');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const settings = new PluginSettings();
        const result = await validator('startup.py', settings);
        expect(result).toContain('Only the following extensions are supported');
      });

      it('should return undefined for supported extension', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        vi.mocked(mockApp.vault.adapter.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'file' });
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'startupScriptPath');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const settings = new PluginSettings();
        const result = await validator('startup.ts', settings);
        expect(result).toBeUndefined();
      });

      it('should return path validation error when path does not exist', async () => {
        vi.mocked(mockApp.vault.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'startupScriptPath');
        const validator = validatorCall?.[1] as (value: string, settings: PluginSettings) => Promise<string | undefined>;
        const settings = new PluginSettings();
        const result = await validator('startup.ts', settings);
        expect(result).toBe('Path does not exist');
      });
    });

    describe('defaultCodeButtonConfig validator', () => {
      it('should return undefined for valid YAML', () => {
        mockParseYaml.mockReturnValue({ caption: 'Run' });
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'defaultCodeButtonConfig');
        const validator = validatorCall?.[1] as (value: string) => string | undefined;
        const result = validator('---\ncaption: Run\n---');
        expect(result).toBeUndefined();
      });

      it('should return Invalid YAML for invalid format', () => {
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected methods
        (component as unknown as PluginSettingsComponentPrivateApi).registerValidators();
        const validatorCall = mockRegisterValidator.mock.calls.find((call) => call[0] === 'defaultCodeButtonConfig');
        const validator = validatorCall?.[1] as (value: string) => string | undefined;
        const result = validator('not valid yaml format');
        expect(result).toBe('Invalid YAML');
      });
    });
  });
});
