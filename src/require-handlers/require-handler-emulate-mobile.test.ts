import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type {
  RequireHandlerComponentBaseRequireNodeBinaryAsyncParams,
  RequireHandlerComponentBaseRequireNonCachedParams,
  RequireHandlerConstructorParams,
  ResolvedType
} from './require-handler.ts';

import { RequireHandlerEmulateMobileComponent } from './require-handler-emulate-mobile.ts';

const mockDesktopExistsFileAsync = vi.fn();
const mockDesktopExistsFolderAsync = vi.fn();
const mockDesktopGetTimestampAsync = vi.fn();
const mockDesktopReadFileAsync = vi.fn();
const mockDesktopReadFileBinaryAsync = vi.fn();
const mockMobileCanRequireNonCached = vi.fn();
const mockMobileRequireAsarPackedModule = vi.fn();
const mockMobileRequireElectronModule = vi.fn();
const mockMobileRequireNodeBinaryAsync = vi.fn();
const mockMobileRequireNodeBuiltInModule = vi.fn();
const mockMobileRequireNonCached = vi.fn();

vi.mock('./require-handler-desktop.ts', () => ({
  RequireHandlerDesktopComponent: class MockDesktop {
    public existsFileAsync = mockDesktopExistsFileAsync;
    public existsFolderAsync = mockDesktopExistsFolderAsync;
    public getTimestampAsync = mockDesktopGetTimestampAsync;
    public readFileAsync = mockDesktopReadFileAsync;
    public readFileBinaryAsync = mockDesktopReadFileBinaryAsync;
  }
}));

vi.mock('./require-handler-mobile.ts', () => ({
  RequireHandlerMobileComponent: class MockMobile {
    public canRequireNonCached = mockMobileCanRequireNonCached;
    public requireAsarPackedModule = mockMobileRequireAsarPackedModule;
    public requireElectronModule = mockMobileRequireElectronModule;
    public requireNodeBinaryAsync = mockMobileRequireNodeBinaryAsync;
    public requireNodeBuiltInModule = mockMobileRequireNodeBuiltInModule;
    public requireNonCached = mockMobileRequireNonCached;
  }
}));

vi.mock('./require-handler.ts', () => ({
  RequireHandlerComponentBase: class MockRequireHandlerComponentBase {
    public addChild<T>(child: T): T {
      return child;
    }
  }
}));

interface CanRequireNonCachedAccessor {
  canRequireNonCached(): boolean;
}

interface CanRequireSyncAccessor {
  readonly canRequireSync: boolean;
}

interface ExistsFileAsyncAccessor {
  existsFileAsync(path: string): Promise<boolean>;
}

interface ExistsFolderAsyncAccessor {
  existsFolderAsync(path: string): Promise<boolean>;
}

interface GetTimestampAsyncAccessor {
  getTimestampAsync(path: string): Promise<number>;
}

interface ReadFileAsyncAccessor {
  readFileAsync(path: string): Promise<string>;
}

interface ReadFileBinaryAsyncAccessor {
  readFileBinaryAsync(path: string): Promise<ArrayBuffer>;
}

interface RequireAsarPackedModuleAccessor {
  requireAsarPackedModule(id: string): unknown;
}

interface RequireElectronModuleAccessor {
  requireElectronModule(id: string): unknown;
}

interface RequireNodeBinaryAsyncAccessor {
  requireNodeBinaryAsync(params: RequireHandlerComponentBaseRequireNodeBinaryAsyncParams): Promise<unknown>;
}

interface RequireNodeBuiltInModuleAccessor {
  requireNodeBuiltInModule(id: string): unknown;
}

interface RequireNonCachedAccessor {
  requireNonCached(params: RequireHandlerComponentBaseRequireNonCachedParams): unknown;
}

function asCanRequireNonCached(object: RequireHandlerEmulateMobileComponent): CanRequireNonCachedAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as CanRequireNonCachedAccessor;
}

function asCanRequireSync(object: RequireHandlerEmulateMobileComponent): CanRequireSyncAccessor {
  return castTo<CanRequireSyncAccessor>(object);
}

function asExistsFileAsync(object: RequireHandlerEmulateMobileComponent): ExistsFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as ExistsFileAsyncAccessor;
}

function asExistsFolderAsync(object: RequireHandlerEmulateMobileComponent): ExistsFolderAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as ExistsFolderAsyncAccessor;
}

function asGetTimestampAsync(object: RequireHandlerEmulateMobileComponent): GetTimestampAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as GetTimestampAsyncAccessor;
}

function asReadFileAsync(object: RequireHandlerEmulateMobileComponent): ReadFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as ReadFileAsyncAccessor;
}

function asReadFileBinaryAsync(object: RequireHandlerEmulateMobileComponent): ReadFileBinaryAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as ReadFileBinaryAsyncAccessor;
}

function asRequireAsarPackedModule(object: RequireHandlerEmulateMobileComponent): RequireAsarPackedModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as RequireAsarPackedModuleAccessor;
}

function asRequireElectronModule(object: RequireHandlerEmulateMobileComponent): RequireElectronModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as RequireElectronModuleAccessor;
}

function asRequireNodeBinaryAsync(object: RequireHandlerEmulateMobileComponent): RequireNodeBinaryAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as RequireNodeBinaryAsyncAccessor;
}

function asRequireNodeBuiltInModule(object: RequireHandlerEmulateMobileComponent): RequireNodeBuiltInModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as RequireNodeBuiltInModuleAccessor;
}

function asRequireNonCached(object: RequireHandlerEmulateMobileComponent): RequireNonCachedAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return object as unknown as RequireNonCachedAccessor;
}

describe('RequireHandlerEmulateMobileComponent', () => {
  let handler: RequireHandlerEmulateMobileComponent;
  let mockParams: RequireHandlerConstructorParams;

  beforeEach(() => {
    vi.clearAllMocks();

    mockParams = castTo<RequireHandlerConstructorParams>({
      app: {},
      consoleDebugComponent: {},
      pluginRequire: vi.fn(),
      pluginSettingsComponent: {},
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      tempPluginRegistry: {}
    });

    handler = new RequireHandlerEmulateMobileComponent(mockParams);
  });

  describe('canRequireNonCached', () => {
    it('should delegate to mobile handler', () => {
      mockMobileCanRequireNonCached.mockReturnValue(false);
      const isResult = asCanRequireNonCached(handler).canRequireNonCached();
      expect(isResult).toBe(false);
      expect(mockMobileCanRequireNonCached).toHaveBeenCalledOnce();
    });
  });

  describe('canRequireSync', () => {
    it('should return false', () => {
      expect(asCanRequireSync(handler).canRequireSync).toBe(false);
    });
  });

  describe('existsFileAsync', () => {
    it('should delegate to desktop handler', async () => {
      mockDesktopExistsFileAsync.mockResolvedValue(true);
      const isResult = await asExistsFileAsync(handler).existsFileAsync('/test/path');
      expect(isResult).toBe(true);
      expect(mockDesktopExistsFileAsync).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('existsFolderAsync', () => {
    it('should delegate to desktop handler', async () => {
      mockDesktopExistsFolderAsync.mockResolvedValue(true);
      const isResult = await asExistsFolderAsync(handler).existsFolderAsync('/test/folder');
      expect(isResult).toBe(true);
      expect(mockDesktopExistsFolderAsync).toHaveBeenCalledWith('/test/folder');
    });
  });

  describe('getTimestampAsync', () => {
    it('should delegate to desktop handler', async () => {
      const MOCK_TIMESTAMP = 1_234_567_890;
      mockDesktopGetTimestampAsync.mockResolvedValue(MOCK_TIMESTAMP);
      const result = await asGetTimestampAsync(handler).getTimestampAsync('/test/file');
      expect(result).toBe(MOCK_TIMESTAMP);
      expect(mockDesktopGetTimestampAsync).toHaveBeenCalledWith('/test/file');
    });
  });

  describe('readFileAsync', () => {
    it('should delegate to desktop handler', async () => {
      const fileContent = 'file content';
      mockDesktopReadFileAsync.mockResolvedValue(fileContent);
      const result = await asReadFileAsync(handler).readFileAsync('/test/file.ts');
      expect(result).toBe(fileContent);
      expect(mockDesktopReadFileAsync).toHaveBeenCalledWith('/test/file.ts');
    });
  });

  describe('readFileBinaryAsync', () => {
    it('should delegate to desktop handler', async () => {
      const mockBuffer = new ArrayBuffer(0);
      mockDesktopReadFileBinaryAsync.mockResolvedValue(mockBuffer);
      const result = await asReadFileBinaryAsync(handler).readFileBinaryAsync('/test/file.wasm');
      expect(result).toBe(mockBuffer);
      expect(mockDesktopReadFileBinaryAsync).toHaveBeenCalledWith('/test/file.wasm');
    });
  });

  describe('requireAsarPackedModule', () => {
    it('should delegate to mobile handler', () => {
      const mockModule = { asar: true };
      mockMobileRequireAsarPackedModule.mockReturnValue(mockModule);
      const result = asRequireAsarPackedModule(handler).requireAsarPackedModule('some-asar-module');
      expect(result).toBe(mockModule);
      expect(mockMobileRequireAsarPackedModule).toHaveBeenCalledWith('some-asar-module');
    });
  });

  describe('requireElectronModule', () => {
    it('should delegate to mobile handler', () => {
      const mockModule = { electron: true };
      mockMobileRequireElectronModule.mockReturnValue(mockModule);
      const result = asRequireElectronModule(handler).requireElectronModule('electron');
      expect(result).toBe(mockModule);
      expect(mockMobileRequireElectronModule).toHaveBeenCalledWith('electron');
    });
  });

  describe('requireNodeBinaryAsync', () => {
    it('should delegate to mobile handler', async () => {
      const mockModule = { node: true };
      mockMobileRequireNodeBinaryAsync.mockResolvedValue(mockModule);
      const result = await asRequireNodeBinaryAsync(handler).requireNodeBinaryAsync({ options: {}, path: 'native.node' });
      expect(result).toBe(mockModule);
      expect(mockMobileRequireNodeBinaryAsync).toHaveBeenCalledWith({ options: {}, path: 'native.node' });
    });
  });

  describe('requireNodeBuiltInModule', () => {
    it('should delegate to mobile handler', () => {
      const mockModule = { path: true };
      mockMobileRequireNodeBuiltInModule.mockReturnValue(mockModule);
      const result = asRequireNodeBuiltInModule(handler).requireNodeBuiltInModule('path');
      expect(result).toBe(mockModule);
      expect(mockMobileRequireNodeBuiltInModule).toHaveBeenCalledWith('path');
    });
  });

  describe('requireNonCached', () => {
    it('should delegate to mobile handler', () => {
      const mockModule = { fresh: true };
      mockMobileRequireNonCached.mockReturnValue(mockModule);
      const result = asRequireNonCached(handler).requireNonCached({ id: 'some-module', options: {}, type: castTo<ResolvedType>('module') });
      expect(result).toBe(mockModule);
      expect(mockMobileRequireNonCached).toHaveBeenCalledWith({ id: 'some-module', options: {}, type: 'module' });
    });
  });
});
