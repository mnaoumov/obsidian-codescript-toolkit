import type { App } from 'obsidian';

import { FileSystemAdapter } from 'obsidian';
import { registerPatch } from 'obsidian-dev-utils/obsidian/monkey-around';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireOptions } from '../types.ts';
import type { RequireHandlerConstructorParams } from './require-handler.ts';

import {
  CacheInvalidationMode,
  ModuleType
} from '../types.ts';
import { RequireHandlerDesktop } from './require-handler-desktop.ts';
import {
  MODULE_NAME_SEPARATOR,
  PATH_SUFFIXES,
  RequireHandlerBase,
  ResolvedType
} from './require-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/components/all-windows-event-handler', () => ({
  AllWindowsEventHandler: class {
    public registerAllWindowsHandler(): void {
      // Stub
    }
  }
}));

vi.mock('obsidian-typings/implementations', () => ({
  getDataAdapterEx: vi.fn().mockReturnValue({ basePath: '/vault' }),
  loadPrism: vi.fn()
}));

vi.mock('debuggable-eval', () => ({
  debuggableEval: vi.fn()
}));

vi.mock('../obsidian-dev-utils-module.ts', () => ({
  registerObsidianDevUtilsModule: vi.fn()
}));

vi.mock('../special-module-names.ts', () => ({
  SPECIAL_MODULE_NAMES: {
    asarPackedModuleNames: [],
    deprecatedObsidianBuiltInModuleNames: [],
    electronModuleNames: [],
    nodeBuiltInModuleNames: [],
    obsidianBuiltInModuleNames: []
  }
}));

vi.mock('../code-script-toolkit-module-impl.ts', () => ({
  CodeScriptToolkitModuleImpl: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/monkey-around', () => ({
  registerPatch: vi.fn()
}));

vi.mock('obsidian-dev-utils/object-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('obsidian-dev-utils/object-utils')>();
  return {
    ...actual,
    getPrototypeOf: vi.fn().mockReturnValue({})
  };
});

// eslint-disable-next-line obsidianmd/hardcoded-config-path -- test mock value
const MOCK_CONFIG_DIR = '.obsidian';
const MOCK_MTIME_MS = 1234567890;

interface CurrentModulesTimestampChainAccessor {
  currentModulesTimestampChain: Set<string>;
}

interface FileSystemAdapterAccessor {
  fileSystemAdapter: FileSystemAdapter;
}

interface FileSystemAdapterFsAccessor {
  fileSystemAdapter: MockFileSystemAdapterFs;
}

interface FileSystemAdapterFsPromisesAccessor {
  fileSystemAdapter: MockFileSystemAdapterFsPromises;
}

interface FindExistingFilePathAccessor {
  findExistingFilePath(path: string): null | string;
}

interface FsAccessor {
  fs: MockFs;
}

interface FsPromisesAccessor {
  fsPromises: MockFsPromises;
}

interface GetCachedModuleAccessor {
  getCachedModule(id: string): unknown;
}

interface GetDependenciesTimestampAccessor {
  getDependenciesTimestampChangedAndReloadIfNeeded(path: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): number;
}

interface GetParentPathFromCallStackAccessor {
  getParentPathFromCallStack(callerLineIndex: number): null | string;
}

interface GetRootFolderAccessor {
  getRootFolder(cwd: string): null | string;
}

interface GetRootFoldersAccessor {
  getRootFolders(folder: string): string[];
}

interface GetTimestampAccessor {
  getTimestamp(path: string): number;
}

interface GetUrlDependencyErrorMessageAccessor {
  getUrlDependencyErrorMessage(path: string, resolvedId: string, cacheInvalidationMode?: CacheInvalidationMode): string;
}

interface InitModuleAndAddToCacheAccessor {
  initModuleAndAddToCache(id: string, moduleInitializer: () => unknown): unknown;
}

interface MockFileSystemAdapterFs {
  fs: MockFs;
}

interface MockFileSystemAdapterFsPromises {
  fsPromises: MockFsPromises;
}

interface MockFs {
  existsSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  statSync: ReturnType<typeof vi.fn>;
}

interface MockFsPromises {
  mkdir: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  rm: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
}

interface MockModuleDependenciesAccessor {
  moduleDependencies: Map<string, Set<string>>;
}

interface MockVaultAbsolutePathAccessor {
  _vaultAbsolutePath: string;
}

interface MockVaultAbsolutePathUndefinedAccessor {
  _vaultAbsolutePath: undefined;
}

interface ModulePrototypeRequireAccessor {
  modulePrototypeRequire(id: string, module: NodeJS.Module): unknown;
}

interface ModulesRootSetting {
  modulesRoot: string;
}

interface OriginalModulePrototypeRequireAccessor {
  originalModulePrototypeRequire: unknown;
}

interface OriginalModulePrototypeRequireWrappedAccessor {
  originalModulePrototypeRequireWrapped(id: string, options: Partial<RequireOptions>): unknown;
}

interface PatchRequireConfig {
  require: (next: unknown) => unknown;
}

interface PatchRequireConfigWithReturn {
  require: (next: unknown) => (id: string) => unknown;
}

interface PluginSettingsModulesRootAccessor {
  pluginSettingsComponent: PluginSettingsWithModulesRoot;
}

interface PluginSettingsSyncFallbackAccessor {
  pluginSettingsComponent: PluginSettingsWithSyncFallback;
}

interface PluginSettingsWithModulesRoot {
  settings: ModulesRootSetting;
}

interface PluginSettingsWithSyncFallback {
  settings: SyncFallbackSetting;
}

interface ReadFileAccessor {
  readFile(path: string): string;
}

interface ReadPackageJsonAccessor {
  readPackageJson(path: string): unknown;
}

interface RequireJsonAccessor {
  requireJson(path: string): unknown;
}

interface RequireJsTsAccessor {
  requireJsTs(path: string): unknown;
}

interface RequireMdAccessor {
  requireMd(path: string): unknown;
}

interface RequireModuleAccessor {
  requireModule(moduleName: string, parentFolder: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): unknown;
}

interface RequirePathAccessor {
  requirePath(path: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): unknown;
}

interface RequirePathImplAccessor {
  requirePathImpl(path: string, moduleType?: ModuleType): unknown;
}

interface RequireSpecialModuleAccessor {
  requireSpecialModule(id: string, options: Partial<RequireOptions>): unknown;
}

interface RequireStringAccessor {
  requireString(code: string, path: string): unknown;
}

interface RequireStringImplAccessor {
  requireStringImpl(options: unknown): RequireStringImplResult;
}

interface RequireStringImplResult {
  exportsFn: () => unknown;
  promisable: unknown;
}

interface RequireWasmAccessor {
  requireWasm(path: string): unknown;
}

interface ResolveAccessor {
  resolve(id: string, parentPath?: string): ResolveResult;
}

interface ResolveResult {
  resolvedId: string;
  resolvedType: ResolvedType;
}

interface SyncFallbackSetting {
  shouldUseSyncFallback: boolean;
}

interface WriteFileBinaryAsyncAccessor {
  writeFileBinaryAsync(path: string, arrayBuffer: ArrayBuffer): Promise<void>;
}

let mockFs: MockFs;
let mockFsPromises: MockFsPromises;
let mockOriginalModulePrototypeRequire: ReturnType<typeof vi.fn>;

class TestableRequireHandlerDesktop extends RequireHandlerDesktop {
  public exposeCanRequireNonCached(type: ResolvedType): boolean {
    return this.canRequireNonCached(type);
  }

  public exposeHandleCodeWithTopLevelAwait(path: string): void {
    this.handleCodeWithTopLevelAwait(path);
  }

  public exposeRequireAsarPackedModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.requireAsarPackedModule(id, options);
  }

  public exposeRequireElectronModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.requireElectronModule(id, options);
  }

  public async exposeRequireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    return this.requireNodeBinaryAsync(path, arrayBuffer);
  }

  public exposeRequireNodeBuiltInModule(id: string): unknown {
    return this.requireNodeBuiltInModule(id);
  }

  public exposeRequireNonCached(id: string, type: ResolvedType, options: Partial<RequireOptions>): unknown {
    return this.requireNonCached(id, type, options);
  }

  public getModulesCache(): NodeJS.Dict<NodeJS.Module> {
    return this.modulesCache;
  }

  public getModuleTimestamps(): Map<string, number> {
    return this.moduleTimestamps;
  }

  public setMockFs(fs: MockFs): void {
    // eslint-disable-next-line no-restricted-syntax -- accessing private internals
    this['_fs'] = fs as unknown as typeof import('node:fs');
  }

  public setMockFsPromises(fsPromises: MockFsPromises): void {
    // eslint-disable-next-line no-restricted-syntax -- accessing private internals
    this['_fsPromises'] = fsPromises as unknown as typeof import('node:fs/promises');
  }

  public setOriginalModulePrototypeRequire(fn: ReturnType<typeof vi.fn>): void {
    // eslint-disable-next-line no-restricted-syntax -- accessing private internals
    this['originalModulePrototypeRequire'] = fn as unknown as typeof require;
  }

  public unsetFs(): void {
    // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to unset private field
    this['_fs'] = undefined as unknown as typeof import('node:fs');
  }

  public unsetFsPromises(): void {
    // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to unset private field
    this['_fsPromises'] = undefined as unknown as typeof import('node:fs/promises');
  }
}

function createHandler(): TestableRequireHandlerDesktop {
  const params = createMockConstructorParams();
  const handler = new TestableRequireHandlerDesktop(params);

  mockFs = {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
    statSync: vi.fn().mockReturnValue({ isDirectory: (): boolean => false, isFile: (): boolean => false, mtimeMs: MOCK_MTIME_MS })
  };

  mockFsPromises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('file content')),
    rm: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ mtimeMs: MOCK_MTIME_MS }),
    writeFile: vi.fn().mockResolvedValue(undefined)
  };

  mockOriginalModulePrototypeRequire = vi.fn();

  handler.setMockFs(mockFs);
  handler.setMockFsPromises(mockFsPromises);
  handler.setOriginalModulePrototypeRequire(mockOriginalModulePrototypeRequire);

  return handler;
}

function createMockConstructorParams(): RequireHandlerConstructorParams {
  const params: Partial<RequireHandlerConstructorParams> = {
    app: {
      vault: {
        adapter: Object.create(FileSystemAdapter.prototype) as App['vault']['adapter'],
        configDir: MOCK_CONFIG_DIR
      },
      workspace: {
        getActiveFile: vi.fn().mockReturnValue(null)
      }
    } as never,
    consoleDebugComponent: {
      debug: vi.fn()
    } as never,
    pluginRequire: vi.fn() as never,
    pluginSettingsComponent: {
      settings: {
        modulesRoot: '',
        shouldUseSyncFallback: false
      }
    } as never,
    tempPluginRegistry: {} as never
  };
  return params as RequireHandlerConstructorParams;
}

describe('RequireHandlerDesktop', () => {
  let handler: TestableRequireHandlerDesktop;

  beforeEach(() => {
    handler = createHandler();
  });

  describe('canRequireNonCached', () => {
    it('should return false for URL type', () => {
      expect(handler.exposeCanRequireNonCached(ResolvedType.Url)).toBe(false);
    });

    it('should return true for Path type', () => {
      expect(handler.exposeCanRequireNonCached(ResolvedType.Path)).toBe(true);
    });

    it('should return true for Module type', () => {
      expect(handler.exposeCanRequireNonCached(ResolvedType.Module)).toBe(true);
    });

    it('should return true for SpecialModule type', () => {
      expect(handler.exposeCanRequireNonCached(ResolvedType.SpecialModule)).toBe(true);
    });
  });

  describe('handleCodeWithTopLevelAwait', () => {
    it('should throw an error with the module path', () => {
      expect(() => {
        handler.exposeHandleCodeWithTopLevelAwait('/path/to/module.ts');
      }).toThrow(
        'Cannot load module: /path/to/module.ts.'
      );
    });

    it('should include top-level await message in the error', () => {
      expect(() => {
        handler.exposeHandleCodeWithTopLevelAwait('/path/to/module.ts');
      }).toThrow(
        'Top-level await is not supported in sync require.'
      );
    });

    it('should include suggestion to use async function', () => {
      expect(() => {
        handler.exposeHandleCodeWithTopLevelAwait('/path/to/module.ts');
      }).toThrow(
        'Consider putting them inside an async function.'
      );
    });
  });

  describe('requireAsarPackedModule', () => {
    it('should delegate to originalModulePrototypeRequire', () => {
      const EXPECTED_MODULE = { name: 'asar-module' };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED_MODULE);

      const result = handler.exposeRequireAsarPackedModule('some-asar-module', {});

      expect(result).toBe(EXPECTED_MODULE);
    });

    it('should pass the id to the original require', () => {
      handler.exposeRequireAsarPackedModule('my-asar-module', {});

      expect(mockOriginalModulePrototypeRequire).toHaveBeenCalledWith('my-asar-module', {});
    });

    it('should use parentModule from options when available', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockParentModule = { path: '/parent' } as unknown as NodeJS.Module;
      handler.exposeRequireAsarPackedModule('asar-mod', { parentModule: mockParentModule });

      expect(mockOriginalModulePrototypeRequire).toHaveBeenCalledOnce();
      const callContext = mockOriginalModulePrototypeRequire.mock.contexts[0] as unknown;
      expect(callContext).toBe(mockParentModule);
    });
  });

  describe('requireElectronModule', () => {
    it('should delegate to originalModulePrototypeRequire', () => {
      const EXPECTED_MODULE = { name: 'electron' };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED_MODULE);

      const result = handler.exposeRequireElectronModule('electron', {});

      expect(result).toBe(EXPECTED_MODULE);
    });

    it('should pass the id to the original require', () => {
      handler.exposeRequireElectronModule('electron', {});

      expect(mockOriginalModulePrototypeRequire).toHaveBeenCalledWith('electron', {});
    });
  });

  describe('requireNodeBuiltInModule', () => {
    it('should delegate to originalModulePrototypeRequire', () => {
      const MOCK_FS = { readFile: vi.fn() };
      mockOriginalModulePrototypeRequire.mockReturnValue(MOCK_FS);

      const result = handler.exposeRequireNodeBuiltInModule('node:fs');

      expect(result).toBe(MOCK_FS);
    });

    it('should call originalModulePrototypeRequire with the module id', () => {
      handler.exposeRequireNodeBuiltInModule('node:path');

      expect(mockOriginalModulePrototypeRequire).toHaveBeenCalledWith('node:path');
    });

    it('should return undefined when originalModulePrototypeRequire is not set', () => {
      // eslint-disable-next-line no-restricted-syntax -- testing undefined case
      handler.setOriginalModulePrototypeRequire(undefined as unknown as ReturnType<typeof vi.fn>);
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to unset private field
      handler['originalModulePrototypeRequire'] = undefined as unknown as typeof require;

      const result = handler.exposeRequireNodeBuiltInModule('node:fs');

      expect(result).toBeUndefined();
    });
  });

  describe('requireNonCached', () => {
    it('should throw for URL type with async advice', () => {
      expect(() => handler.exposeRequireNonCached('https://example.com/module.js', ResolvedType.Url, {})).toThrow(
        'Cannot require synchronously from URL.'
      );
    });

    it('should throw for unknown type', () => {
      expect(() => handler.exposeRequireNonCached('some-id', 'unknownType' as ResolvedType, {})).toThrow(
        'Unknown type: \'unknownType\'.'
      );
    });

    it('should call requireSpecialModule for SpecialModule type', () => {
      const requireSpecialModuleSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireSpecialModuleAccessor,
        'requireSpecialModule'
      )
        .mockReturnValue({ special: true });

      const result = handler.exposeRequireNonCached('obsidian/app', ResolvedType.SpecialModule, {});

      expect(result).toEqual({ special: true });
      requireSpecialModuleSpy.mockRestore();
    });
  });

  describe('existsFileAsync', () => {
    it('should resolve with true when file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      const result = await handler.existsFileAsync('/path/to/file.ts');

      expect(result).toBe(true);
    });

    it('should resolve with false when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handler.existsFileAsync('/path/to/missing.ts');

      expect(result).toBe(false);
    });

    it('should resolve with false when path is a directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => false });

      const result = await handler.existsFileAsync('/path/to/dir');

      expect(result).toBe(false);
    });

    it('should strip query before checking', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      await handler.existsFileAsync('/path/to/file.ts?query=1');

      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/file.ts');
    });
  });

  describe('existsFolderAsync', () => {
    it('should resolve with true when folder exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: (): boolean => true });

      const result = await handler.existsFolderAsync('/path/to/dir');

      expect(result).toBe(true);
    });

    it('should resolve with false when folder does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handler.existsFolderAsync('/path/to/missing');

      expect(result).toBe(false);
    });

    it('should resolve with false when path is a file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: (): boolean => false });

      const result = await handler.existsFolderAsync('/path/to/file.ts');

      expect(result).toBe(false);
    });

    it('should strip query before checking', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: (): boolean => true });

      await handler.existsFolderAsync('/path/to/dir?query=1');

      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/dir');
    });
  });

  describe('getTimestampAsync', () => {
    it('should return mtimeMs from file stat', async () => {
      const result = await handler.getTimestampAsync('/path/to/file.ts');

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should strip query before stat', async () => {
      await handler.getTimestampAsync('/path/to/file.ts?query=1');

      expect(mockFsPromises.stat).toHaveBeenCalledWith('/path/to/file.ts');
    });
  });

  describe('readFileAsync', () => {
    it('should return file content as string', async () => {
      mockFsPromises.readFile.mockResolvedValue('module.exports = {};');

      const result = await handler.readFileAsync('/path/to/file.ts');

      expect(result).toBe('module.exports = {};');
    });

    it('should strip query before reading', async () => {
      await handler.readFileAsync('/path/to/file.ts?query=1');

      expect(mockFsPromises.readFile).toHaveBeenCalledWith('/path/to/file.ts', 'utf8');
    });
  });

  describe('readFileBinaryAsync', () => {
    it('should return an ArrayBuffer-like object', async () => {
      const BYTE_VALUES = [1, 2, 3, 4];
      const mockBuffer = Buffer.from(BYTE_VALUES);
      mockFsPromises.readFile.mockResolvedValue(mockBuffer);

      const result = await handler.readFileBinaryAsync('/path/to/file.node');
      const view = new Uint8Array(result);

      expect(view.byteLength).toBe(BYTE_VALUES.length);
    });

    it('should strip query before reading', async () => {
      const mockBuffer = Buffer.from([]);
      mockFsPromises.readFile.mockResolvedValue(mockBuffer);

      await handler.readFileBinaryAsync('/path/to/file.node?query=1');

      expect(mockFsPromises.readFile).toHaveBeenCalledWith('/path/to/file.node');
    });

    it('should correctly slice the buffer to ArrayBuffer', async () => {
      const BYTE_VALUES = [10, 20, 30];
      const mockBuffer = Buffer.from(BYTE_VALUES);
      mockFsPromises.readFile.mockResolvedValue(mockBuffer);

      const result = await handler.readFileBinaryAsync('/path/to/file.node');
      const view = new Uint8Array(result);

      expect(view[0]).toBe(BYTE_VALUES[0]);
      expect(view[1]).toBe(BYTE_VALUES[1]);
      expect(view[2]).toBe(BYTE_VALUES[2]);
    });
  });

  describe('requireAsync', () => {
    it('should call super.requireAsync and return its result on success', async () => {
      const EXPECTED_MODULE = { loaded: true };
      const superRequireAsync = vi.spyOn(RequireHandlerBase.prototype, 'requireAsync')
        .mockResolvedValue(EXPECTED_MODULE);

      const result = await handler.requireAsync('some-module');

      expect(result).toBe(EXPECTED_MODULE);
      superRequireAsync.mockRestore();
    });

    it('should rethrow error when shouldUseSyncFallback is false', async () => {
      const superRequireAsync = vi.spyOn(RequireHandlerBase.prototype, 'requireAsync')
        .mockRejectedValue(new Error('async failed'));

      await expect(handler.requireAsync('failing-module')).rejects.toThrow('async failed');
      superRequireAsync.mockRestore();
    });

    it('should fall back to sync requireEx when shouldUseSyncFallback is true and async fails', async () => {
      const SYNC_MODULE = { syncLoaded: true };
      const superRequireAsync = vi.spyOn(RequireHandlerBase.prototype, 'requireAsync')
        .mockRejectedValue(new Error('async failed'));

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as PluginSettingsSyncFallbackAccessor).pluginSettingsComponent.settings
        .shouldUseSyncFallback = true;

      const requireExMock = vi.fn().mockReturnValue(SYNC_MODULE);
      Object.defineProperty(handler, 'requireEx', {
        configurable: true,
        get: () => requireExMock
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = await handler.requireAsync('fallback-module');

      expect(result).toBe(SYNC_MODULE);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('requireAsync(\'fallback-module\') failed with error:'), expect.anything());
      expect(warnSpy).toHaveBeenCalledWith('Trying a synchronous fallback.');

      warnSpy.mockRestore();
      superRequireAsync.mockRestore();
    });

    it('should clear currentModulesTimestampChain before sync fallback', async () => {
      const superRequireAsync = vi.spyOn(RequireHandlerBase.prototype, 'requireAsync')
        .mockRejectedValue(new Error('async failed'));

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as PluginSettingsSyncFallbackAccessor).pluginSettingsComponent.settings
        .shouldUseSyncFallback = true;

      const requireExMock = vi.fn().mockReturnValue({});
      Object.defineProperty(handler, 'requireEx', {
        configurable: true,
        get: () => requireExMock
      });
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain.add('some-chain');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await handler.requireAsync('fallback-module');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      expect((handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain.size).toBe(0);

      warnSpy.mockRestore();
      superRequireAsync.mockRestore();
    });
  });

  describe('onload', () => {
    it('should call super.onload', async () => {
      const superOnload = vi.spyOn(RequireHandlerBase.prototype, 'onload')
        .mockResolvedValue(undefined);

      Object.defineProperty(window, 'module', {
        configurable: true,
        value: { exports: {} },
        writable: true
      });

      await handler.onload();

      expect(superOnload).toHaveBeenCalledOnce();
      superOnload.mockRestore();
    });

    it('should call registerPatch with module prototype', async () => {
      const superOnload = vi.spyOn(RequireHandlerBase.prototype, 'onload')
        .mockResolvedValue(undefined);

      Object.defineProperty(window, 'module', {
        configurable: true,
        value: { exports: {} },
        writable: true
      });

      vi.mocked(registerPatch).mockClear();

      await handler.onload();

      expect(registerPatch).toHaveBeenCalledOnce();
      superOnload.mockRestore();
    });
  });

  describe('requireNodeBinaryAsync', () => {
    it('should call requireNodeBinary with the path when no arrayBuffer is provided', async () => {
      const EXPECTED_MODULE = { nativeBinary: true };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED_MODULE);

      const result = await handler.exposeRequireNodeBinaryAsync('/path/to/native.node');

      expect(result).toBe(EXPECTED_MODULE);
      expect(mockOriginalModulePrototypeRequire).toHaveBeenCalledWith('/path/to/native.node');
    });

    it('should write to temp file and clean up when arrayBuffer is provided', async () => {
      const EXPECTED_MODULE = { nativeBinary: true };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED_MODULE);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: (): boolean => true });

      const BYTE_VALUES = [1, 2, 3];
      const arrayBuffer = new Uint8Array(BYTE_VALUES).buffer;

      const result = await handler.exposeRequireNodeBinaryAsync('/path/to/native.node', arrayBuffer);

      expect(result).toBe(EXPECTED_MODULE);
      expect(mockFsPromises.writeFile).toHaveBeenCalledOnce();
      expect(mockFsPromises.rm).toHaveBeenCalledOnce();
    });

    it('should create temp directory if it does not exist', async () => {
      mockOriginalModulePrototypeRequire.mockReturnValue({});

      mockFs.existsSync.mockReturnValue(false);

      const BYTE_VALUES = [1, 2, 3];
      const arrayBuffer = new Uint8Array(BYTE_VALUES).buffer;

      await handler.exposeRequireNodeBinaryAsync('/path/to/native.node', arrayBuffer);

      expect(mockFsPromises.mkdir).toHaveBeenCalledOnce();
    });

    it('should clean up temp file even if requireNodeBinary throws', async () => {
      mockOriginalModulePrototypeRequire.mockImplementation(() => {
        throw new Error('native load failed');
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: (): boolean => true });

      const BYTE_VALUES = [1, 2, 3];
      const arrayBuffer = new Uint8Array(BYTE_VALUES).buffer;

      await expect(handler.exposeRequireNodeBinaryAsync('/path/to/native.node', arrayBuffer))
        .rejects.toThrow('native load failed');
      expect(mockFsPromises.rm).toHaveBeenCalledOnce();
    });
  });

  describe('requireNonCached - Module type', () => {
    it('should split id by MODULE_NAME_SEPARATOR and call requireModule', () => {
      const requireModuleSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireModuleAccessor,
        'requireModule'
      ).mockReturnValue({ moduleResult: true });

      const id = `/parent/folder${MODULE_NAME_SEPARATOR}my-module`;
      const result = handler.exposeRequireNonCached(id, ResolvedType.Module, {
        cacheInvalidationMode: CacheInvalidationMode.WhenPossible,
        moduleType: ModuleType.JsTs
      });

      expect(result).toEqual({ moduleResult: true });
      expect(requireModuleSpy).toHaveBeenCalledWith(
        'my-module',
        '/parent/folder',
        CacheInvalidationMode.WhenPossible,
        ModuleType.JsTs
      );
      requireModuleSpy.mockRestore();
    });
  });

  describe('requireNonCached - Path type', () => {
    it('should call requirePath with the id', () => {
      const requirePathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequirePathAccessor,
        'requirePath'
      ).mockReturnValue({ pathResult: true });

      const result = handler.exposeRequireNonCached('/path/to/file.ts', ResolvedType.Path, {
        cacheInvalidationMode: CacheInvalidationMode.Always,
        moduleType: ModuleType.JsTs
      });

      expect(result).toEqual({ pathResult: true });
      expect(requirePathSpy).toHaveBeenCalledWith(
        '/path/to/file.ts',
        CacheInvalidationMode.Always,
        ModuleType.JsTs
      );
      requirePathSpy.mockRestore();
    });
  });

  describe('fileSystemAdapter getter', () => {
    it('should throw when adapter is not a FileSystemAdapter', () => {
      const params = createMockConstructorParams();
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      params.app.vault.adapter = {} as unknown as FileSystemAdapter;
      const badHandler = new TestableRequireHandlerDesktop(params);

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        const adapter = (badHandler as unknown as FileSystemAdapterAccessor).fileSystemAdapter;
        return adapter;
      }).toThrow('Vault adapter is not a FileSystemAdapter.');
    });

    it('should return the adapter when it is a FileSystemAdapter', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const adapter = (handler as unknown as FileSystemAdapterAccessor).fileSystemAdapter;

      expect(adapter).toBeInstanceOf(FileSystemAdapter);
    });
  });

  describe('fs lazy getter', () => {
    it('should return cached _fs on subsequent calls', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fs1 = (handler as unknown as FsAccessor).fs;
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fs2 = (handler as unknown as FsAccessor).fs;

      expect(fs1).toBe(fs2);
    });

    it('should try originalModulePrototypeRequireWrapped first when _fs is not set', () => {
      handler.unsetFs();
      const MOCK_NODE_FS = { existsSync: vi.fn(), readFileSync: vi.fn(), statSync: vi.fn() };
      mockOriginalModulePrototypeRequire.mockReturnValue(MOCK_NODE_FS);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fs = (handler as unknown as FsAccessor).fs;

      expect(fs).toBe(MOCK_NODE_FS);
    });

    it('should fall back to fileSystemAdapter.fs when originalModulePrototypeRequireWrapped returns null', () => {
      handler.unsetFs();
      mockOriginalModulePrototypeRequire.mockReturnValue(null);

      const mockAdapterFs = { existsSync: vi.fn(), readFileSync: vi.fn(), statSync: vi.fn() };
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const adapter = (handler as unknown as FileSystemAdapterFsAccessor).fileSystemAdapter;
      Object.defineProperty(adapter, 'fs', { configurable: true, value: mockAdapterFs });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fs = (handler as unknown as FsAccessor).fs;

      expect(fs).toBe(mockAdapterFs);
    });
  });

  describe('fsPromises lazy getter', () => {
    it('should return cached _fsPromises on subsequent calls', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fsp1 = (handler as unknown as FsPromisesAccessor).fsPromises;
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fsp2 = (handler as unknown as FsPromisesAccessor).fsPromises;

      expect(fsp1).toBe(fsp2);
    });

    it('should try originalModulePrototypeRequireWrapped first when _fsPromises is not set', () => {
      handler.unsetFsPromises();
      const MOCK_NODE_FSP = { readFile: vi.fn(), stat: vi.fn() };
      mockOriginalModulePrototypeRequire.mockReturnValue(MOCK_NODE_FSP);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fsp = (handler as unknown as FsPromisesAccessor).fsPromises;

      expect(fsp).toBe(MOCK_NODE_FSP);
    });

    it('should fall back to fileSystemAdapter.fsPromises when originalModulePrototypeRequireWrapped returns null', () => {
      handler.unsetFsPromises();
      mockOriginalModulePrototypeRequire.mockReturnValue(null);

      const mockAdapterFsPromises = { readFile: vi.fn(), stat: vi.fn() };
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const adapter = (handler as unknown as FileSystemAdapterFsPromisesAccessor).fileSystemAdapter;
      Object.defineProperty(adapter, 'fsPromises', { configurable: true, value: mockAdapterFsPromises });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const fsp = (handler as unknown as FsPromisesAccessor).fsPromises;

      expect(fsp).toBe(mockAdapterFsPromises);
    });
  });

  describe('onload registerPatch internals', () => {
    it('should set originalModulePrototypeRequire when patch factory is called', async () => {
      const superOnload = vi.spyOn(RequireHandlerBase.prototype, 'onload')
        .mockResolvedValue(undefined);

      Object.defineProperty(window, 'module', {
        configurable: true,
        value: { exports: {} },
        writable: true
      });

      vi.mocked(registerPatch).mockClear();

      await handler.onload();

      const patchCall = vi.mocked(registerPatch).mock.calls[0];
      const patchConfig = patchCall?.[2] as PatchRequireConfig;
      const mockNext = vi.fn();
      patchConfig.require(mockNext);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      expect((handler as unknown as OriginalModulePrototypeRequireAccessor).originalModulePrototypeRequire).toBe(mockNext);
      superOnload.mockRestore();
    });

    it('should return a patched function that calls modulePrototypeRequire', async () => {
      const superOnload = vi.spyOn(RequireHandlerBase.prototype, 'onload')
        .mockResolvedValue(undefined);

      Object.defineProperty(window, 'module', {
        configurable: true,
        value: { exports: {} },
        writable: true
      });

      vi.mocked(registerPatch).mockClear();

      await handler.onload();

      const patchCall = vi.mocked(registerPatch).mock.calls[0];
      const patchConfig = patchCall?.[2] as PatchRequireConfigWithReturn;
      const mockNext = vi.fn();
      const patchedRequire = patchConfig.require(mockNext);

      const modulePrototypeRequireSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ModulePrototypeRequireAccessor,
        'modulePrototypeRequire'
      ).mockReturnValue({ patched: true });

      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockModule = { exports: {} } as unknown as NodeJS.Module;
      const result = patchedRequire.call(mockModule, 'some-id');

      expect(result).toEqual({ patched: true });
      expect(modulePrototypeRequireSpy).toHaveBeenCalledWith('some-id', mockModule);

      modulePrototypeRequireSpy.mockRestore();
      superOnload.mockRestore();
    });
  });

  describe('findExistingFilePath', () => {
    it('should return the first matching path with a valid suffix', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/file.ts');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as FindExistingFilePathAccessor).findExistingFilePath('/path/to/file');

      expect(result).toBe('/path/to/file.ts');
    });

    it('should return null when no suffix matches', () => {
      mockFs.existsSync.mockReturnValue(false);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as FindExistingFilePathAccessor).findExistingFilePath('/path/to/missing');

      expect(result).toBeNull();
    });

    it('should return the exact path when it exists with empty suffix', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/file.js');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as FindExistingFilePathAccessor).findExistingFilePath('/path/to/file.js');

      expect(result).toBe('/path/to/file.js');
    });

    it('should try all PATH_SUFFIXES', () => {
      mockFs.existsSync.mockReturnValue(false);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as FindExistingFilePathAccessor).findExistingFilePath('/path/to/file');

      expect(mockFs.existsSync.mock.calls.length).toBe(PATH_SUFFIXES.length);
    });
  });

  describe('getRootFolder', () => {
    it('should return the folder containing package.json', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/project/package.json');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFolderAccessor).getRootFolder('/project/src/lib');

      expect(result).toBe('/project');
    });

    it('should return null when no package.json is found', () => {
      mockFs.existsSync.mockReturnValue(false);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFolderAccessor).getRootFolder('/project/src/lib');

      expect(result).toBeNull();
    });

    it('should return the current folder if it has package.json', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/project/src/package.json');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFolderAccessor).getRootFolder('/project/src');

      expect(result).toBe('/project/src');
    });
  });

  describe('getRootFolders', () => {
    it('should return root folders from both folder and modulesRoot', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as PluginSettingsModulesRootAccessor).pluginSettingsComponent.settings.modulesRoot = 'scripts';
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockVaultAbsolutePathAccessor)._vaultAbsolutePath = '/vault';

      mockFs.existsSync.mockImplementation((p: string) => {
        return p === '/project/package.json' || p === '/vault/scripts/package.json';
      });
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFoldersAccessor).getRootFolders('/project');

      expect(result).toContain('/project');
      expect(result).toContain('/vault/scripts');
    });

    it('should skip null modulesRoot', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as PluginSettingsModulesRootAccessor).pluginSettingsComponent.settings.modulesRoot = '';

      mockFs.existsSync.mockImplementation((p: string) => p === '/project/package.json');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFoldersAccessor).getRootFolders('/project');

      expect(result).toEqual(['/project']);
    });

    it('should return empty array when no root folders found', () => {
      mockFs.existsSync.mockReturnValue(false);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetRootFoldersAccessor).getRootFolders('/nowhere');

      expect(result).toEqual([]);
    });
  });

  describe('requirePath', () => {
    it('should throw when file is not found', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequirePathAccessor).requirePath('/nonexistent/file');
      }).toThrow('File not found: \'/nonexistent/file\'.');
    });

    it('should return cached module exports after loading', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/file.js');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const getDepsTimestampSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetDependenciesTimestampAccessor,
        'getDependenciesTimestampChangedAndReloadIfNeeded'
      ).mockReturnValue(MOCK_MTIME_MS);

      const EXPECTED_EXPORTS = { loaded: true };
      handler.getModulesCache()['/path/to/file.js'] = {
        children: [],
        exports: EXPECTED_EXPORTS,
        filename: '/path/to/file.js',
        id: '/path/to/file.js',
        isPreloading: false,
        loaded: true,
        parent: null,
        path: '',
        paths: [],
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
        require: vi.fn() as unknown as NodeJS.Require
      };

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathAccessor).requirePath('/path/to/file.js');

      expect(result).toBe(EXPECTED_EXPORTS);
      getDepsTimestampSpy.mockRestore();
    });

    it('should clear currentModulesTimestampChain after root require', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/file.js');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const getDepsTimestampSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetDependenciesTimestampAccessor,
        'getDependenciesTimestampChangedAndReloadIfNeeded'
      ).mockReturnValue(MOCK_MTIME_MS);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;
      expect(chain.size).toBe(0);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as RequirePathAccessor).requirePath('/path/to/file.js');

      expect(chain.size).toBe(0);
      getDepsTimestampSpy.mockRestore();
    });

    it('should clear currentModulesTimestampChain even if getDependenciesTimestampChangedAndReloadIfNeeded throws', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/file.js');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const getDepsTimestampSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetDependenciesTimestampAccessor,
        'getDependenciesTimestampChangedAndReloadIfNeeded'
      ).mockImplementation(() => {
        throw new Error('dependency error');
      });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequirePathAccessor).requirePath('/path/to/file.js');
      }).toThrow('dependency error');

      expect(chain.size).toBe(0);
      getDepsTimestampSpy.mockRestore();
    });
  });

  describe('requirePathImpl', () => {
    it('should call requireJson for Json module type', () => {
      const requireJsonSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireJsonAccessor,
        'requireJson'
      ).mockReturnValue({ key: 'value' });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathImplAccessor)
        .requirePathImpl('/path/to/file.json', ModuleType.Json);

      expect(result).toEqual({ key: 'value' });
      requireJsonSpy.mockRestore();
    });

    it('should call requireJsTs for JsTs module type', () => {
      const requireJsTsSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireJsTsAccessor,
        'requireJsTs'
      ).mockReturnValue({ js: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathImplAccessor)
        .requirePathImpl('/path/to/file.ts', ModuleType.JsTs);

      expect(result).toEqual({ js: true });
      requireJsTsSpy.mockRestore();
    });

    it('should call requireMd for Markdown module type', () => {
      const requireMdSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireMdAccessor,
        'requireMd'
      ).mockReturnValue({ md: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathImplAccessor)
        .requirePathImpl('/path/to/file.md', ModuleType.Markdown);

      expect(result).toEqual({ md: true });
      requireMdSpy.mockRestore();
    });

    it('should call requireNodeBinary for Node module type', () => {
      const EXPECTED_MODULE = { native: true };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED_MODULE);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathImplAccessor)
        .requirePathImpl('/path/to/file.node', ModuleType.Node);

      expect(result).toBe(EXPECTED_MODULE);
    });

    it('should call requireWasm for Wasm module type', () => {
      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequirePathImplAccessor)
          .requirePathImpl('/path/to/file.wasm', ModuleType.Wasm);
      }).toThrow('Cannot require WASM synchronously.');
    });

    it('should throw for unknown module type', () => {
      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequirePathImplAccessor)
          .requirePathImpl('/path/to/file.xyz', 'unknown' as ModuleType);
      }).toThrow('Unknown module type: \'unknown\'.');
    });

    it('should infer module type from path when not provided', () => {
      const requireJsonSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireJsonAccessor,
        'requireJson'
      ).mockReturnValue({ inferred: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequirePathImplAccessor)
        .requirePathImpl('/path/to/data.json');

      expect(result).toEqual({ inferred: true });
      requireJsonSpy.mockRestore();
    });
  });

  describe('requireJson', () => {
    it('should parse and return JSON content', () => {
      const JSON_CONTENT = '{"name":"test","version":"1.0.0"}';
      mockFs.readFileSync.mockReturnValue(JSON_CONTENT);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireJsonAccessor).requireJson('/path/to/package.json');

      expect(result).toEqual({ name: 'test', version: '1.0.0' });
    });

    it('should strip query before reading', () => {
      mockFs.readFileSync.mockReturnValue('{}');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as RequireJsonAccessor).requireJson('/path/to/file.json?v=1');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/file.json', 'utf8');
    });
  });

  describe('requireWasm', () => {
    it('should throw with sync require error', () => {
      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireWasmAccessor).requireWasm('/path/to/file.wasm');
      }).toThrow('Cannot require WASM synchronously.');
    });

    it('should include requireAsync advice in the error', () => {
      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireWasmAccessor).requireWasm('/path/to/file.wasm');
      }).toThrow('require(\'/path/to/file.wasm\')');
    });
  });

  describe('readFile', () => {
    it('should read file content as utf8', () => {
      mockFs.readFileSync.mockReturnValue('file content here');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as ReadFileAccessor).readFile('/path/to/file.txt');

      expect(result).toBe('file content here');
    });

    it('should strip query before reading', () => {
      mockFs.readFileSync.mockReturnValue('content');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as ReadFileAccessor).readFile('/path/to/file.txt?q=1');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
    });
  });

  describe('readPackageJson', () => {
    it('should parse and return package.json content', () => {
      const PKG_JSON = '{"name":"my-pkg","version":"2.0.0"}';
      mockFs.readFileSync.mockReturnValue(PKG_JSON);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as ReadPackageJsonAccessor).readPackageJson('/path/to/package.json');

      expect(result).toEqual({ name: 'my-pkg', version: '2.0.0' });
    });

    it('should strip query before reading', () => {
      mockFs.readFileSync.mockReturnValue('{}');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as ReadPackageJsonAccessor).readPackageJson('/path/to/package.json?v=2');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/package.json', 'utf8');
    });
  });

  describe('writeFileBinaryAsync', () => {
    it('should write ArrayBuffer as Buffer to file', async () => {
      const BYTE_VALUES = [5, 10, 15];
      const arrayBuffer = new Uint8Array(BYTE_VALUES).buffer;

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      await (handler as unknown as WriteFileBinaryAsyncAccessor)
        .writeFileBinaryAsync('/path/to/output.bin', arrayBuffer);

      expect(mockFsPromises.writeFile).toHaveBeenCalledOnce();
      const writtenBuffer = mockFsPromises.writeFile.mock.calls[0]?.[1] as Buffer;
      expect(writtenBuffer[0]).toBe(BYTE_VALUES[0]);
      expect(writtenBuffer[1]).toBe(BYTE_VALUES[1]);
      expect(writtenBuffer[2]).toBe(BYTE_VALUES[2]);
    });

    it('should strip query before writing', async () => {
      const arrayBuffer = new Uint8Array([1]).buffer;

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      await (handler as unknown as WriteFileBinaryAsyncAccessor)
        .writeFileBinaryAsync('/path/to/output.bin?q=1', arrayBuffer);

      expect(mockFsPromises.writeFile).toHaveBeenCalledWith('/path/to/output.bin', expect.anything());
    });
  });

  describe('originalModulePrototypeRequireWrapped', () => {
    it('should call originalModulePrototypeRequire with window.module when no parentModule in options', () => {
      const EXPECTED = { wrapped: true };
      mockOriginalModulePrototypeRequire.mockReturnValue(EXPECTED);

      Object.defineProperty(window, 'module', {
        configurable: true,
        value: { exports: {} },
        writable: true
      });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as OriginalModulePrototypeRequireWrappedAccessor)
        .originalModulePrototypeRequireWrapped('some-module', {});

      expect(result).toBe(EXPECTED);
    });

    it('should use parentModule from options as call context', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockParentModule = { path: '/parent' } as unknown as NodeJS.Module;
      mockOriginalModulePrototypeRequire.mockReturnValue({});

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as OriginalModulePrototypeRequireWrappedAccessor)
        .originalModulePrototypeRequireWrapped('some-module', { parentModule: mockParentModule });

      const callContext = mockOriginalModulePrototypeRequire.mock.contexts[0] as unknown;
      expect(callContext).toBe(mockParentModule);
    });

    it('should return undefined when originalModulePrototypeRequire is not set', () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to unset private field
      handler['originalModulePrototypeRequire'] = undefined as unknown as typeof require;

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as OriginalModulePrototypeRequireWrappedAccessor)
        .originalModulePrototypeRequireWrapped('some-module', {});

      expect(result).toBeUndefined();
    });
  });

  describe('getUrlDependencyErrorMessage', () => {
    it('should include path and resolvedId in the message', () => {
      const result =
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetUrlDependencyErrorMessageAccessor)
          .getUrlDependencyErrorMessage('/my/module.ts', 'https://example.com/dep.js', CacheInvalidationMode.Always);

      expect(result).toContain('/my/module.ts');
      expect(result).toContain('https://example.com/dep.js');
    });

    it('should include the cacheInvalidationMode in the message', () => {
      const result =
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetUrlDependencyErrorMessageAccessor)
          .getUrlDependencyErrorMessage('/my/module.ts', 'https://example.com/dep.js', CacheInvalidationMode.Always);

      expect(result).toContain(`cacheInvalidationMode=${CacheInvalidationMode.Always}`);
    });

    it('should default to WhenPossible when cacheInvalidationMode is not provided', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetUrlDependencyErrorMessageAccessor)
        .getUrlDependencyErrorMessage('/my/module.ts', 'https://example.com/dep.js');

      expect(result).toContain(`cacheInvalidationMode=${CacheInvalidationMode.WhenPossible}`);
    });

    it('should suggest using CacheInvalidationMode.Never', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetUrlDependencyErrorMessageAccessor)
        .getUrlDependencyErrorMessage('/my/module.ts', 'https://example.com/dep.js');

      expect(result).toContain(`cacheInvalidationMode=${CacheInvalidationMode.Never}`);
    });
  });

  describe('modulePrototypeRequire', () => {
    it('should call requireEx with the id and options', () => {
      const requireExMock = vi.fn().mockReturnValue({ required: true });
      Object.defineProperty(handler, 'requireEx', {
        configurable: true,
        get: () => requireExMock
      });

      const getParentPathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetParentPathFromCallStackAccessor,
        'getParentPathFromCallStack'
      ).mockReturnValue(null);

      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockModule = { exports: {} } as unknown as NodeJS.Module;
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as ModulePrototypeRequireAccessor)
        .modulePrototypeRequire('test-module', mockModule);

      expect(result).toEqual({ required: true });
      getParentPathSpy.mockRestore();
    });

    it('should pass parentPath from call stack when available', () => {
      const requireExMock = vi.fn().mockReturnValue({});
      Object.defineProperty(handler, 'requireEx', {
        configurable: true,
        get: () => requireExMock
      });

      const getParentPathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetParentPathFromCallStackAccessor,
        'getParentPathFromCallStack'
      ).mockReturnValue('/path/to/caller.js');

      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockModule = { exports: {} } as unknown as NodeJS.Module;
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as ModulePrototypeRequireAccessor)
        .modulePrototypeRequire('test-module', mockModule);

      expect(requireExMock).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({
          parentModule: mockModule,
          parentPath: '/path/to/caller.js'
        })
      );
      getParentPathSpy.mockRestore();
    });

    it('should use caller line index 6 for getParentPathFromCallStack', () => {
      const requireExMock = vi.fn().mockReturnValue({});
      Object.defineProperty(handler, 'requireEx', {
        configurable: true,
        get: () => requireExMock
      });

      const EXPECTED_CALLER_LINE_INDEX = 6;
      const getParentPathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetParentPathFromCallStackAccessor,
        'getParentPathFromCallStack'
      ).mockReturnValue(null);

      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
      const mockModule = { exports: {} } as unknown as NodeJS.Module;
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as ModulePrototypeRequireAccessor)
        .modulePrototypeRequire('test-module', mockModule);

      expect(getParentPathSpy).toHaveBeenCalledWith(EXPECTED_CALLER_LINE_INDEX);
      getParentPathSpy.mockRestore();
    });
  });

  describe('requireModule', () => {
    it('should throw when module cannot be resolved', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireModuleAccessor)
          .requireModule('nonexistent-module', '/project');
      }).toThrow('Could not resolve module: \'nonexistent-module\'.');
    });

    it('should throw for invalid scoped module name without separator', () => {
      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireModuleAccessor)
          .requireModule('@scope', '/project');
      }).toThrow('Invalid scoped module name: \'@scope\'.');
    });

    it('should skip root folders where package folder does not exist', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/project/package.json');
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => false,
        isFile: (): boolean => p === '/project/package.json',
        mtimeMs: MOCK_MTIME_MS
      }));

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireModuleAccessor)
          .requireModule('missing-module', '/project');
      }).toThrow('Could not resolve module: \'missing-module\'.');
    });

    it('should skip package folders without package.json', () => {
      const DIRECTORY_PATHS = new Set(['/project', '/project/node_modules/my-module']);
      mockFs.existsSync.mockImplementation((p: string) => {
        return p === '/project/package.json' || DIRECTORY_PATHS.has(p);
      });
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => DIRECTORY_PATHS.has(p),
        isFile: (): boolean => p === '/project/package.json',
        mtimeMs: MOCK_MTIME_MS
      }));

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireModuleAccessor)
          .requireModule('my-module', '/project');
      }).toThrow('Could not resolve module: \'my-module\'.');
    });

    it('should skip relative module paths where no existing file is found', () => {
      const EXISTING_PATHS = new Set([
        '/project/node_modules/my-module',
        '/project/node_modules/my-module/package.json',
        '/project/package.json'
      ]);
      const DIRECTORY_PATHS = new Set(['/project', '/project/node_modules/my-module']);

      mockFs.existsSync.mockImplementation((p: string) => EXISTING_PATHS.has(p) || DIRECTORY_PATHS.has(p));
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => DIRECTORY_PATHS.has(p),
        isFile: (): boolean => EXISTING_PATHS.has(p) && !DIRECTORY_PATHS.has(p),
        mtimeMs: MOCK_MTIME_MS
      }));
      mockFs.readFileSync.mockReturnValue('{"main":"dist/index.js"}');

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireModuleAccessor)
          .requireModule('my-module', '/project');
      }).toThrow('Could not resolve module: \'my-module\'.');
    });

    it('should handle private module prefix by using rootFolder as packageFolder', () => {
      const EXISTING_PATHS = new Set([
        '/project/package.json',
        '/project/src/internal.ts'
      ]);
      const DIRECTORY_PATHS = new Set(['/project']);

      mockFs.existsSync.mockImplementation((p: string) => EXISTING_PATHS.has(p) || DIRECTORY_PATHS.has(p));
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => DIRECTORY_PATHS.has(p),
        isFile: (): boolean => EXISTING_PATHS.has(p) && !DIRECTORY_PATHS.has(p),
        mtimeMs: MOCK_MTIME_MS
      }));
      mockFs.readFileSync.mockReturnValue('{"imports":{"#internal":"./src/internal.ts"}}');

      const requirePathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequirePathAccessor,
        'requirePath'
      ).mockReturnValue({ private: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireModuleAccessor)
        .requireModule('#internal', '/project');

      expect(result).toEqual({ private: true });
      requirePathSpy.mockRestore();
    });

    it('should handle scoped modules with sub-paths', () => {
      const EXISTING_PATHS = new Set([
        '/project/node_modules/@scope/my-pkg',
        '/project/node_modules/@scope/my-pkg/dist/sub.js',
        '/project/node_modules/@scope/my-pkg/package.json',
        '/project/package.json'
      ]);
      const DIRECTORY_PATHS = new Set(['/project', '/project/node_modules/@scope/my-pkg']);

      mockFs.existsSync.mockImplementation((p: string) => EXISTING_PATHS.has(p) || DIRECTORY_PATHS.has(p));
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => DIRECTORY_PATHS.has(p),
        isFile: (): boolean => EXISTING_PATHS.has(p) && !DIRECTORY_PATHS.has(p),
        mtimeMs: MOCK_MTIME_MS
      }));
      mockFs.readFileSync.mockReturnValue('{"exports":{".":"./dist/index.js","./sub":"./dist/sub.js"}}');

      const requirePathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequirePathAccessor,
        'requirePath'
      ).mockReturnValue({ scoped: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireModuleAccessor)
        .requireModule('@scope/my-pkg/sub', '/project');

      expect(result).toEqual({ scoped: true });
      requirePathSpy.mockRestore();
    });

    it('should resolve module from node_modules with package.json', () => {
      const EXISTING_PATHS = new Set([
        '/project/node_modules/my-module',
        '/project/node_modules/my-module/dist/index.js',
        '/project/node_modules/my-module/package.json',
        '/project/package.json'
      ]);
      const DIRECTORY_PATHS = new Set([
        '/project',
        '/project/node_modules/my-module'
      ]);

      mockFs.existsSync.mockImplementation((p: string) => EXISTING_PATHS.has(p) || DIRECTORY_PATHS.has(p));
      mockFs.statSync.mockImplementation((p: string) => ({
        isDirectory: (): boolean => DIRECTORY_PATHS.has(p),
        isFile: (): boolean => EXISTING_PATHS.has(p) && !DIRECTORY_PATHS.has(p),
        mtimeMs: MOCK_MTIME_MS
      }));
      mockFs.readFileSync.mockReturnValue('{"main":"dist/index.js"}');

      const requirePathSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequirePathAccessor,
        'requirePath'
      ).mockReturnValue({ resolved: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireModuleAccessor)
        .requireModule('my-module', '/project');

      expect(result).toEqual({ resolved: true });
      requirePathSpy.mockRestore();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeeded', () => {
    it('should return cached timestamp when path is already in the chain', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;
      chain.add('/path/to/file.js');
      handler.getModuleTimestamps().set('/path/to/file.js', MOCK_MTIME_MS);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should return 0 when path is in chain but has no cached timestamp', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;
      chain.add('/path/to/file.js');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(result).toBe(0);
    });

    it('should add path to currentModulesTimestampChain', () => {
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const initSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      ).mockReturnValue({});

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;
      expect(chain.has('/path/to/file.js')).toBe(true);
      initSpy.mockRestore();
    });

    it('should call initModuleAndAddToCache when timestamp is greater than cached', () => {
      const NEW_MTIME_MS = MOCK_MTIME_MS + 1000;
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: NEW_MTIME_MS });
      handler.getModuleTimestamps().set('/path/to/file.js', MOCK_MTIME_MS);

      const initSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      ).mockReturnValue({});

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(initSpy).toHaveBeenCalledOnce();
      initSpy.mockRestore();
    });

    it('should call initModuleAndAddToCache when no cached module exists', () => {
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const getCachedModuleSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetCachedModuleAccessor,
        'getCachedModule'
      ).mockReturnValue(null);

      const initSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      ).mockReturnValue({});

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(initSpy).toHaveBeenCalledOnce();
      getCachedModuleSpy.mockRestore();
      initSpy.mockRestore();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeeded - dependency resolution', () => {
    function setupDependencyTest(testHandler: TestableRequireHandlerDesktop): void {
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        testHandler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      ).mockReturnValue({});
    }

    it('should resolve Module dependencies through root folder package.json', () => {
      setupDependencyTest(handler);

      const deps = new Set(['some-module']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      const resolveSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'some-module', resolvedType: ResolvedType.Module });

      const getRootFoldersSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetRootFoldersAccessor,
        'getRootFolders'
      ).mockReturnValue(['/project']);

      mockFs.existsSync.mockReturnValue(true);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js', CacheInvalidationMode.WhenPossible);

      expect(resolveSpy).toHaveBeenCalledWith('some-module', '/path/to/file.js');
      resolveSpy.mockRestore();
      getRootFoldersSpy.mockRestore();
    });

    it('should skip root folders without package.json for Module dependencies', () => {
      setupDependencyTest(handler);

      const deps = new Set(['some-module']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'some-module', resolvedType: ResolvedType.Module });

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetRootFoldersAccessor,
        'getRootFolders'
      ).mockReturnValue(['/project']);

      mockFs.existsSync.mockReturnValue(false);

      const result =
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetDependenciesTimestampAccessor)
          .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should resolve Path dependencies through findExistingFilePath', () => {
      setupDependencyTest(handler);

      const deps = new Set(['./helper']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: '/path/to/helper', resolvedType: ResolvedType.Path });

      const findExistingSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as FindExistingFilePathAccessor,
        'findExistingFilePath'
      ).mockReturnValue('/path/to/helper.ts');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(findExistingSpy).toHaveBeenCalledWith('/path/to/helper');
      findExistingSpy.mockRestore();
    });

    it('should skip Path dependencies when file not found', () => {
      setupDependencyTest(handler);

      const deps = new Set(['./missing']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: '/path/to/missing', resolvedType: ResolvedType.Path });

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as FindExistingFilePathAccessor,
        'findExistingFilePath'
      ).mockReturnValue(null);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should do nothing for SpecialModule dependencies', () => {
      setupDependencyTest(handler);

      const deps = new Set(['obsidian']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'obsidian', resolvedType: ResolvedType.SpecialModule });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should throw for Url dependencies with CacheInvalidationMode.Always', () => {
      setupDependencyTest(handler);

      const deps = new Set(['https://example.com/dep.js']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'https://example.com/dep.js', resolvedType: ResolvedType.Url });

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetDependenciesTimestampAccessor)
          .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js', CacheInvalidationMode.Always);
      }).toThrow('URL dependencies validation is not supported');
    });

    it('should silently skip Url dependencies with CacheInvalidationMode.Never', () => {
      setupDependencyTest(handler);

      const deps = new Set(['https://example.com/dep.js']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'https://example.com/dep.js', resolvedType: ResolvedType.Url });

      const result =
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetDependenciesTimestampAccessor)
          .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js', CacheInvalidationMode.Never);

      expect(result).toBe(MOCK_MTIME_MS);
    });

    it('should warn for Url dependencies with CacheInvalidationMode.WhenPossible', () => {
      setupDependencyTest(handler);

      const deps = new Set(['https://example.com/dep.js']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'https://example.com/dep.js', resolvedType: ResolvedType.Url });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetDependenciesTimestampAccessor)
        .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js', CacheInvalidationMode.WhenPossible);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('URL dependencies validation is not supported'));
      warnSpy.mockRestore();
    });

    it('should throw for Url dependencies with unknown cacheInvalidationMode', () => {
      setupDependencyTest(handler);

      const deps = new Set(['https://example.com/dep.js']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'https://example.com/dep.js', resolvedType: ResolvedType.Url });

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetDependenciesTimestampAccessor)
          .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js', 'invalid' as CacheInvalidationMode);
      }).toThrow('Unknown cacheInvalidationMode: \'invalid\'.');
    });

    it('should throw for unknown resolved type', () => {
      setupDependencyTest(handler);

      const deps = new Set(['unknown-dep']);
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockModuleDependenciesAccessor).moduleDependencies.set('/path/to/file.js', deps);

      vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as ResolveAccessor,
        'resolve'
      ).mockReturnValue({ resolvedId: 'unknown-dep', resolvedType: 'bizarre' as ResolvedType });

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetDependenciesTimestampAccessor)
          .getDependenciesTimestampChangedAndReloadIfNeeded('/path/to/file.js');
      }).toThrow('Unknown type: \'bizarre\'.');
    });
  });

  describe('requireJsTs', () => {
    it('should read file and call requireString', () => {
      mockFs.readFileSync.mockReturnValue('module.exports = { hello: true };');

      const requireStringSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireStringAccessor,
        'requireString'
      ).mockReturnValue({ hello: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireJsTsAccessor).requireJsTs('/path/to/file.ts');

      expect(result).toEqual({ hello: true });
      expect(requireStringSpy).toHaveBeenCalledWith('module.exports = { hello: true };', '/path/to/file.ts');
      requireStringSpy.mockRestore();
    });

    it('should strip query before reading', () => {
      mockFs.readFileSync.mockReturnValue('');

      const requireStringSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireStringAccessor,
        'requireString'
      ).mockReturnValue({});

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as RequireJsTsAccessor).requireJsTs('/path/to/file.ts?q=1');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/file.ts', 'utf8');
      requireStringSpy.mockRestore();
    });
  });

  describe('requireMd', () => {
    it('should call extractCodeScript and requireString', () => {
      mockFs.readFileSync.mockReturnValue('# Hello\n```code-script\nconsole.log("hi");\n```');

      const requireStringSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireStringAccessor,
        'requireString'
      ).mockReturnValue({ md: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as RequireMdAccessor).requireMd('/path/to/file.md');

      expect(result).toEqual({ md: true });
      expect(requireStringSpy).toHaveBeenCalledWith(
        'console.log("hi");',
        '/path/to/file.md.code-script.(default).ts'
      );
      requireStringSpy.mockRestore();
    });
  });

  describe('requireString', () => {
    it('should wrap errors with the module path', () => {
      const requireStringImplSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireStringImplAccessor,
        'requireStringImpl'
      ).mockImplementation(() => {
        throw new Error('transform failed');
      });

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as RequireStringAccessor)
          .requireString('bad code', '/path/to/file.ts');
      }).toThrow('Failed to load module: /path/to/file.ts');

      requireStringImplSpy.mockRestore();
    });

    it('should call requireStringImpl with correct options', () => {
      const requireStringImplSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequireStringImplAccessor,
        'requireStringImpl'
      ).mockReturnValue({ exportsFn: () => ({ result: true }), promisable: undefined });

      const initModuleSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      ).mockImplementation((_id: string, init: () => unknown) => init());

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as RequireStringAccessor)
        .requireString('const x = 1;', '/path/to/file.ts');

      expect(requireStringImplSpy).toHaveBeenCalledWith({
        code: 'const x = 1;',
        evalPrefix: 'requireString',
        path: '/path/to/file.ts',
        shouldWrapInAsyncFunction: false,
        urlSuffix: ''
      });

      requireStringImplSpy.mockRestore();
      initModuleSpy.mockRestore();
    });
  });

  describe('getTimestamp (private sync)', () => {
    it('should return mtimeMs from statSync', () => {
      const CUSTOM_MTIME = 9999999;
      mockFs.statSync.mockReturnValue({ mtimeMs: CUSTOM_MTIME });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const result = (handler as unknown as GetTimestampAccessor).getTimestamp('/path/to/file.ts');

      expect(result).toBe(CUSTOM_MTIME);
    });

    it('should strip query before calling statSync', () => {
      mockFs.statSync.mockReturnValue({ mtimeMs: MOCK_MTIME_MS });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as GetTimestampAccessor).getTimestamp('/path/to/file.ts?v=1');

      expect(mockFs.statSync).toHaveBeenCalledWith('/path/to/file.ts');
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeeded reload', () => {
    it('should call requirePathImpl when module needs loading', () => {
      const MODULE_PATH = '/path/to/new-mod.js';

      mockFs.existsSync.mockImplementation((p: string) => p === MODULE_PATH);
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      // Set requireEx so addToModuleCache can access it
      const mockRequireEx = vi.fn();
      Object.defineProperty(handler, '_requireEx', {
        configurable: true,
        value: mockRequireEx,
        writable: true
      });

      const requirePathImplSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as RequirePathImplAccessor,
        'requirePathImpl'
      ).mockReturnValue({ loaded: true });

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const getDepsTimestamp = (handler as unknown as GetDependenciesTimestampAccessor).getDependenciesTimestampChangedAndReloadIfNeeded;

      getDepsTimestamp.call(handler, MODULE_PATH);

      expect(requirePathImplSpy).toHaveBeenCalledWith(MODULE_PATH, undefined);
      requirePathImplSpy.mockRestore();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeeded skip reload', () => {
    it('should not reload when timestamp is unchanged and module is cached', () => {
      const MODULE_PATH = '/path/to/cached.js';
      const CACHED_TIMESTAMP = 1000;

      mockFs.existsSync.mockImplementation((p: string) => p === MODULE_PATH);
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: CACHED_TIMESTAMP });

      // Pre-populate the cache and timestamps
      handler.getModulesCache()[MODULE_PATH] = {
        children: [],
        exports: { cached: true },
        filename: MODULE_PATH,
        id: MODULE_PATH,
        isPreloading: false,
        loaded: true,
        parent: null,
        path: '',
        paths: [],
        // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion
        require: vi.fn() as unknown as NodeJS.Require
      };
      handler.getModuleTimestamps().set(MODULE_PATH, CACHED_TIMESTAMP);

      const initModuleSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as InitModuleAndAddToCacheAccessor,
        'initModuleAndAddToCache'
      );

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const getDepsTimestamp = (handler as unknown as GetDependenciesTimestampAccessor).getDependenciesTimestampChangedAndReloadIfNeeded;

      const result = getDepsTimestamp.call(handler, MODULE_PATH);

      expect(result).toBe(CACHED_TIMESTAMP);
      expect(initModuleSpy).not.toHaveBeenCalled();
      initModuleSpy.mockRestore();
    });
  });

  describe('getRootFolders with undefined vaultAbsolutePath', () => {
    it('should throw when vaultAbsolutePath is not set', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as PluginSettingsModulesRootAccessor).pluginSettingsComponent.settings.modulesRoot = 'scripts';
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as MockVaultAbsolutePathUndefinedAccessor)._vaultAbsolutePath = undefined;

      expect(() => {
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        (handler as unknown as GetRootFoldersAccessor).getRootFolders('/project');
      }).toThrow();
    });
  });

  describe('requirePath nested require', () => {
    it('should not clear currentModulesTimestampChain when not a root require', () => {
      mockFs.existsSync.mockImplementation((p: string) => p === '/path/to/nested.js');
      mockFs.statSync.mockReturnValue({ isFile: (): boolean => true, mtimeMs: MOCK_MTIME_MS });

      const getDepsTimestampSpy = vi.spyOn(
        // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
        handler as unknown as GetDependenciesTimestampAccessor,
        'getDependenciesTimestampChangedAndReloadIfNeeded'
      ).mockReturnValue(MOCK_MTIME_MS);

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const chain = (handler as unknown as CurrentModulesTimestampChainAccessor).currentModulesTimestampChain;
      chain.add('some-parent-module');

      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (handler as unknown as RequirePathAccessor).requirePath('/path/to/nested.js');

      // Chain should still contain the parent module since this is not a root require
      expect(chain.has('some-parent-module')).toBe(true);
      getDepsTimestampSpy.mockRestore();
    });
  });
});
