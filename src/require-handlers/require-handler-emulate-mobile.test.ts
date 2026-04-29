import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerConstructorParams } from './require-handler.ts';

import { RequireHandlerEmulateMobile } from './require-handler-emulate-mobile.ts';

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
  RequireHandlerDesktop: class MockDesktop {
    public existsFileAsync = mockDesktopExistsFileAsync;
    public existsFolderAsync = mockDesktopExistsFolderAsync;
    public getTimestampAsync = mockDesktopGetTimestampAsync;
    public readFileAsync = mockDesktopReadFileAsync;
    public readFileBinaryAsync = mockDesktopReadFileBinaryAsync;
  }
}));

vi.mock('./require-handler-mobile.ts', () => ({
  RequireHandlerMobile: class MockMobile {
    public canRequireNonCached = mockMobileCanRequireNonCached;
    public requireAsarPackedModule = mockMobileRequireAsarPackedModule;
    public requireElectronModule = mockMobileRequireElectronModule;
    public requireNodeBinaryAsync = mockMobileRequireNodeBinaryAsync;
    public requireNodeBuiltInModule = mockMobileRequireNodeBuiltInModule;
    public requireNonCached = mockMobileRequireNonCached;
  }
}));

vi.mock('./require-handler.ts', () => ({
  RequireHandlerBase: class MockRequireHandlerBase {
    public addChild<T>(child: T): T {
      return child;
    }
  }
}));

interface CanRequireNonCachedAccessor {
  canRequireNonCached(): boolean;
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
  requireNodeBinaryAsync(id: string): Promise<unknown>;
}

interface RequireNodeBuiltInModuleAccessor {
  requireNodeBuiltInModule(id: string): unknown;
}

interface RequireNonCachedAccessor {
  requireNonCached(id: string): unknown;
}

function asCanRequireNonCached(obj: RequireHandlerEmulateMobile): CanRequireNonCachedAccessor {
  const partial: Partial<CanRequireNonCachedAccessor> = obj;
  return partial as CanRequireNonCachedAccessor;
}

function asExistsFileAsync(obj: RequireHandlerEmulateMobile): ExistsFileAsyncAccessor {
  const partial: Partial<ExistsFileAsyncAccessor> = obj;
  return partial as ExistsFileAsyncAccessor;
}

function asExistsFolderAsync(obj: RequireHandlerEmulateMobile): ExistsFolderAsyncAccessor {
  const partial: Partial<ExistsFolderAsyncAccessor> = obj;
  return partial as ExistsFolderAsyncAccessor;
}

function asGetTimestampAsync(obj: RequireHandlerEmulateMobile): GetTimestampAsyncAccessor {
  const partial: Partial<GetTimestampAsyncAccessor> = obj;
  return partial as GetTimestampAsyncAccessor;
}

function asReadFileAsync(obj: RequireHandlerEmulateMobile): ReadFileAsyncAccessor {
  const partial: Partial<ReadFileAsyncAccessor> = obj;
  return partial as ReadFileAsyncAccessor;
}

function asReadFileBinaryAsync(obj: RequireHandlerEmulateMobile): ReadFileBinaryAsyncAccessor {
  const partial: Partial<ReadFileBinaryAsyncAccessor> = obj;
  return partial as ReadFileBinaryAsyncAccessor;
}

function asRequireAsarPackedModule(obj: RequireHandlerEmulateMobile): RequireAsarPackedModuleAccessor {
  const partial: Partial<RequireAsarPackedModuleAccessor> = obj;
  return partial as RequireAsarPackedModuleAccessor;
}

function asRequireElectronModule(obj: RequireHandlerEmulateMobile): RequireElectronModuleAccessor {
  const partial: Partial<RequireElectronModuleAccessor> = obj;
  return partial as RequireElectronModuleAccessor;
}

function asRequireNodeBinaryAsync(obj: RequireHandlerEmulateMobile): RequireNodeBinaryAsyncAccessor {
  const partial: Partial<RequireNodeBinaryAsyncAccessor> = obj;
  return partial as RequireNodeBinaryAsyncAccessor;
}

function asRequireNodeBuiltInModule(obj: RequireHandlerEmulateMobile): RequireNodeBuiltInModuleAccessor {
  const partial: Partial<RequireNodeBuiltInModuleAccessor> = obj;
  return partial as RequireNodeBuiltInModuleAccessor;
}

function asRequireNonCached(obj: RequireHandlerEmulateMobile): RequireNonCachedAccessor {
  const partial: Partial<RequireNonCachedAccessor> = obj;
  return partial as RequireNonCachedAccessor;
}

describe('RequireHandlerEmulateMobile', () => {
  let handler: RequireHandlerEmulateMobile;
  let mockParams: RequireHandlerConstructorParams;

  beforeEach(() => {
    vi.clearAllMocks();

    mockParams = {
      app: {} as never,
      consoleDebugComponent: {} as never,
      pluginRequire: vi.fn(),
      pluginSettingsComponent: {} as never,
      tempPluginRegistry: {} as never
    };

    handler = new RequireHandlerEmulateMobile(mockParams);
  });

  describe('canRequireNonCached', () => {
    it('should delegate to mobile handler', () => {
      mockMobileCanRequireNonCached.mockReturnValue(false);
      const result = asCanRequireNonCached(handler).canRequireNonCached();
      expect(result).toBe(false);
      expect(mockMobileCanRequireNonCached).toHaveBeenCalledOnce();
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
      const result = await asRequireNodeBinaryAsync(handler).requireNodeBinaryAsync('native.node');
      expect(result).toBe(mockModule);
      expect(mockMobileRequireNodeBinaryAsync).toHaveBeenCalledWith('native.node');
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
      const result = asRequireNonCached(handler).requireNonCached('some-module');
      expect(result).toBe(mockModule);
      expect(mockMobileRequireNonCached).toHaveBeenCalledWith('some-module');
    });
  });
});
