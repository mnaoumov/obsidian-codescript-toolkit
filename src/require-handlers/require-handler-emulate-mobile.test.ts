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

function asCanRequireNonCached(obj: RequireHandlerEmulateMobileComponent): CanRequireNonCachedAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as CanRequireNonCachedAccessor;
}

function asCanRequireSync(obj: RequireHandlerEmulateMobileComponent): CanRequireSyncAccessor {
  return castTo<CanRequireSyncAccessor>(obj);
}

function asExistsFileAsync(obj: RequireHandlerEmulateMobileComponent): ExistsFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ExistsFileAsyncAccessor;
}

function asExistsFolderAsync(obj: RequireHandlerEmulateMobileComponent): ExistsFolderAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ExistsFolderAsyncAccessor;
}

function asGetTimestampAsync(obj: RequireHandlerEmulateMobileComponent): GetTimestampAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as GetTimestampAsyncAccessor;
}

function asReadFileAsync(obj: RequireHandlerEmulateMobileComponent): ReadFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ReadFileAsyncAccessor;
}

function asReadFileBinaryAsync(obj: RequireHandlerEmulateMobileComponent): ReadFileBinaryAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ReadFileBinaryAsyncAccessor;
}

function asRequireAsarPackedModule(obj: RequireHandlerEmulateMobileComponent): RequireAsarPackedModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as RequireAsarPackedModuleAccessor;
}

function asRequireElectronModule(obj: RequireHandlerEmulateMobileComponent): RequireElectronModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as RequireElectronModuleAccessor;
}

function asRequireNodeBinaryAsync(obj: RequireHandlerEmulateMobileComponent): RequireNodeBinaryAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as RequireNodeBinaryAsyncAccessor;
}

function asRequireNodeBuiltInModule(obj: RequireHandlerEmulateMobileComponent): RequireNodeBuiltInModuleAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as RequireNodeBuiltInModuleAccessor;
}

function asRequireNonCached(obj: RequireHandlerEmulateMobileComponent): RequireNonCachedAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as RequireNonCachedAccessor;
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
      tempPluginRegistry: {}
    });

    handler = new RequireHandlerEmulateMobileComponent(mockParams);
  });

  describe('canRequireNonCached', () => {
    it('should delegate to mobile handler', () => {
      mockMobileCanRequireNonCached.mockReturnValue(false);
      const result = asCanRequireNonCached(handler).canRequireNonCached();
      expect(result).toBe(false);
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
      const result = await asExistsFileAsync(handler).existsFileAsync('/test/path');
      expect(result).toBe(true);
      expect(mockDesktopExistsFileAsync).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('existsFolderAsync', () => {
    it('should delegate to desktop handler', async () => {
      mockDesktopExistsFolderAsync.mockResolvedValue(true);
      const result = await asExistsFolderAsync(handler).existsFolderAsync('/test/folder');
      expect(result).toBe(true);
      expect(mockDesktopExistsFolderAsync).toHaveBeenCalledWith('/test/folder');
    });
  });

  describe('getTimestampAsync', () => {
    it('should delegate to desktop handler', async () => {
      const MOCK_TIMESTAMP = 1234567890;
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
