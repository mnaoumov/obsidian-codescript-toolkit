import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerConstructorParams } from './require-handler.ts';

import {
  createRequireHandler,
  RequireHandlerMobile
} from './require-handler-mobile.ts';

const { MockCapacitorAdapterClass, mockCapacitorFs } = vi.hoisted(() => {
  const fs = {
    exists: vi.fn(),
    read: vi.fn(),
    readBinary: vi.fn(),
    stat: vi.fn()
  };
  return {
    MockCapacitorAdapterClass: class MockCapacitorAdapterImpl {
      public fs = fs;
    },
    mockCapacitorFs: fs
  };
});

vi.mock('obsidian', async () => {
  const actual = await vi.importActual('obsidian');
  return {
    ...actual,
    CapacitorAdapter: MockCapacitorAdapterClass
  };
});

vi.mock('obsidian-dev-utils/obsidian/components/all-windows-event-handler', () => ({
  AllWindowsEventHandler: vi.fn()
}));

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
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

function asExistsFileAsync(obj: RequireHandlerMobile): ExistsFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ExistsFileAsyncAccessor;
}

function asExistsFolderAsync(obj: RequireHandlerMobile): ExistsFolderAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ExistsFolderAsyncAccessor;
}

function asGetTimestampAsync(obj: RequireHandlerMobile): GetTimestampAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as GetTimestampAsyncAccessor;
}

function asReadFileAsync(obj: RequireHandlerMobile): ReadFileAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ReadFileAsyncAccessor;
}

function asReadFileBinaryAsync(obj: RequireHandlerMobile): ReadFileBinaryAsyncAccessor {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access protected method
  return obj as unknown as ReadFileBinaryAsyncAccessor;
}

function createMockParams(adapter?: unknown): RequireHandlerConstructorParams {
  const partial: Partial<RequireHandlerConstructorParams> = {
    app: {
      vault: {
        adapter: adapter ?? {}
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
        modulesRoot: ''
      }
    } as never,
    tempPluginRegistry: {} as never
  };
  return partial as RequireHandlerConstructorParams;
}

describe('RequireHandlerMobile', () => {
  let handler: RequireHandlerMobile;

  function createHandler(adapter?: unknown): RequireHandlerMobile {
    const params = createMockParams(adapter);
    return new RequireHandlerMobile(params);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canRequireNonCached', () => {
    it('should return false', () => {
      handler = createHandler();
      expect(handler.canRequireNonCached()).toBe(false);
    });
  });

  describe('requireAsarPackedModule', () => {
    it('should throw an error indicating ASAR modules are unavailable on mobile', () => {
      handler = createHandler();
      expect(() => handler.requireAsarPackedModule('electron-module')).toThrow(
        'Could not require module: electron-module. ASAR packed modules are not available on mobile.'
      );
    });
  });

  describe('requireElectronModule', () => {
    it('should throw an error indicating Electron modules are unavailable on mobile', () => {
      handler = createHandler();
      expect(() => handler.requireElectronModule('electron')).toThrow(
        'Could not require module: electron. Electron modules are not available on mobile.'
      );
    });
  });

  describe('requireNodeBinaryAsync', () => {
    it('should throw an error indicating node binary modules are unavailable on mobile', async () => {
      handler = createHandler();
      await expect(handler.requireNodeBinaryAsync('native.node')).rejects.toThrow(
        'Cannot require module: native.node. Node binary modules are not available on mobile.'
      );
    });
  });

  describe('requireNodeBuiltInModule', () => {
    it('should return null for crypto module', () => {
      handler = createHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = handler.requireNodeBuiltInModule('crypto');

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        'Crypto module is not available on mobile. Consider using window.scrypt instead.'
      );
      warnSpy.mockRestore();
    });

    it('should throw for non-crypto node built-in modules', () => {
      handler = createHandler();
      expect(() => handler.requireNodeBuiltInModule('fs')).toThrow(
        'Could not require module: fs. Node built-in modules are not available on mobile.'
      );
    });

    it('should throw for path module', () => {
      handler = createHandler();
      expect(() => handler.requireNodeBuiltInModule('path')).toThrow(
        'Could not require module: path. Node built-in modules are not available on mobile.'
      );
    });
  });

  describe('requireNonCached', () => {
    it('should throw an error indicating synchronous require is unavailable on mobile', () => {
      handler = createHandler();
      expect(() => handler.requireNonCached('some-module')).toThrow(
        'Cannot require synchronously on mobile: \'some-module\'.'
      );
    });
  });

  describe('capacitorAdapter', () => {
    it('should return the adapter when it is a CapacitorAdapter', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      // Access via a method that uses the capacitorAdapter getter
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'file' });
      // ExistsFileAsync calls capacitorAdapter internally
      const accessor = asExistsFileAsync(handler);
      await expect(accessor.existsFileAsync('test.js')).resolves.toBe(true);
    });

    it('should throw when adapter is not a CapacitorAdapter', async () => {
      handler = createHandler({});
      const accessor = asExistsFileAsync(handler);
      await expect(accessor.existsFileAsync('test.js')).rejects.toThrow(
        'Vault adapter is not a CapacitorAdapter.'
      );
    });
  });

  describe('existsFileAsync', () => {
    it('should return true when file exists and is a file', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'file' });

      const accessor = asExistsFileAsync(handler);
      const result = await accessor.existsFileAsync('test.js');
      expect(result).toBe(true);
    });

    it('should return false when file exists but is a directory', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'directory' });

      const accessor = asExistsFileAsync(handler);
      const result = await accessor.existsFileAsync('test');
      expect(result).toBe(false);
    });

    it('should return false when file does not exist', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(false);

      const accessor = asExistsFileAsync(handler);
      const result = await accessor.existsFileAsync('nonexistent.js');
      expect(result).toBe(false);
    });

    it('should strip query string from path', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'file' });

      const accessor = asExistsFileAsync(handler);
      await accessor.existsFileAsync('test.js?v=1');
      expect(mockCapacitorFs.exists).toHaveBeenCalledWith('test.js');
    });
  });

  describe('existsFolderAsync', () => {
    it('should return true when path exists and is a directory', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'directory' });

      const accessor = asExistsFolderAsync(handler);
      const result = await accessor.existsFolderAsync('test-dir');
      expect(result).toBe(true);
    });

    it('should return false when path exists but is a file', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(true);
      mockCapacitorFs.stat.mockResolvedValue({ type: 'file' });

      const accessor = asExistsFolderAsync(handler);
      const result = await accessor.existsFolderAsync('test.js');
      expect(result).toBe(false);
    });

    it('should return false when path does not exist', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.exists.mockResolvedValue(false);

      const accessor = asExistsFolderAsync(handler);
      const result = await accessor.existsFolderAsync('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getTimestampAsync', () => {
    it('should return mtime from stat', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      const EXPECTED_MTIME = 1234567890;
      mockCapacitorFs.stat.mockResolvedValue({ mtime: EXPECTED_MTIME });

      const accessor = asGetTimestampAsync(handler);
      const result = await accessor.getTimestampAsync('test.js');
      expect(result).toBe(EXPECTED_MTIME);
    });

    it('should return 0 when mtime is undefined', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.stat.mockResolvedValue({});

      const accessor = asGetTimestampAsync(handler);
      const result = await accessor.getTimestampAsync('test.js');
      expect(result).toBe(0);
    });
  });

  describe('readFileAsync', () => {
    it('should return file content', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.read.mockResolvedValue('file content');

      const accessor = asReadFileAsync(handler);
      const result = await accessor.readFileAsync('test.js');
      expect(result).toBe('file content');
    });

    it('should strip query string from path', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.read.mockResolvedValue('content');

      const accessor = asReadFileAsync(handler);
      await accessor.readFileAsync('test.js?v=1');
      expect(mockCapacitorFs.read).toHaveBeenCalledWith('test.js');
    });
  });

  describe('readFileBinaryAsync', () => {
    it('should return ArrayBuffer content', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      const buffer = new ArrayBuffer(8);
      mockCapacitorFs.readBinary.mockResolvedValue(buffer);

      const accessor = asReadFileBinaryAsync(handler);
      const result = await accessor.readFileBinaryAsync('test.wasm');
      expect(result).toBe(buffer);
    });

    it('should strip query string from path', async () => {
      const adapter = new MockCapacitorAdapterClass();
      handler = createHandler(adapter);
      mockCapacitorFs.readBinary.mockResolvedValue(new ArrayBuffer(0));

      const accessor = asReadFileBinaryAsync(handler);
      await accessor.readFileBinaryAsync('test.wasm?v=2');
      expect(mockCapacitorFs.readBinary).toHaveBeenCalledWith('test.wasm');
    });
  });
});

describe('createRequireHandler', () => {
  it('should return a RequireHandlerMobile instance', () => {
    const params = createMockParams();
    const result = createRequireHandler(params);
    expect(result).toBeInstanceOf(RequireHandlerMobile);
  });
});
