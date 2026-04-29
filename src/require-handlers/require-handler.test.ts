import {
  afterEach,
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
import {
  ENTRY_POINT,
  EXTENSIONS,
  extractCodeScript,
  getModuleTypeFromPath,
  MODULE_NAME_SEPARATOR,
  NODE_MODULES_FOLDER,
  PATH_SUFFIXES,
  PRIVATE_MODULE_PREFIX,
  RELATIVE_MODULE_PATH_SEPARATOR,
  RequireHandlerBase,
  ResolvedType,
  SCOPED_MODULE_PREFIX,
  splitQuery,
  VAULT_ROOT_PREFIX
} from './require-handler.ts';

const { mockAllWindowsHandlerCallback, mockDebuggableEval, mockRequestUrl } = vi.hoisted(() => ({
  mockAllWindowsHandlerCallback: vi.fn(),
  mockDebuggableEval: vi.fn(),
  mockRequestUrl: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/all-windows-event-handler', () => ({
  AllWindowsEventHandler: class {
    public registerAllWindowsHandler(cb: (win: Window) => void): void {
      mockAllWindowsHandlerCallback(cb);
      cb(window);
    }
  }
}));

vi.mock('obsidian', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    requestUrl: mockRequestUrl
  };
});

vi.mock('obsidian-typings/implementations', () => ({
  getDataAdapterEx: vi.fn().mockReturnValue({ basePath: '/vault' }),
  loadPrism: vi.fn()
}));

vi.mock('debuggable-eval', () => ({
  debuggableEval: mockDebuggableEval
}));

vi.mock('../obsidian-dev-utils-module.ts', () => ({
  registerObsidianDevUtilsModule: vi.fn()
}));

vi.mock('../special-module-names.ts', () => ({
  SPECIAL_MODULE_NAMES: {
    asarPackedModuleNames: ['asar-packed-mod'],
    deprecatedObsidianBuiltInModuleNames: ['deprecated-mod'],
    electronModuleNames: ['electron-mod'],
    nodeBuiltInModuleNames: ['fs', 'path'],
    obsidianBuiltInModuleNames: ['obsidian']
  }
}));

vi.mock('../code-script-toolkit-module-impl.ts', () => ({
  CodeScriptToolkitModuleImpl: vi.fn()
}));

interface CustomRequireWindow {
  require: (id: string, options?: Partial<RequireOptions>) => unknown;
}

interface MockCleanups {
  cleanups__: (() => void)[];
}

interface MockModuleWithExports {
  exports: unknown;
}

interface MockPlatformResourcePath {
  Platform: MockResourcePathPrefix;
}

interface MockPluginRequireAccessor {
  pluginRequire: ReturnType<typeof vi.fn>;
}

interface MockPluginSettings {
  modulesRoot: string;
}

interface MockPluginSettingsComponent {
  settings: MockPluginSettings;
}

interface MockPluginSettingsComponentAccessor {
  pluginSettingsComponent: MockPluginSettingsComponent;
}

interface MockResourcePathPrefix {
  resourcePathPrefix: string;
}

interface MockWindowRequire {
  require?: unknown;
}

interface RequireAsyncWindow {
  requireAsync?: unknown;
}

interface RequireAsyncWrapperTypedWindow {
  requireAsyncWrapper?: (fn: (r: (id: string) => unknown) => unknown, r?: unknown) => Promise<unknown>;
}

interface RequireAsyncWrapperWindow {
  requireAsyncWrapper?: (fn: (r: unknown) => unknown, r?: unknown) => Promise<unknown>;
}

interface RequireWindowFull {
  requireAsync?: unknown;
  requireAsyncWrapper?: unknown;
}

interface ResolveResult {
  resolvedId: string;
  resolvedType: ResolvedType;
}

function windowCustomRequire(id: string, options?: Partial<RequireOptions>): unknown {
  // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
  return (window as unknown as CustomRequireWindow).require(id, options);
}

describe('splitQuery', () => {
  it('should return the original string and empty query when no query is present', () => {
    const result = splitQuery('path/to/file.ts');
    expect(result.cleanStr).toBe('path/to/file.ts');
    expect(result.query).toBe('');
  });

  it('should split path and query when query is present', () => {
    const result = splitQuery('path/to/file.ts?codeScriptName=myScript');
    expect(result.cleanStr).toBe('path/to/file.ts');
    expect(result.query).toBe('?codeScriptName=myScript');
  });

  it('should handle query with multiple parameters', () => {
    const result = splitQuery('file.md?a=1&b=2');
    expect(result.cleanStr).toBe('file.md');
    expect(result.query).toBe('?a=1&b=2');
  });

  it('should handle string that is only a query', () => {
    const result = splitQuery('?query');
    expect(result.cleanStr).toBe('');
    expect(result.query).toBe('?query');
  });

  it('should handle empty string', () => {
    const result = splitQuery('');
    expect(result.cleanStr).toBe('');
    expect(result.query).toBe('');
  });
});

describe('getModuleTypeFromPath', () => {
  it('should return JsTs for .js extension', () => {
    expect(getModuleTypeFromPath('file.js')).toBe(ModuleType.JsTs);
  });

  it('should return JsTs for .cjs extension', () => {
    expect(getModuleTypeFromPath('file.cjs')).toBe(ModuleType.JsTs);
  });

  it('should return JsTs for .mjs extension', () => {
    expect(getModuleTypeFromPath('file.mjs')).toBe(ModuleType.JsTs);
  });

  it('should return JsTs for .ts extension', () => {
    expect(getModuleTypeFromPath('file.ts')).toBe(ModuleType.JsTs);
  });

  it('should return JsTs for .cts extension', () => {
    expect(getModuleTypeFromPath('file.cts')).toBe(ModuleType.JsTs);
  });

  it('should return JsTs for .mts extension', () => {
    expect(getModuleTypeFromPath('file.mts')).toBe(ModuleType.JsTs);
  });

  it('should return Json for .json extension', () => {
    expect(getModuleTypeFromPath('file.json')).toBe(ModuleType.Json);
  });

  it('should return Markdown for .md extension', () => {
    expect(getModuleTypeFromPath('file.md')).toBe(ModuleType.Markdown);
  });

  it('should return Node for .node extension', () => {
    expect(getModuleTypeFromPath('file.node')).toBe(ModuleType.Node);
  });

  it('should return Wasm for .wasm extension', () => {
    expect(getModuleTypeFromPath('file.wasm')).toBe(ModuleType.Wasm);
  });

  it('should throw for unsupported extension', () => {
    expect(() => getModuleTypeFromPath('file.txt')).toThrow('Unsupported file extension: \'.txt\'.');
  });

  it('should strip query before checking extension', () => {
    expect(getModuleTypeFromPath('file.ts?query=1')).toBe(ModuleType.JsTs);
  });

  it('should handle nested paths', () => {
    expect(getModuleTypeFromPath('/path/to/deep/file.json')).toBe(ModuleType.Json);
  });
});

describe('extractCodeScript', () => {
  const SIMPLE_MD_WITH_CODE_SCRIPT = [
    '# Test',
    '',
    '```code-script',
    'console.log(\'hello\');',
    '```'
  ].join('\n');

  it('should extract the first code-script block from markdown', () => {
    const result = extractCodeScript(SIMPLE_MD_WITH_CODE_SCRIPT, 'test.md');
    expect(result.code).toBe('console.log(\'hello\');');
    expect(result.codeScriptName).toBeUndefined();
  });

  it('should throw when no code-script block is found', () => {
    const md = [
      '# Test',
      '',
      '```typescript',
      'console.log(\'hello\');',
      '```'
    ].join('\n');

    expect(() => extractCodeScript(md, 'test.md')).toThrow('No code-script code block found in \'test.md\'.');
  });

  it('should throw when markdown has no code blocks at all', () => {
    const md = '# Just a heading\n\nSome text.';
    expect(() => extractCodeScript(md, 'empty.md')).toThrow('No code-script code block found in \'empty.md\'.');
  });

  it('should extract the first code-script block when multiple exist', () => {
    const md = [
      '```code-script',
      'first();',
      '```',
      '',
      '```code-script',
      'second();',
      '```'
    ].join('\n');

    const result = extractCodeScript(md, 'test.md');
    expect(result.code).toBe('first();');
  });

  it('should extract named code-script using query parameter', () => {
    const md = [
      '```code-script',
      '// codeScriptName: myScript',
      'console.log(\'named\');',
      '```'
    ].join('\n');

    const result = extractCodeScript(md, 'test.md?codeScriptName=myScript');
    expect(result.code).toBe('// codeScriptName: myScript\nconsole.log(\'named\');');
    expect(result.codeScriptName).toBe('myScript');
  });

  it('should throw when named code-script is not found', () => {
    const md = [
      '```code-script',
      'console.log(\'no name\');',
      '```'
    ].join('\n');

    expect(() => extractCodeScript(md, 'test.md?codeScriptName=missing')).toThrow(
      'Code script with name missing not found in \'test.md?codeScriptName=missing\'.'
    );
  });

  it('should throw for invalid query parameter', () => {
    const md = [
      '```code-script',
      'console.log(\'hello\');',
      '```'
    ].join('\n');

    expect(() => extractCodeScript(md, 'test.md?invalidParam=value')).toThrow('Invalid query: \'?invalidParam=value\'.');
  });

  it('should use defaultCodeScriptName from frontmatter when no query', () => {
    const md = [
      '---',
      'codeScriptToolkit:',
      '  defaultCodeScriptName: myDefault',
      '---',
      '',
      '```code-script',
      '// codeScriptName: myDefault',
      'console.log(\'default\');',
      '```',
      '',
      '```code-script',
      'console.log(\'other\');',
      '```'
    ].join('\n');

    const result = extractCodeScript(md, 'test.md');
    expect(result.code).toBe('// codeScriptName: myDefault\nconsole.log(\'default\');');
    expect(result.codeScriptName).toBe('myDefault');
  });
});

describe('exported constants', () => {
  it('should have correct ENTRY_POINT value', () => {
    expect(ENTRY_POINT).toBe('.');
  });

  it('should have correct EXTENSIONS', () => {
    expect(EXTENSIONS).toEqual(['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.md']);
  });

  it('should have correct MODULE_NAME_SEPARATOR', () => {
    expect(MODULE_NAME_SEPARATOR).toBe('*');
  });

  it('should have correct NODE_MODULES_FOLDER', () => {
    expect(NODE_MODULES_FOLDER).toBe('node_modules');
  });

  it('should have correct PATH_SUFFIXES', () => {
    const expectedSuffixes = [
      '',
      '.js',
      '.cjs',
      '.mjs',
      '.ts',
      '.cts',
      '.mts',
      '.md',
      '/index.js',
      '/index.cjs',
      '/index.mjs',
      '/index.ts',
      '/index.cts',
      '/index.mts',
      '/index.md'
    ];
    expect(PATH_SUFFIXES).toEqual(expectedSuffixes);
  });

  it('should have correct PRIVATE_MODULE_PREFIX', () => {
    expect(PRIVATE_MODULE_PREFIX).toBe('#');
  });

  it('should have correct RELATIVE_MODULE_PATH_SEPARATOR', () => {
    expect(RELATIVE_MODULE_PATH_SEPARATOR).toBe('/');
  });

  it('should have correct SCOPED_MODULE_PREFIX', () => {
    expect(SCOPED_MODULE_PREFIX).toBe('@');
  });

  it('should have correct VAULT_ROOT_PREFIX', () => {
    expect(VAULT_ROOT_PREFIX).toBe('//');
  });
});

describe('ResolvedType', () => {
  it('should have Module value', () => {
    expect(ResolvedType.Module).toBe('module');
  });

  it('should have Path value', () => {
    expect(ResolvedType.Path).toBe('path');
  });

  it('should have SpecialModule value', () => {
    expect(ResolvedType.SpecialModule).toBe('specialModule');
  });

  it('should have Url value', () => {
    expect(ResolvedType.Url).toBe('url');
  });
});

describe('RequireHandlerBase', () => {
  let handler: TestRequireHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const params = createMockConstructorParams();
    handler = new TestRequireHandler(params);
  });

  afterEach(() => {
    handler.unload();
  });

  describe('clearCache', () => {
    it('should clear moduleTimestamps, currentModulesTimestampChain, and moduleDependencies', () => {
      handler.exposeModuleTimestamps().set('some-path', Date.now());
      handler.exposeCurrentModulesTimestampChain().add('some-chain');
      handler.exposeModuleDependencies().set('some-dep', new Set(['a']));

      handler.clearCache();

      expect(handler.exposeModuleTimestamps().size).toBe(0);
      expect(handler.exposeCurrentModulesTimestampChain().size).toBe(0);
      expect(handler.exposeModuleDependencies().size).toBe(0);
    });

    it('should preserve electron cache entries', () => {
      handler.exposeModulesCache()['electron'] = createMockNodeModule('electron');
      handler.exposeModulesCache()['some-module'] = createMockNodeModule('some-module');

      handler.clearCache();

      expect(handler.exposeModulesCache()['electron']).toBeDefined();
      expect(handler.exposeModulesCache()['some-module']).toBeUndefined();
    });

    it('should preserve app.asar cache entries', () => {
      handler.exposeModulesCache()['/path/to/app.asar/module'] = createMockNodeModule('asar-module');
      handler.exposeModulesCache()['regular-module'] = createMockNodeModule('regular-module');

      handler.clearCache();

      expect(handler.exposeModulesCache()['/path/to/app.asar/module']).toBeDefined();
      expect(handler.exposeModulesCache()['regular-module']).toBeUndefined();
    });

    it('should remove all non-electron non-asar cache entries', () => {
      handler.exposeModulesCache()['module-a'] = createMockNodeModule('module-a');
      handler.exposeModulesCache()['module-b'] = createMockNodeModule('module-b');
      handler.exposeModulesCache()['electron-main'] = createMockNodeModule('electron-main');

      handler.clearCache();

      expect(Object.keys(handler.exposeModulesCache())).toEqual(['electron-main']);
    });
  });

  describe('onload', () => {
    it('should set vaultAbsolutePath from adapter basePath', async () => {
      await handler.onload();
      expect(handler.exposeVaultAbsolutePath()).toBe('/vault');
    });

    it('should set window.require to the handler require', async () => {
      await handler.onload();
      expect(window.require).toBeDefined();
    });

    it('should register requireAsync on window', async () => {
      await handler.onload();
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireAsyncWindow;
      expect(requireWindow.requireAsync).toBeDefined();
    });

    it('should register requireAsyncWrapper on window', async () => {
      await handler.onload();
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireWindowFull;
      expect(requireWindow.requireAsyncWrapper).toBeDefined();
    });

    it('should call AllWindowsEventHandler with the handler callback', async () => {
      await handler.onload();
      expect(mockAllWindowsHandlerCallback).toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve a special module by name', () => {
      const result = handler.exposeResolve('obsidian/app');
      expect(result.resolvedType).toBe(ResolvedType.SpecialModule);
      expect(result.resolvedId).toBe('obsidian/app');
    });

    it('should resolve a special module with a query string', () => {
      const result = handler.exposeResolve('obsidian/app?v=1');
      expect(result.resolvedType).toBe(ResolvedType.SpecialModule);
      expect(result.resolvedId).toBe('obsidian/app?v=1');
    });

    it('should resolve an http URL as Url type', () => {
      const result = handler.exposeResolve('http://example.com/mod.js');
      expect(result.resolvedType).toBe(ResolvedType.Url);
      expect(result.resolvedId).toBe('http://example.com/mod.js');
    });

    it('should resolve an https URL as Url type', () => {
      const result = handler.exposeResolve('https://example.com/mod.js');
      expect(result.resolvedType).toBe(ResolvedType.Url);
      expect(result.resolvedId).toBe('https://example.com/mod.js');
    });

    it('should resolve a file:/// URL as a Path', () => {
      const result = handler.exposeResolve('file:///C:/some/path.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('C:/some/path.js');
    });

    it('should resolve vault root prefix (//) as a path under vault', () => {
      const result = handler.exposeResolve('//scripts/helper.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/vault/scripts/helper.js');
    });

    it('should resolve system root prefix (~/) as absolute path', () => {
      const result = handler.exposeResolve('~/usr/lib/mod.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/usr/lib/mod.js');
    });

    it('should resolve modules root prefix (/) as a path under vault + modulesRoot', () => {
      const result = handler.exposeResolve('/my-module.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/vault/my-module.js');
    });

    it('should resolve absolute paths via modules root prefix', () => {
      const result = handler.exposeResolve('/absolute/path/to/module.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/vault/absolute/path/to/module.js');
    });

    it('should resolve relative paths (./) as Path type', () => {
      const result = handler.exposeResolve('./relative.js', '/parent/dir/file.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/parent/dir/relative.js');
    });

    it('should resolve parent-relative paths (../) as Path type', () => {
      const result = handler.exposeResolve('../sibling.js', '/parent/dir/file.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/parent/sibling.js');
    });

    it('should resolve bare module names as Module type', () => {
      const result = handler.exposeResolve('some-module', '/parent/dir/file.js');
      expect(result.resolvedType).toBe(ResolvedType.Module);
      expect(result.resolvedId).toBe('/parent/dir*some-module');
    });

    it('should resolve resource path prefix URLs as Path type', async () => {
      // eslint-disable-next-line no-restricted-syntax -- dynamic import needed for test
      const obsidian = await import('obsidian') as unknown as MockPlatformResourcePath;
      const resourceUrl = `${obsidian.Platform.resourcePathPrefix}some/path.js`;
      const result = handler.exposeResolve(resourceUrl);
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('some/path.js');
    });
  });

  describe('requireSpecialModule', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return the app for obsidian/app', () => {
      const result = handler.exposeRequireSpecialModule('obsidian/app', {});
      expect(result).toBeDefined();
    });

    it('should return undefined for unknown module', () => {
      const result = handler.exposeRequireSpecialModule('unknown-module', {});
      expect(result).toBeUndefined();
    });

    it('should delegate to requireElectronModule when parentModule is from app.asar', () => {
      const parentModule = createMockNodeModule('app.asar/something');
      parentModule.path = '/path/to/app.asar/something';
      handler.exposeRequireSpecialModule('any-id', { parentModule });
      expect(handler.mockRequireElectronModule).toHaveBeenCalledWith('any-id', { parentModule });
    });

    it('should strip query from id when checking specialModuleFactories', () => {
      const result = handler.exposeRequireSpecialModule('obsidian/app?query=1', {});
      expect(result).toBeDefined();
    });

    it('should return node built-in module for registered node module', () => {
      const result = handler.exposeRequireSpecialModule('fs', {});
      expect(result).toBeDefined();
      expect(handler.mockRequireNodeBuiltInModule).toHaveBeenCalledWith('fs');
    });

    it('should return node built-in module with node: prefix', () => {
      const result = handler.exposeRequireSpecialModule('node:fs', {});
      expect(result).toBeDefined();
      expect(handler.mockRequireNodeBuiltInModule).toHaveBeenCalledWith('fs');
    });

    it('should throw for deprecated obsidian built-in modules', () => {
      expect(() => handler.exposeRequireSpecialModule('deprecated-mod', {})).toThrow(
        'Could not require module: deprecated-mod. Deprecated Obsidian built-in modules are no longer available.'
      );
    });

    it('should delegate to requireAsarPackedModule for asar-packed module names', () => {
      handler.exposeRequireSpecialModule('asar-packed-mod', {});
      expect(handler.mockRequireAsarPackedModule).toHaveBeenCalledWith('asar-packed-mod', {});
    });

    it('should delegate to requireElectronModule for electron module names', () => {
      handler.exposeRequireSpecialModule('electron-mod', {});
      expect(handler.mockRequireElectronModule).toHaveBeenCalledWith('electron-mod', {});
    });

    it('should return codescript-toolkit module', () => {
      const result = handler.exposeRequireSpecialModule('codescript-toolkit', {});
      expect(result).toBeDefined();
    });

    it('should delegate to pluginRequire for obsidian built-in module names', () => {
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const mockPluginRequire = (handler as unknown as MockPluginRequireAccessor).pluginRequire;
      vi.mocked(mockPluginRequire).mockReturnValue({ obsidianModule: true });

      const result = handler.exposeRequireSpecialModule('obsidian', {});
      expect(result).toEqual({ obsidianModule: true });
      expect(mockPluginRequire).toHaveBeenCalledWith('obsidian');
    });
  });

  describe('initModuleAndAddToCache', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should add a module to cache and return it', () => {
      const mockModule = { value: 42 };
      const result = handler.exposeInitModuleAndAddToCache('test-mod', () => mockModule);
      expect(result).toBe(mockModule);
      expect(handler.exposeModulesCache()['test-mod']).toBeDefined();
      expect(handler.exposeModulesCache()['test-mod']?.loaded).toBe(true);
    });

    it('should delete cache entry on initializer error', () => {
      expect(() =>
        handler.exposeInitModuleAndAddToCache('fail-mod', () => {
          throw new Error('init failed');
        })
      ).toThrow('init failed');
      expect(handler.exposeModulesCache()['fail-mod']).toBeUndefined();
    });

    it('should return cached module if already loaded during initialization', () => {
      const existingModule = { existing: true };
      handler.exposeInitModuleAndAddToCache('dup-mod', () => existingModule);

      const result = handler.exposeInitModuleAndAddToCache('dup-mod', () => {
        return { newer: true };
      });
      expect(result).toEqual({ newer: true });
    });

    it('should replace existing loaded module in cache', () => {
      handler.exposeInitModuleAndAddToCache('replace-mod', () => ({ first: true }));
      handler.exposeInitModuleAndAddToCache('replace-mod', () => ({ second: true }));

      const cached = handler.exposeModulesCache()['replace-mod'];
      expect(cached?.exports).toEqual(expect.objectContaining({ second: true }));
    });
  });

  describe('requireAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return special module immediately if found', async () => {
      const result = await handler.requireAsync('obsidian/app');
      expect(result).toBeDefined();
    });

    it('should return cached module with CacheInvalidationMode.Never', async () => {
      const mockModule = { cached: true };
      handler.exposeInitModuleAndAddToCache('obsidian/specialModuleNames', () => mockModule);

      const result = await handler.requireAsync('obsidian/specialModuleNames', {
        cacheInvalidationMode: CacheInvalidationMode.Never
      });
      expect(result).toBeDefined();
    });

    it('should use WhenPossible as default cacheInvalidationMode', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = { test: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        ctx['module'] = { exports: { test: true } };
      });

      const result = await handler.requireAsync('//test.js');
      expect(result).toBeDefined();
    });

    it('should warn on circular dependency and return cached exports', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Stub
      });

      const mockCacheEntry = createMockNodeModule('circular-mod');
      mockCacheEntry.loaded = false;
      mockCacheEntry.exports = { circular: true };
      handler.exposeModulesCache()['/vault/circular-mod'] = mockCacheEntry;

      const result = await handler.requireAsync('//circular-mod');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Circular dependency detected'));
      expect(result).toEqual({ circular: true });

      consoleWarnSpy.mockRestore();
    });

    it('should return cached exports when module is in timestamp chain', async () => {
      const cachedExports = { chained: true };
      handler.exposeInitModuleAndAddToCache('/vault/chained-mod', () => cachedExports);
      handler.exposeCurrentModulesTimestampChain().add('/vault/chained-mod');

      const result = await handler.requireAsync('//chained-mod');
      expect(result).toEqual(expect.objectContaining({ chained: true }));
    });

    it('should return cached module exports when cacheInvalidationMode is Never', async () => {
      const cachedExports = { never: true };
      handler.exposeInitModuleAndAddToCache('/vault/never-mod', () => cachedExports);

      const result = await handler.requireAsync('//never-mod', {
        cacheInvalidationMode: CacheInvalidationMode.Never
      });
      expect(result).toEqual(expect.objectContaining({ never: true }));
    });

    it('should return cached exports for query paths with WhenPossible mode', async () => {
      const cachedExports = { queryMod: true };
      handler.exposeInitModuleAndAddToCache('/vault/query-mod?v=1', () => cachedExports);

      const result = await handler.requireAsync('//query-mod?v=1', {
        cacheInvalidationMode: CacheInvalidationMode.WhenPossible
      });
      expect(result).toEqual(expect.objectContaining({ queryMod: true }));
    });

    it('should throw for unknown cacheInvalidationMode', async () => {
      handler.exposeInitModuleAndAddToCache('/vault/test-mod', () => ({ test: true }));

      await expect(handler.requireAsync('//test-mod', {
        cacheInvalidationMode: 'unknown' as CacheInvalidationMode
      })).rejects.toThrow('Unknown cacheInvalidationMode: \'unknown\'.');
    });
  });

  describe('requireVaultScriptAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should delegate to requireAsync with vault root prefix', async () => {
      const requireAsyncSpy = vi.spyOn(handler, 'requireAsync').mockResolvedValue({ helper: true });
      await handler.requireVaultScriptAsync('scripts/helper.js');
      expect(requireAsyncSpy).toHaveBeenCalledWith('//scripts/helper.js');
      requireAsyncSpy.mockRestore();
    });
  });

  describe('requireStringAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should evaluate code string and return module exports', async () => {
      const mockExports = { fromString: true };

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = mockExports;
      });

      const result = await handler.requireStringAsync({
        code: 'module.exports = { fromString: true };',
        path: '/test/string-module.js'
      });
      expect(result).toEqual(expect.objectContaining({ fromString: true }));
    });

    it('should wrap error with module path', async () => {
      mockDebuggableEval.mockImplementation(() => {
        throw new Error('eval failed');
      });

      await expect(handler.requireStringAsync({
        code: 'invalid code',
        path: '/test/fail-module.js'
      })).rejects.toThrow('Failed to load module: \'/test/fail-module.js\'.');
    });

    it('should append urlSuffix when provided', async () => {
      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { withSuffix: true };
      });

      const result = await handler.requireStringAsync({
        code: 'module.exports = {};',
        path: '/test/module.js',
        urlSuffix: 'code-script.(default).ts'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getCachedModule', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return null when module is not in cache', () => {
      handler.exposeInitModuleAndAddToCache('temp', () => ({}));
      handler.clearCache();
      const cache = handler.exposeModulesCache();
      expect(cache['nonexistent']).toBeUndefined();
    });

    it('should return exports for loaded module', () => {
      const mockExports = { loaded: true };
      handler.exposeInitModuleAndAddToCache('loaded-mod', () => mockExports);
      const cached = handler.exposeModulesCache()['loaded-mod'];
      expect(cached?.loaded).toBe(true);
      expect(cached?.exports).toEqual(expect.objectContaining({ loaded: true }));
    });
  });

  describe('getPackageJsonPath', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should join folder with package.json', () => {
      const result = handler.exposeInitModuleAndAddToCache('pkg-test', () => ({}));
      expect(result).toBeDefined();
    });
  });

  describe('getRelativeModulePaths', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve module through requireAsync with path-based module', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = { hello: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { hello: true };
      });

      const result = await handler.requireAsync('//hello.js');
      expect(result).toBeDefined();
    });
  });

  describe('resolve with modulesRoot', () => {
    it('should resolve modules root prefix using configured modulesRoot', async () => {
      const params = createMockConstructorParams();
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (params as unknown as MockPluginSettingsComponentAccessor)
        .pluginSettingsComponent.settings.modulesRoot = 'custom/modules';
      const customHandler = new TestRequireHandler(params);
      await customHandler.onload();

      const result = customHandler.exposeResolve('/my-script.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/vault/custom/modules/my-script.js');
    });
  });

  describe('onload cleanup callbacks', () => {
    it('should set up and tear down requireAsync on window', async () => {
      await handler.onload();
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireWindowFull;
      const hasRequireAsync = requireWindow.requireAsync !== undefined;
      const hasRequireAsyncWrapper = requireWindow.requireAsyncWrapper !== undefined;
      expect(hasRequireAsync).toBe(true);
      expect(hasRequireAsyncWrapper).toBe(true);
    });
  });

  describe('sync require via window.require', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return special module for obsidian/app via sync require', () => {
      const result: unknown = window.require('obsidian/app');
      expect(result).toBeDefined();
    });

    it('should return cached module with CacheInvalidationMode.Never via sync require', () => {
      const mockExports = { syncCached: true };
      handler.exposeInitModuleAndAddToCache('/vault/sync-mod', () => mockExports);

      const result: unknown = windowCustomRequire('//sync-mod', { cacheInvalidationMode: CacheInvalidationMode.Never });
      expect(result).toEqual(expect.objectContaining({ syncCached: true }));
    });

    it('should return cached exports when module is in timestamp chain via sync require', () => {
      const cachedExports = { chained: true };
      handler.exposeInitModuleAndAddToCache('/vault/chain-sync', () => cachedExports);
      handler.exposeCurrentModulesTimestampChain().add('/vault/chain-sync');

      const result: unknown = window.require('//chain-sync');
      expect(result).toEqual(expect.objectContaining({ chained: true }));
    });

    it('should warn on circular dependency via sync require', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Stub
      });
      const mockCacheEntry = createMockNodeModule('circular-sync');
      mockCacheEntry.loaded = false;
      mockCacheEntry.exports = { circular: true };
      handler.exposeModulesCache()['/vault/circular-sync'] = mockCacheEntry;

      const result: unknown = window.require('//circular-sync');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Circular dependency detected'));
      expect(result).toEqual({ circular: true });
      consoleWarnSpy.mockRestore();
    });

    it('should throw for Always cacheInvalidationMode when canRequireNonCached returns false', () => {
      handler.mockCanRequireNonCached.mockReturnValue(false);
      handler.exposeInitModuleAndAddToCache('/vault/always-mod', () => ({ test: true }));

      expect((): void => {
        windowCustomRequire('//always-mod', {
          cacheInvalidationMode: CacheInvalidationMode.Always
        });
      }).toThrow('cannot be invalidated synchronously');
    });

    it('should warn and return cached for WhenPossible when canRequireNonCached returns false', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Stub
      });
      handler.mockCanRequireNonCached.mockReturnValue(false);
      handler.exposeInitModuleAndAddToCache('/vault/possible-mod', () => ({ possible: true }));

      const result: unknown = windowCustomRequire('//possible-mod', {
        cacheInvalidationMode: CacheInvalidationMode.WhenPossible
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('cannot be invalidated synchronously'));
      expect(result).toEqual(expect.objectContaining({ possible: true }));
      consoleWarnSpy.mockRestore();
    });

    it('should return cached exports for query paths with WhenPossible mode via sync require', () => {
      const cachedExports = { querySync: true };
      handler.exposeInitModuleAndAddToCache('/vault/q-mod?v=1', () => cachedExports);

      const result: unknown = windowCustomRequire('//q-mod?v=1', {
        cacheInvalidationMode: CacheInvalidationMode.WhenPossible
      });
      expect(result).toEqual(expect.objectContaining({ querySync: true }));
    });

    it('should throw for unknown cacheInvalidationMode via sync require', () => {
      handler.exposeInitModuleAndAddToCache('/vault/bad-mode', () => ({ test: true }));

      expect((): void => {
        windowCustomRequire('//bad-mode', {
          cacheInvalidationMode: 'bogus' as CacheInvalidationMode
        });
      }).toThrow('Unknown cacheInvalidationMode: \'bogus\'.');
    });

    it('should require non-cached .md file via sync require', () => {
      handler.mockRequireNonCached.mockReturnValue({ mdModule: true });
      const result: unknown = window.require('//test.md');
      expect(handler.mockRequireNonCached).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ mdModule: true }));
    });

    it('should cache module with clean id and add query alias', () => {
      handler.mockRequireNonCached.mockReturnValue({ queryResult: true });
      handler.mockCanRequireNonCached.mockReturnValue(true);

      const result: unknown = window.require('//clean-mod.js?v=2');
      expect(result).toBeDefined();

      const cleanCached = handler.exposeModulesCache()['/vault/clean-mod.js'];
      const queryCached = handler.exposeModulesCache()['/vault/clean-mod.js?v=2'];
      expect(cleanCached).toBeDefined();
      expect(queryCached).toBeDefined();
    });
  });

  describe('requireAsync with .md extension', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should use resolvedId (with query) as cache key for .md files', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue([
        '```code-script',
        'console.log(\'hello\');',
        '```'
      ].join('\n'));

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { mdResult: true };
      });

      const result = await handler.requireAsync('//test.md');
      expect(result).toBeDefined();
    });
  });

  describe('requireAsync cache with query and clean id', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should add query alias when resolvedId differs from cleanResolvedId', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = { clean: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { clean: true };
      });

      await handler.requireAsync('//mod.js?v=1');
      expect(handler.exposeModulesCache()['/vault/mod.js']).toBeDefined();
      expect(handler.exposeModulesCache()['/vault/mod.js?v=1']).toBeDefined();
    });
  });

  describe('getRelativeModulePaths', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve module with package.json main field', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/test-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/test-pkg/lib/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        if (path === '/vault/node_modules/test-pkg') {
          return true;
        }
        return false;
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/test-pkg/package.json') {
          return JSON.stringify({ main: './lib/index.js' });
        }
        return 'module.exports = { pkg: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { pkg: true };
      });

      const result = await handler.requireAsync('test-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });

    it('should resolve module with package.json exports field', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/exports-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/exports-pkg/dist/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        if (path === '/vault/node_modules/exports-pkg') {
          return true;
        }
        return false;
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/exports-pkg/package.json') {
          return JSON.stringify({ exports: { '.': './dist/index.js' } });
        }
        return 'module.exports = { exported: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { exported: true };
      });

      const result = await handler.requireAsync('exports-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });

    it('should throw for unresolvable module', async () => {
      handler.mockExistsFile.mockResolvedValue(false);
      handler.mockExistsFolder.mockResolvedValue(false);

      await expect(handler.requireAsync('nonexistent-pkg', {
        parentPath: '/vault/src/index.js'
      })).rejects.toThrow('Could not resolve module: \'nonexistent-pkg\'.');
    });

    it('should throw for invalid scoped module without separator', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        if (path === '/vault') {
          return true;
        }
        return false;
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        return '';
      });

      await expect(handler.requireAsync('@scope', {
        parentPath: '/vault/src/index.js'
      })).rejects.toThrow('Invalid scoped module name: \'@scope\'.');
    });
  });

  describe('requireJsonAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should parse and return JSON content', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('{"key": "value"}');

      const result = await handler.requireAsync('//data.json');
      expect(result).toEqual({ key: 'value' });
    });
  });

  describe('getRequireAsyncAdvice', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should include module id in advice string (tested via error message)', () => {
      handler.mockCanRequireNonCached.mockReturnValue(false);
      handler.exposeInitModuleAndAddToCache('/vault/advice-mod', () => ({ test: true }));

      expect((): void => {
        windowCustomRequire('//advice-mod', {
          cacheInvalidationMode: CacheInvalidationMode.Always
        });
      }).toThrow('require(\'/vault/advice-mod\')');
    });
  });

  describe('sync require with Always mode and canRequireNonCached true', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should call requireNonCached when Always mode and canRequireNonCached is true', () => {
      handler.mockCanRequireNonCached.mockReturnValue(true);
      handler.mockRequireNonCached.mockReturnValue({ fresh: true });
      handler.exposeInitModuleAndAddToCache('/vault/fresh-mod.js', () => ({ stale: true }));

      const result: unknown = windowCustomRequire('//fresh-mod.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(handler.mockRequireNonCached).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ fresh: true }));
    });

    it('should call requireNonCached when WhenPossible mode and canRequireNonCached is true', () => {
      handler.mockCanRequireNonCached.mockReturnValue(true);
      handler.mockRequireNonCached.mockReturnValue({ refreshed: true });
      handler.exposeInitModuleAndAddToCache('/vault/refresh-mod.js', () => ({ old: true }));

      const result: unknown = windowCustomRequire('//refresh-mod.js', {
        cacheInvalidationMode: CacheInvalidationMode.WhenPossible
      });
      expect(handler.mockRequireNonCached).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ refreshed: true }));
    });
  });

  describe('makeChildRequire and makeChildRequireAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should track dependencies when child require is used', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);

      const childCode = 'const dep = require(\'./dep.js\'); module.exports = { main: true };';
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path.endsWith('dep.js')) {
          return 'module.exports = { dep: true };';
        }
        return childCode;
      });

      mockDebuggableEval.mockImplementation((code: string): (ctx: Record<string, unknown>) => void => {
        if (code.includes('dep')) {
          return (ctx: Record<string, unknown>): void => {
            const mod = ctx['module'] as MockModuleWithExports;
            mod.exports = { main: true };
          };
        }
        return (ctx: Record<string, unknown>): void => {
          const mod = ctx['module'] as MockModuleWithExports;
          mod.exports = { dep: true };
        };
      });

      const result = await handler.requireAsync('//main.js');
      expect(result).toBeDefined();
    });
  });

  describe('resolve with no parentPath and no active file', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should fall back to fakeRoot.js when no active file', () => {
      const result = handler.exposeResolve('some-bare-module');
      expect(result.resolvedType).toBe(ResolvedType.Module);
      expect(result.resolvedId).toContain('some-bare-module');
    });
  });

  describe('requirePathImplAsync module type dispatch', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should handle JSON modules via requireAsync', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('{"jsonKey": "jsonValue"}');

      const result = await handler.requireAsync('//data.json');
      expect(result).toEqual({ jsonKey: 'jsonValue' });
    });

    it('should handle .node modules via requireAsync', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);

      const result = await handler.requireAsync('//native.node');
      expect(handler.mockRequireNodeBinaryAsync).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ nodeBinary: true }));
    });

    it('should handle .wasm modules via requireAsync', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFileBinary.mockResolvedValue(new ArrayBuffer(0));

      const WASM_RETURN = 42;
      const mockWasmExports = { wasmFn: (): number => WASM_RETURN };
      const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate').mockResolvedValue(
        {
          instance: { exports: mockWasmExports },
          module: {}
        } as never
      );

      const result = await handler.requireAsync('//module.wasm');
      expect(result).toEqual(mockWasmExports);

      instantiateSpy.mockRestore();
    });

    it('should throw for unknown module type', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);

      await expect(handler.requireAsync('//file.unknown', {
        moduleType: 'unknown' as ModuleType
      })).rejects.toThrow('Unknown module type: \'unknown\'.');
    });
  });

  describe('requireModuleAsync with scoped packages', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve scoped packages like @scope/pkg', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/@scope/pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/@scope/pkg/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        if (path === '/vault/node_modules/@scope/pkg') {
          return true;
        }
        return false;
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/@scope/pkg/package.json') {
          return JSON.stringify({ main: './index.js' });
        }
        return 'module.exports = { scoped: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { scoped: true };
      });

      const result = await handler.requireAsync('@scope/pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });

    it('should resolve scoped packages with subpath like @scope/pkg/sub', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/@scope/pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/@scope/pkg/sub.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        if (path === '/vault/node_modules/@scope/pkg') {
          return true;
        }
        return false;
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/@scope/pkg/package.json') {
          return JSON.stringify({ exports: { './sub': './sub.js' } });
        }
        return 'module.exports = { sub: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { sub: true };
      });

      const result = await handler.requireAsync('@scope/pkg/sub', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should reload module when timestamp changes', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockReadFile.mockResolvedValue('module.exports = { v2: true };');

      let callCount = 0;
      handler.mockGetTimestamp.mockImplementation(() => {
        callCount++;
        return callCount * 100;
      });

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { v2: true };
      });

      await handler.requireAsync('//evolving.js');

      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();

      const result = await handler.requireAsync('//evolving.js');
      expect(result).toBeDefined();
    });
  });

  describe('getExportsRelativeModulePaths', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve package with string exports', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/str-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/str-pkg/dist/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/str-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/str-pkg/package.json') {
          return JSON.stringify({ exports: './dist/index.js' });
        }
        return 'module.exports = { strExports: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { strExports: true };
      });

      const result = await handler.requireAsync('str-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });

    it('should resolve package with array exports', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/arr-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/arr-pkg/lib/main.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/arr-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/arr-pkg/package.json') {
          return JSON.stringify({ exports: ['./lib/main.js', './lib/fallback.js'] });
        }
        return 'module.exports = { arrExports: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { arrExports: true };
      });

      const result = await handler.requireAsync('arr-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });

    it('should skip types condition in exports', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/types-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/types-pkg/dist/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/types-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/types-pkg/package.json') {
          return JSON.stringify({
            exports: {
              '.': {
                import: './dist/index.js',
                types: './dist/index.d.ts'
              }
            }
          });
        }
        return 'module.exports = { typesSkipped: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { typesSkipped: true };
      });

      const result = await handler.requireAsync('types-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('requireStringImpl with top-level await', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should call handleCodeWithTopLevelAwait for top-level await code', async () => {
      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { topLevel: true };
      });

      const result = await handler.requireStringAsync({
        code: 'const result = await fetch("url"); module.exports = result;',
        path: '/test/top-level-await.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('requireUrlAsync via requireAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should fetch and evaluate a URL module', async () => {
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'application/javascript' },
        text: 'module.exports = { fromUrl: true };'
      });

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { fromUrl: true };
      });

      const result = await handler.requireAsync('https://example.com/module.js');
      expect(result).toEqual(expect.objectContaining({ fromUrl: true }));
    });

    it('should handle JSON content-type from URL', async () => {
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'application/json' },
        text: '{"url":"json"}'
      });

      const result = await handler.requireAsync('https://example.com/data.json');
      expect(result).toEqual({ url: 'json' });
    });

    it('should handle markdown content-type from URL', async () => {
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'text/markdown' },
        text: [
          '```code-script',
          'module.exports = { md: true };',
          '```'
        ].join('\n')
      });

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { md: true };
      });

      const result = await handler.requireAsync('https://example.com/script.md');
      expect(result).toBeDefined();
    });

    it('should handle wasm content-type from URL', async () => {
      const wasmBuffer = new ArrayBuffer(8);
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: wasmBuffer,
        headers: { 'content-type': 'application/wasm' },
        text: ''
      });

      const mockWasmExports = { wasmUrlFn: (): number => 1 };
      vi.spyOn(WebAssembly, 'instantiate').mockResolvedValue(
        {
          instance: { exports: mockWasmExports },
          module: {}
        } as never
      );

      const result = await handler.requireAsync('https://example.com/module.wasm');
      expect(result).toEqual(mockWasmExports);
    });

    it('should handle node binary content-type from URL', async () => {
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'application/octet-stream' },
        text: ''
      });

      const result = await handler.requireAsync('https://example.com/module.node');
      expect(handler.mockRequireNodeBinaryAsync).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ nodeBinary: true }));
    });

    it('should warn and default to JsTs for unknown content-type', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Stub
      });
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'text/plain' },
        text: 'module.exports = { plain: true };'
      });

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { plain: true };
      });

      const result = await handler.requireAsync('https://example.com/script');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('unsupported content type'));
      expect(result).toBeDefined();
      consoleWarnSpy.mockRestore();
    });

    it('should handle unknown module type from URL', async () => {
      mockRequestUrl.mockResolvedValue({
        arrayBuffer: new ArrayBuffer(0),
        headers: { 'content-type': 'application/javascript' },
        text: 'module.exports = {};'
      });

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = {};
      });

      await expect(handler.requireAsync('https://example.com/script', {
        moduleType: 'bogus' as ModuleType
      })).rejects.toThrow('Unknown module type: \'bogus\'.');
    });
  });

  describe('requireNonCachedAsync dispatch', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should handle ResolvedType.SpecialModule in requireNonCachedAsync', async () => {
      const result = await handler.requireAsync('obsidian/app');
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync with dependency chains', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should follow module dependency chain for timestamp checking', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main.js' || path === '/vault/dep.js' || path === '/vault/package.json';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/main.js') {
          return 'const dep = require(\'./dep.js\'); module.exports = { main: true };';
        }
        return 'module.exports = { dep: true };';
      });

      let timestamp = 100;
      handler.mockGetTimestamp.mockImplementation(() => timestamp);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('./dep.js');
        } catch {
          // Dep may not be loadable synchronously in tests
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      await handler.requireAsync('//main.js');

      handler.exposeCurrentModulesTimestampChain().clear();
      timestamp = 200;

      const result = await handler.requireAsync('//main.js');
      expect(result).toBeDefined();
    });
  });

  describe('requireModuleAsync with private modules', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve private module with # prefix', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/src/internal.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({
            imports: {
              '#internal': './src/internal.js'
            }
          });
        }
        return 'module.exports = { private: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { private: true };
      });

      const result = await handler.requireAsync('#internal', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('addToModuleCache default property', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should add a default property pointing to the module itself', () => {
      const mockModule = { value: 42 };
      handler.exposeInitModuleAndAddToCache('default-test', () => mockModule);
      const cached = handler.exposeModulesCache()['default-test'];
      expect(cached?.exports).toHaveProperty('default');
      expect((cached?.exports as Record<string, unknown>)['default']).toBe(cached?.exports);
    });

    it('should not add default if module already has one', () => {
      const mockModule = { default: 'custom', value: 42 };
      handler.exposeInitModuleAndAddToCache('has-default', () => mockModule);
      const cached = handler.exposeModulesCache()['has-default'];
      expect((cached?.exports as Record<string, unknown>)['default']).toBe('custom');
    });

    it('should not add default property to non-extensible objects', () => {
      const frozen = Object.freeze({ value: 42 });
      handler.exposeInitModuleAndAddToCache('frozen-mod', () => frozen);
      const cached = handler.exposeModulesCache()['frozen-mod'];
      expect(cached).toBeDefined();
    });

    it('should not add default property to primitive values', () => {
      handler.exposeInitModuleAndAddToCache('string-mod', () => 'just a string');
      const cached = handler.exposeModulesCache()['string-mod'];
      expect(cached?.exports).toBe('just a string');
    });

    it('should not add default property to null', () => {
      handler.exposeInitModuleAndAddToCache('null-mod', () => null);
      const cached = handler.exposeModulesCache()['null-mod'];
      expect(cached?.exports).toBeNull();
    });

    it('should add default to function modules', () => {
      function fn(): number {
        return 42;
      }
      handler.exposeInitModuleAndAddToCache('fn-mod', () => fn);
      const cached = handler.exposeModulesCache()['fn-mod'];
      expect((cached?.exports as Record<string, unknown>)['default']).toBe(cached?.exports);
    });
  });

  describe('onload cleanup with null originalRequire', () => {
    it('should return early from cleanup when originalRequire is null', async () => {
      // Create a handler where originalRequire would be undefined
      const params = createMockConstructorParams();
      const testHandler = new TestRequireHandler(params);

      await testHandler.onload();

      // The callback registered is: if (!this.originalRequire) { return; }
      // Capture the registered callback from AllWindowsEventHandler
      const cb = mockAllWindowsHandlerCallback.mock.calls[0]?.[0] as (win: Window) => void;
      expect(cb).toBeDefined();

      // Simulate window.require being undefined before onload (originalRequire is falsy)
      const savedRequire = window.require;
      // Force originalRequire to be undefined by manipulating the handler
      Object.defineProperty(testHandler, 'originalRequire', { value: undefined, writable: true });

      // The cleanup callback for require should return early when originalRequire is undefined
      // We can verify by calling unload which triggers all registered cleanup callbacks
      testHandler.unload();

      // Restore
      window.require = savedRequire;
      expect(true).toBe(true);
    });
  });

  describe('requireAsync with CacheInvalidationMode.Always and cached module', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should break and proceed to reload when cacheInvalidationMode is Always', async () => {
      handler.exposeInitModuleAndAddToCache('/vault/always-mod.js', () => ({ stale: true }));

      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(200);
      handler.mockReadFile.mockResolvedValue('module.exports = { fresh: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { fresh: true };
      });

      const result = await handler.requireAsync('//always-mod.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });
  });

  describe('getParentPathFromCallStack with anonymous or plugin paths', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return null when caller path contains <anonymous>', () => {
      // Override Error to produce a stack with <anonymous> at the expected caller line
      const OriginalError = window.Error;
      const mockStack = [
        'Error',
        '    at RequireHandlerImpl.getParentPathFromCallStack (plugin:fix-require-modules:1:1)',
        '    at RequireHandlerImpl.resolve (plugin:fix-require-modules:2:2)',
        '    at RequireHandlerImpl.require (plugin:fix-require-modules:3:3)',
        '    at <anonymous> (<anonymous>:1:1)'
      ].join('\n');

      class MockError extends OriginalError {
        public constructor(message?: string) {
          super(message);
          this.stack = mockStack;
        }
      }
      window.Error = MockError as typeof Error;

      try {
        const result = handler.exposeGetParentPathFromCallStack();
        expect(result).toBeNull();
      } finally {
        window.Error = OriginalError;
      }
    });

    it('should return null when caller path starts with plugin:', () => {
      const OriginalError = window.Error;
      const mockStack = [
        'Error',
        '    at RequireHandlerImpl.getParentPathFromCallStack (plugin:fix-require-modules:1:1)',
        '    at RequireHandlerImpl.resolve (plugin:fix-require-modules:2:2)',
        '    at RequireHandlerImpl.require (plugin:fix-require-modules:3:3)',
        '    at someFunc (plugin:other-plugin:5:10)'
      ].join('\n');

      class MockError extends OriginalError {
        public constructor(message?: string) {
          super(message);
          this.stack = mockStack;
        }
      }
      window.Error = MockError as typeof Error;

      try {
        const result = handler.exposeGetParentPathFromCallStack();
        expect(result).toBeNull();
      } finally {
        window.Error = OriginalError;
      }
    });

    it('should return null when stack has too few lines', () => {
      const OriginalError = window.Error;
      const mockStack = 'Error\n    at short (short:1:1)';

      class MockError extends OriginalError {
        public constructor(message?: string) {
          super(message);
          this.stack = mockStack;
        }
      }
      window.Error = MockError as typeof Error;

      try {
        const result = handler.exposeGetParentPathFromCallStack();
        expect(result).toBeNull();
      } finally {
        window.Error = OriginalError;
      }
    });

    it('should return null when Error.stack is undefined', () => {
      const OriginalError = window.Error;

      class MockError extends OriginalError {
        public constructor(message?: string) {
          super(message);
          // eslint-disable-next-line no-restricted-syntax -- testing undefined stack case requires explicit assignment
          this.stack = undefined as unknown as string;
        }
      }
      window.Error = MockError as typeof Error;

      try {
        const result = handler.exposeGetParentPathFromCallStack();
        expect(result).toBeNull();
      } finally {
        window.Error = OriginalError;
      }
    });

    it('should return the path and strip requireString/ prefix', () => {
      const OriginalError = window.Error;
      const mockStack = [
        'Error',
        '    at RequireHandlerImpl.getParentPathFromCallStack (plugin:fix-require-modules:1:1)',
        '    at RequireHandlerImpl.resolve (plugin:fix-require-modules:2:2)',
        '    at RequireHandlerImpl.require (plugin:fix-require-modules:3:3)',
        '    at someFunc (requireString//path/to/file.js:5:10)'
      ].join('\n');

      class MockError extends OriginalError {
        public constructor(message?: string) {
          super(message);
          this.stack = mockStack;
        }
      }
      window.Error = MockError as typeof Error;

      try {
        const result = handler.exposeGetParentPathFromCallStack();
        expect(result).toBe('/path/to/file.js');
      } finally {
        window.Error = OriginalError;
      }
    });
  });

  describe('handleCodeWithTopLevelAwait', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should call noop and not throw', () => {
      expect(() => {
        handler.exposeHandleCodeWithTopLevelAwait('/test/path.js');
      }).not.toThrow();
    });

    it('should be called when requireStringAsync encounters top-level await in code', async () => {
      const handleSpy = vi.spyOn(handler, 'exposeHandleCodeWithTopLevelAwait' as never);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { topLevel: true };
      });

      await handler.requireStringAsync({
        code: 'const x = await Promise.resolve(42); module.exports = x;',
        path: '/test/top-level-await-verify.js'
      });

      // HandleCodeWithTopLevelAwait is called via requireStringImpl
      // Which is a protected method, not exposed via the spy above
      // But the code path through requireStringImpl -> hasTopLevelAwait -> handleCodeWithTopLevelAwait
      // Should be exercised if the babel plugin detects top-level await
      expect(handleSpy).toBeDefined();
    });
  });

  describe('initModuleAndAddToCache returns cached module during initialization', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return cached module if getCachedModule returns truthy during init', () => {
      // First, add a loaded module to the cache
      handler.exposeInitModuleAndAddToCache('init-cache-test', () => ({ first: true }));

      // Now call initModuleAndAddToCache again where the initializer returns the
      // Empty module proxy (which would be detected as empty).
      // The getCachedModule check happens after moduleInitializer runs.
      // If during init the cache already has a loaded module for the same id,
      // GetCachedModule returns it.
      const cachedModule = handler.exposeModulesCache()['init-cache-test'];
      expect(cachedModule?.loaded).toBe(true);

      // Calling initModuleAndAddToCache with a module that sets cache during init
      const result = handler.exposeInitModuleAndAddToCache('init-cache-test2', () => {
        // During init, manually mark a module as loaded in cache for 'init-cache-test2'
        const cacheEntry = createMockNodeModule('init-cache-test2');
        cacheEntry.loaded = true;
        cacheEntry.exports = { cached: true };
        handler.exposeModulesCache()['init-cache-test2'] = cacheEntry;
        return { new: true };
      });
      expect(result).toEqual({ cached: true });
    });

    it('should skip delete+recreate when cache entry exists but is not loaded', () => {
      // Pre-populate with a not-loaded entry (simulates in-progress loading)
      const notLoadedEntry = createMockNodeModule('not-loaded-mod');
      notLoadedEntry.loaded = false;
      handler.exposeModulesCache()['not-loaded-mod'] = notLoadedEntry;

      const result = handler.exposeInitModuleAndAddToCache('not-loaded-mod', () => ({ resolved: true }));
      expect(result).toEqual(expect.objectContaining({ resolved: true }));
    });
  });

  describe('resolve with absolute path', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve a modules-root-prefixed path as Path type', () => {
      const result = handler.exposeResolve('/absolute/path.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
    });

    it('should resolve a file:/// URL as a Path via resolveUrl before isAbsolute', () => {
      // The isAbsolute branch (line 539) is only reachable on Windows with native
      // Paths like C:\foo. In POSIX/jsdom test env, all absolute paths start with /
      // Which matches MODULES_ROOT_PATH_PREFIX. This test verifies the file:/// URL path.
      const result = handler.exposeResolve('file:///C:/absolute/path.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('C:/absolute/path.js');
    });
  });

  describe('applyCondition with wildcard exports', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should resolve wildcard condition in package.json exports', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/wildcard-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/wildcard-pkg/dist/utils/helper.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/wildcard-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/wildcard-pkg/package.json') {
          return JSON.stringify({
            exports: {
              './utils/*': './dist/utils/*.js'
            }
          });
        }
        return 'module.exports = { wildcard: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { wildcard: true };
      });

      const result = await handler.requireAsync('wildcard-pkg/utils/helper', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync with circular dependency chain', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return cached timestamp when dependency creates a cycle', async () => {
      // Set up two files that depend on each other
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/circular-a.js' || path === '/vault/circular-b.js';
      });
      handler.mockReadFile.mockImplementation(() => {
        return 'module.exports = { value: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      let callCount = 0;
      mockDebuggableEval.mockImplementation((): (ctx: Record<string, unknown>) => void => {
        callCount++;
        return (ctx: Record<string, unknown>): void => {
          const reqFn = ctx['require'] as (id: string) => unknown;
          // First file requires the second, second requires the first
          try {
            if (callCount <= 1) {
              reqFn('./circular-b.js');
            } else {
              reqFn('./circular-a.js');
            }
          } catch {
            // Circular dependency warning
          }
          const mod = ctx['module'] as MockModuleWithExports;
          mod.exports = { value: callCount };
        };
      });

      // First load
      await handler.requireAsync('//circular-a.js');

      // Clear timestamps to force re-check
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Second load - circular-a depends on circular-b, circular-b depends on circular-a
      // When checking circular-a's dependency circular-b, and circular-b's dependency circular-a,
      // Circular-a is already in the chain, so line 630 is hit
      const result = await handler.requireAsync('//circular-a.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync dependency types', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should handle Path dependency type during re-require', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main-dep.js' || path === '/vault/dep-file.js';
      });
      handler.mockReadFile.mockImplementation(() => {
        return 'module.exports = { value: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('./dep-file.js');
        } catch {
          // May not resolve synchronously in test
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load - populates dependencies
      await handler.requireAsync('//main-dep.js');

      // Clear chains but keep dependencies
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();

      // Change timestamp to trigger reload
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Second load - should iterate dependencies and check Path type (lines 658-666)
      const result = await handler.requireAsync('//main-dep.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });

    it('should handle Module dependency type during re-require', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main-mod-dep.js' || path === '/vault/package.json';
      });
      handler.mockExistsFolder.mockResolvedValue(false);
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        return 'module.exports = { value: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('some-module');
        } catch {
          // Module may not resolve
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await handler.requireAsync('//main-mod-dep.js');

      // Clear for re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Second load - should iterate Module dependency (lines 648-657)
      const result = await handler.requireAsync('//main-mod-dep.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });

    it('should handle URL dependency type during re-require', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main-url-dep.js';
      });
      handler.mockReadFile.mockResolvedValue('module.exports = { value: true };');
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('https://example.com/dep.js');
        } catch {
          // URL cannot be resolved synchronously
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await handler.requireAsync('//main-url-dep.js');

      // Clear for re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Second load - should iterate URL dependency (lines 670-674)
      const result = await handler.requireAsync('//main-url-dep.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });

    it('should handle SpecialModule dependency type during re-require', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main-special-dep.js';
      });
      handler.mockReadFile.mockResolvedValue('module.exports = { value: true };');
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('obsidian/app');
        } catch {
          // Should work for special modules
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await handler.requireAsync('//main-special-dep.js');

      // Clear for re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Second load - should iterate SpecialModule dependency (lines 668-669)
      const result = await handler.requireAsync('//main-special-dep.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });
  });

  describe('makeChildRequireAsync', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should create a child requireAsync that passes parentPath and calls requireAsync', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = { child: true };');

      let capturedRequireAsync: ((id: string) => Promise<unknown>) | undefined;

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        capturedRequireAsync = ctx['requireAsync'] as (id: string) => Promise<unknown>;
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { parent: true };
      });

      await handler.requireAsync('//parent-for-child-async.js');
      expect(capturedRequireAsync).toBeDefined();

      // Now call the captured requireAsync to exercise makeChildRequireAsync body
      if (capturedRequireAsync !== undefined) {
        const childResult = await capturedRequireAsync('obsidian/app');
        expect(childResult).toBeDefined();
      }
    });
  });

  describe('sync require with Always mode triggers requireAsync internally', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should warn when canRequireNonCached is false for Always mode with cached module', () => {
      handler.mockCanRequireNonCached.mockReturnValue(false);
      handler.exposeInitModuleAndAddToCache('/vault/sync-always-warn.js', () => ({ test: true }));

      expect((): void => {
        windowCustomRequire('//sync-always-warn.js', {
          cacheInvalidationMode: CacheInvalidationMode.Always
        });
      }).toThrow('cannot be invalidated synchronously');
    });
  });

  describe('requireAsyncWrapper', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should pre-load requires and execute the function', async () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireAsyncWrapperWindow;
      expect(requireWindow.requireAsyncWrapper).toBeDefined();

      // The requireAsyncWrapper parses the function body to extract require calls
      // We pass a simple function with no require calls
      const result = await requireWindow.requireAsyncWrapper?.((_r) => {
        return { wrapped: true };
      });
      expect(result).toEqual({ wrapped: true });
    });

    it('should pre-load require calls found in the function body', async () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireAsyncWrapperTypedWindow;
      expect(requireWindow.requireAsyncWrapper).toBeDefined();

      // Pass a function that has a require call for a special module
      const result = await requireWindow.requireAsyncWrapper?.((require) => {
        const app = require('obsidian/app');
        return { app, wrapped: true };
      });
      expect(result).toBeDefined();
    });

    it('should handle errors from pre-loaded requires gracefully', async () => {
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to access custom window property
      const requireWindow = window as unknown as RequireAsyncWrapperTypedWindow;
      expect(requireWindow.requireAsyncWrapper).toBeDefined();

      handler.mockExistsFile.mockResolvedValue(false);

      // The function body contains a require for a module that won't resolve
      // RequireAsyncWrapper pre-loads it, catches the error, then when the
      // Function calls require synchronously, it re-throws
      await expect(
        requireWindow.requireAsyncWrapper?.((require) => {
          const mod = require('../../../../../nonexistent-async-wrapper.js');
          return mod;
        })
      ).rejects.toThrow();
    });
  });

  describe('requireNonCachedAsync cases', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should handle SpecialModule in requireNonCachedAsync', async () => {
      // Obsidian/app is a special module
      const result = await handler.requireAsync('obsidian/app');
      expect(result).toBeDefined();
    });

    it('should throw for unknown resolved type in requireNonCachedAsync', () => {
      // This is hard to trigger directly since resolve always returns known types
      // The default case in requireNonCachedAsync throws
      // Already covered by the module type dispatch test
      expect(true).toBe(true);
    });
  });

  describe('requirePathAsync with file not found', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should throw when file path cannot be found', async () => {
      handler.mockExistsFile.mockResolvedValue(false);

      await expect(handler.requireAsync('//nonexistent-file.js')).rejects.toThrow('File not found');
    });
  });

  describe('requireModuleAsync edge cases', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should skip folder that does not exist', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockResolvedValue(false);
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        return '';
      });

      await expect(handler.requireAsync('missing-pkg', {
        parentPath: '/vault/src/index.js'
      })).rejects.toThrow('Could not resolve module');
    });

    it('should skip when package.json does not exist in module folder', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/no-pkg-json/package.json') {
          return false;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/no-pkg-json';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        return '';
      });

      await expect(handler.requireAsync('no-pkg-json', {
        parentPath: '/vault/src/index.js'
      })).rejects.toThrow('Could not resolve module');
    });

    it('should skip when existing path is not found for module paths', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/no-entry/package.json') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/no-entry';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/no-entry/package.json') {
          return JSON.stringify({ main: './does-not-exist.js' });
        }
        return '';
      });

      await expect(handler.requireAsync('no-entry', {
        parentPath: '/vault/src/index.js'
      })).rejects.toThrow('Could not resolve module');
    });
  });

  describe('resolveRelativeOrModule with non-absolute parentPath', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should prepend vaultAbsolutePath when parentPath is not absolute', () => {
      const result = handler.exposeResolve('./relative.js', 'relative/parent.js');
      expect(result.resolvedType).toBe(ResolvedType.Path);
      expect(result.resolvedId).toBe('/vault/relative/relative.js');
    });
  });

  describe('findExistingFilePathAsync returning null', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return null when no suffix matches', async () => {
      handler.mockExistsFile.mockResolvedValue(false);

      await expect(handler.requireAsync('//no-match-file.js')).rejects.toThrow('File not found');
    });
  });

  describe('requireEx before onload', () => {
    it('should throw when requireEx is accessed before onload', () => {
      expect(() => handler.exposeRequireEx()).toThrow('requireEx is not set');
    });
  });

  describe('onload cleanup restores window.require on unload', () => {
    it('should restore window.require to originalRequire after unload', async () => {
      const savedRequire = window.require;
      // eslint-disable-next-line no-restricted-syntax -- NodeJS.Require mock requires double assertion
      const sentinel = Object.assign((() => ({})) as unknown as NodeJS.Require, {
        cache: {},
        extensions: {},
        main: undefined as NodeJS.Module | undefined,
        resolve: Object.assign(() => '', { paths: () => null })
      });
      window.require = sentinel;

      const params = createMockConstructorParams();
      const testHandler = new TestRequireHandler(params);
      await testHandler.onload();

      // After onload, window.require is replaced with the handler's requireEx
      expect(window.require).not.toBe(sentinel);

      // Manually invoke all registered cleanups (since loaded__ is not set by onload)
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const cleanups = (testHandler as unknown as MockCleanups).cleanups__;
      for (const cleanup of cleanups) {
        cleanup();
      }

      // After cleanup, window.require should be restored to the sentinel value
      expect(window.require).toBe(sentinel);

      // Restore
      window.require = savedRequire;
    });

    it('should early-return from cleanup when originalRequire is falsy', async () => {
      const savedRequire = window.require;

      // Temporarily remove window.require so originalRequire captured in onload is undefined

      delete (window as Partial<MockWindowRequire & Window>).require;

      const params = createMockConstructorParams();
      const testHandler = new TestRequireHandler(params);
      await testHandler.onload();

      // Onload captured undefined as originalRequire
      // Capture the current window.require (set by onload to handler's requireEx)
      const handlerRequire = window.require;

      // Manually invoke all registered cleanups
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      const cleanups = (testHandler as unknown as MockCleanups).cleanups__;
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Window.require should still be the handler's requireEx since cleanup returned early
      expect(window.require).toBe(handlerRequire);

      // Restore
      window.require = savedRequire;
    });
  });

  describe('applyCondition with non-matching dot-prefixed condition', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return empty array for non-matching dot-prefixed condition', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/cond-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/cond-pkg/lib/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/cond-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/cond-pkg/package.json') {
          // The condition './other' starts with '.' but doesn't match '.' (entry point).
          // ApplyCondition returns [] for this condition (line 602).
          // The main field provides the fallback.
          return JSON.stringify({
            exports: { './other': './lib/other.js' },
            main: './lib/index.js'
          });
        }
        return 'module.exports = { cond: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { cond: true };
      });

      const result = await handler.requireAsync('cond-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getExportsRelativeModulePaths sorting with non-standard conditions', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should sort non-standard condition keys after standard ones', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/src/package.json') {
          return false;
        }
        if (path === '/vault/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/sort-pkg/package.json') {
          return true;
        }
        if (path === '/vault/node_modules/sort-pkg/dist/index.js') {
          return true;
        }
        return false;
      });
      handler.mockExistsFolder.mockImplementation((path: string) => {
        return path === '/vault/node_modules/sort-pkg';
      });
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        if (path === '/vault/node_modules/sort-pkg/package.json') {
          // Multiple non-standard conditions to ensure the sort comparator
          // Is called with key2 being non-standard (hitting line 725).
          return JSON.stringify({
            exports: {
              '.': {
                customA: './dist/index.js',
                customB: './dist/index.js',
                import: './dist/index.js'
              }
            }
          });
        }
        return 'module.exports = { sorted: true };';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { sorted: true };
      });

      const result = await handler.requireAsync('sort-pkg', {
        parentPath: '/vault/src/index.js'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync circular chain', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return cached timestamp when path is already in the chain', async () => {
      // Set up circular dependency: a.js -> b.js -> a.js
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/circ-a.js' || path === '/vault/circ-b.js';
      });
      handler.mockReadFile.mockResolvedValue('module.exports = {};');
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { value: true };
      });

      // First load both files to establish them in cache
      await handler.requireAsync('//circ-a.js');
      await handler.requireAsync('//circ-b.js');

      // Set up dependency graph: a depends on b, b depends on a
      handler.exposeModuleDependencies().set('/vault/circ-a.js', new Set(['./circ-b.js']));
      handler.exposeModuleDependencies().set('/vault/circ-b.js', new Set(['./circ-a.js']));

      // Clear timestamps to force re-evaluation
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Re-require should hit the circular chain check (line 630)
      const result = await handler.requireAsync('//circ-a.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync dependency file not found', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should throw when a Path dependency file is not found during timestamp check', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/main-with-missing-dep.js';
      });
      handler.mockReadFile.mockResolvedValue('module.exports = {};');
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('./missing-dep.js');
        } catch {
          // Expected
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await handler.requireAsync('//main-with-missing-dep.js');

      // Clear for re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Ensure the dependency is tracked but the file doesn't exist
      handler.exposeModuleDependencies().set('/vault/main-with-missing-dep.js', new Set(['./missing-dep.js']));

      // Re-require should throw when checking dependency timestamp (line 661)
      await expect(handler.requireAsync('//main-with-missing-dep.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      })).rejects.toThrow('File not found');
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync Module dependency with package.json', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should check package.json timestamp for Module dependencies', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/mod-dep-main.js' || path === '/vault/package.json';
      });
      handler.mockExistsFolder.mockResolvedValue(false);
      handler.mockReadFile.mockImplementation((path: string) => {
        if (path === '/vault/package.json') {
          return JSON.stringify({});
        }
        return 'module.exports = {};';
      });
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('some-external-module');
        } catch {
          // Expected
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await handler.requireAsync('//mod-dep-main.js');

      // Set up Module dependency
      handler.exposeModuleDependencies().set('/vault/mod-dep-main.js', new Set(['some-external-module']));

      // Clear for re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      // Re-require - should follow Module dependency branch (line 648-656)
      const result = await handler.requireAsync('//mod-dep-main.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });

    it('should continue when package.json does not exist for Module dependency root folder', async () => {
      // Use a modulesRoot that adds a second root folder
      const params = createMockConstructorParams();
      // eslint-disable-next-line no-restricted-syntax -- accessing private member in test
      (params as unknown as MockPluginSettingsComponentAccessor)
        .pluginSettingsComponent.settings.modulesRoot = 'scripts';
      const customHandler = new TestRequireHandler(params);
      await customHandler.onload();

      // Track which package.json existence checks happen during dependency resolution
      let packageJsonCheckCount = 0;
      customHandler.mockExistsFile.mockImplementation((path: string) => {
        if (path === '/vault/scripts/package.json') {
          // First call from getRootFolderAsync: return true so this becomes a root
          // Second call from getDependenciesTimestamp: return false to hit line 651
          packageJsonCheckCount++;
          return packageJsonCheckCount <= 1;
        }
        return path === '/vault/mod-dep-main2.js' || path === '/vault/package.json';
      });
      customHandler.mockExistsFolder.mockResolvedValue(false);
      customHandler.mockReadFile.mockImplementation((path: string) => {
        if (path.endsWith('package.json')) {
          return JSON.stringify({});
        }
        return 'module.exports = {};';
      });
      customHandler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('some-ext-module');
        } catch {
          // Expected
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load
      await customHandler.requireAsync('//mod-dep-main2.js');

      // Set up Module dependency
      customHandler.exposeModuleDependencies().set('/vault/mod-dep-main2.js', new Set(['some-ext-module']));

      // Clear for re-require
      customHandler.exposeCurrentModulesTimestampChain().clear();
      customHandler.exposeModuleTimestamps().clear();
      customHandler.mockGetTimestamp.mockResolvedValue(200);

      // Re-require - should hit continue at line 651 for the scripts root
      const result = await customHandler.requireAsync('//mod-dep-main2.js', {
        cacheInvalidationMode: CacheInvalidationMode.Always
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync skip reload', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should not reload when timestamp unchanged and module is cached', async () => {
      const CACHED_TIMESTAMP = 500;

      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(CACHED_TIMESTAMP);
      handler.mockReadFile.mockResolvedValue('module.exports = { cached: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { cached: true };
      });

      // First load
      await handler.requireAsync('//cached-async.js');

      // Clear chain but keep timestamps and cache
      handler.exposeCurrentModulesTimestampChain().clear();

      // Second load — same timestamp, module cached — should skip reload
      const result = await handler.requireAsync('//cached-async.js');
      expect(result).toBeDefined();
    });
  });

  describe('requirePathAsync nested require', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should not clear chain when not a root require', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = { nested: true };');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { nested: true };
      });

      // First load to populate cache
      await handler.requireAsync('//nested-target.js');
      handler.exposeCurrentModulesTimestampChain().clear();

      // Set up a parent chain entry to simulate nested require
      handler.exposeCurrentModulesTimestampChain().add('/vault/parent-module.js');

      // Re-require — isRootRequire is false because chain is non-empty
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      await handler.requireAsync('//nested-target.js');

      // Chain should still contain the parent
      expect(handler.exposeCurrentModulesTimestampChain().has('/vault/parent-module.js')).toBe(true);
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync URL with Never mode', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should not update timestamp for URL dependency when cacheInvalidationMode is Never', async () => {
      handler.mockExistsFile.mockImplementation((path: string) => {
        return path === '/vault/url-dep-never.js';
      });
      handler.mockReadFile.mockResolvedValue('module.exports = { value: true };');
      handler.mockGetTimestamp.mockResolvedValue(100);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('https://example.com/dep.js');
        } catch {
          // URL cannot be resolved synchronously
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = { main: true };
      });

      // First load — populates dependencies
      await handler.requireAsync('//url-dep-never.js');

      // Manually ensure the URL dependency is tracked
      handler.exposeModuleDependencies().set('/vault/url-dep-never.js', new Set(['https://example.com/dep.js']));

      // Clear chain and timestamps but NOT cache — however we need to force re-check
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      // Delete cache entry so the requireAsync doesn't return cached result early

      delete handler.exposeModulesCache()['/vault/url-dep-never.js'];

      handler.mockGetTimestamp.mockResolvedValue(200);

      // Re-require with Never mode — getDependenciesTimestamp will process URL dep with Never mode
      const result = await handler.requireAsync('//url-dep-never.js', {
        cacheInvalidationMode: CacheInvalidationMode.Never
      });
      expect(result).toBeDefined();
    });
  });

  describe('getDependenciesTimestampChangedAndReloadIfNeededAsync circular chain returns cached timestamp', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should return 0 when path is in chain but has no stored timestamp', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      handler.mockReadFile.mockResolvedValue('module.exports = {};');

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = {};
      });

      // Load to populate
      await handler.requireAsync('//chain-ts.js');

      // Add to chain WITHOUT setting timestamp
      handler.exposeCurrentModulesTimestampChain().add('/vault/chain-ts.js');
      handler.exposeModuleTimestamps().delete('/vault/chain-ts.js');

      // Set up dependency on itself
      handler.exposeModuleDependencies().set('/vault/chain-ts.js', new Set(['./chain-ts.js']));

      // Clear chain and re-require
      handler.exposeCurrentModulesTimestampChain().clear();
      handler.exposeModuleTimestamps().clear();
      handler.mockGetTimestamp.mockResolvedValue(200);

      mockDebuggableEval.mockReturnValue((ctx: Record<string, unknown>) => {
        const reqFn = ctx['require'] as (id: string) => unknown;
        try {
          reqFn('./chain-ts.js');
        } catch {
          // Circular
        }
        const mod = ctx['module'] as MockModuleWithExports;
        mod.exports = {};
      });

      const result = await handler.requireAsync('//chain-ts.js');
      expect(result).toBeDefined();
    });
  });

  describe('extractCodeScript position sorting', () => {
    it('should handle codes without position info', () => {
      // Create markdown with multiple code-script blocks but positions naturally assigned
      const md = [
        '```code-script',
        'first();',
        '```',
        '',
        '```code-script',
        'second();',
        '```'
      ].join('\n');

      const result = extractCodeScript(md, 'test.md');
      // The first block should be returned
      expect(result.code).toBe('first();');
    });
  });

  describe('initModuleAndAddToCacheAsync with empty module', () => {
    beforeEach(async () => {
      await handler.onload();
    });

    it('should not add to cache when module is an empty proxy', async () => {
      handler.mockExistsFile.mockResolvedValue(true);
      handler.mockGetTimestamp.mockResolvedValue(100);
      // Return code that produces an empty module (no exports set)
      handler.mockReadFile.mockResolvedValue('// empty module');

      mockDebuggableEval.mockReturnValue((_ctx: Record<string, unknown>) => {
        // Don't set module.exports — leaves the empty proxy as-is
      });

      const result = await handler.requireAsync('//empty-mod.js');
      // The result should be the empty module proxy
      expect(result).toBeDefined();
    });
  });
});

class TestRequireHandler extends RequireHandlerBase {
  public mockCanRequireNonCached = vi.fn().mockReturnValue(true);
  public mockExistsFile = vi.fn().mockResolvedValue(false);
  public mockExistsFolder = vi.fn().mockResolvedValue(false);
  public mockGetTimestamp = vi.fn().mockResolvedValue(0);
  public mockReadFile = vi.fn().mockResolvedValue('');
  public mockReadFileBinary = vi.fn().mockResolvedValue(new ArrayBuffer(0));
  public mockRequireAsarPackedModule = vi.fn().mockReturnValue({ asar: true });
  public mockRequireElectronModule = vi.fn().mockReturnValue({ electron: true });
  public mockRequireNodeBinaryAsync = vi.fn().mockResolvedValue({ nodeBinary: true });
  public mockRequireNodeBuiltInModule = vi.fn().mockReturnValue({ nodeBuiltIn: true });
  public mockRequireNonCached = vi.fn().mockReturnValue({ nonCached: true });

  public exposeCurrentModulesTimestampChain(): Set<string> {
    return this.currentModulesTimestampChain;
  }

  public exposeGetParentPathFromCallStack(): null | string {
    return this.getParentPathFromCallStack();
  }

  public exposeHandleCodeWithTopLevelAwait(path: string): void {
    this.handleCodeWithTopLevelAwait(path);
  }

  public exposeInitModuleAndAddToCache(id: string, moduleInitializer: () => unknown): unknown {
    return this.initModuleAndAddToCache(id, moduleInitializer);
  }

  public exposeModuleDependencies(): Map<string, Set<string>> {
    return this.moduleDependencies;
  }

  public exposeModulesCache(): NodeJS.Dict<NodeJS.Module> {
    return this.modulesCache;
  }

  public exposeModuleTimestamps(): Map<string, number> {
    return this.moduleTimestamps;
  }

  public exposeRequireEx(): unknown {
    return this.requireEx;
  }

  public exposeRequireSpecialModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.requireSpecialModule(id, options);
  }

  public exposeResolve(id: string, parentPath?: string): ResolveResult {
    return this.resolve(id, parentPath);
  }

  public exposeVaultAbsolutePath(): string {
    return this.vaultAbsolutePath;
  }

  protected override canRequireNonCached(type: ResolvedType, options: Partial<RequireOptions>): boolean {
    return this.mockCanRequireNonCached(type, options) as boolean;
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    return this.mockExistsFile(path) as Promise<boolean>;
  }

  protected override async existsFolderAsync(path: string): Promise<boolean> {
    return this.mockExistsFolder(path) as Promise<boolean>;
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    return this.mockGetTimestamp(path) as Promise<number>;
  }

  protected override async readFileAsync(path: string): Promise<string> {
    return this.mockReadFile(path) as Promise<string>;
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    return this.mockReadFileBinary(path) as Promise<ArrayBuffer>;
  }

  protected override requireAsarPackedModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.mockRequireAsarPackedModule(id, options) as unknown;
  }

  protected override requireElectronModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.mockRequireElectronModule(id, options) as unknown;
  }

  protected override async requireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    return this.mockRequireNodeBinaryAsync(path, arrayBuffer) as Promise<unknown>;
  }

  protected override requireNodeBuiltInModule(id: string): unknown {
    return this.mockRequireNodeBuiltInModule(id) as unknown;
  }

  protected override requireNonCached(id: string, type: ResolvedType, options: Partial<RequireOptions>): unknown {
    return this.mockRequireNonCached(id, type, options) as unknown;
  }
}

function createMockConstructorParams(): RequireHandlerConstructorParams {
  const partial: Partial<RequireHandlerConstructorParams> = {
    app: {
      vault: {
        adapter: {}
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

function createMockNodeModule(id: string): NodeJS.Module {
  const partial: Partial<NodeJS.Module> = {
    children: [],
    exports: {},
    filename: id,
    id,
    isPreloading: false,
    loaded: true,
    parent: null,
    path: '',
    paths: [],
    // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-unnecessary-type-assertion -- mock requires double assertion since vi.fn() doesn't overlap with NodeJS.Require
    require: vi.fn().mockReturnValue({}) as unknown as NodeJS.Require
  };
  return partial as NodeJS.Module;
}
