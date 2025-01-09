import type { MaybePromise } from 'obsidian-dev-utils/Async';
import type { PackageJson } from 'obsidian-dev-utils/scripts/Npm';

import { debuggableEval } from 'debuggable-eval';
import { Platform } from 'obsidian';
import { normalizeOptionalProperties } from 'obsidian-dev-utils/Object';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  toPosixPath
} from 'obsidian-dev-utils/Path';
import {
  trimEnd,
  trimStart
} from 'obsidian-dev-utils/String';
import { isUrl } from 'obsidian-dev-utils/url';

import type { CodeScriptToolkitPlugin } from './CodeScriptToolkitPlugin.ts';

import { SequentialBabelPlugin } from './babel/CombineBabelPlugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/ConvertToCommonJsBabelPlugin.ts';
import { ExtractRequireArgsListBabelPlugin } from './babel/ExtractRequireArgsListBabelPlugin.ts';
import { FixSourceMapBabelPlugin } from './babel/FixSourceMapBabelPlugin.ts';
import { WrapInRequireFunctionBabelPlugin } from './babel/WrapInRequireFunctionBabelPlugin.ts';
import { builtInModuleNames } from './BuiltInModuleNames.ts';
import { CacheInvalidationMode } from './CacheInvalidationMode.ts';
import { convertPathToObsidianUrl } from './util/obsidian.ts';

export enum ResolvedType {
  Module = 'module',
  Path = 'path',
  Url = 'url'
}

export type PluginRequireFn = (id: string) => unknown;
export type RequireAsyncWrapperFn = (requireFn: RequireAsyncWrapperArg) => Promise<unknown>;

export interface RequireOptions {
  cacheInvalidationMode: CacheInvalidationMode;
  parentPath?: string;
}

interface EsModule {
  __esModule: boolean;
}

type ModuleFnAsync = (require: NodeRequire, module: { exports: unknown }, exports: unknown, requireAsyncWrapper: RequireAsyncWrapperFn) => Promise<void>;
type RequireAsyncFn = (id: string, options?: Partial<RequireOptions>) => Promise<unknown>;
type RequireAsyncWrapperArg = (require: RequireExFn) => MaybePromise<unknown>;
type RequireExFn = { parentPath?: string } & NodeRequire & RequireFn;

type RequireFn = (id: string, options: Partial<RequireOptions>) => unknown;

interface RequireWindow {
  require?: RequireExFn;
  requireAsync?: RequireAsyncFn;
  requireAsyncWrapper?: RequireAsyncWrapperFn;
}

interface ResolveResult {
  resolvedId: string;
  resolvedType: ResolvedType;
}

interface SplitQueryResult {
  cleanStr: string;
  query: string;
}

interface WrapRequireOptions {
  beforeRequire?: (id: string) => void;
  optionsToAppend?: Partial<RequireOptions>;
  optionsToPrepend?: Partial<RequireOptions>;
  require: RequireExFn;
}

export const ENTRY_POINT = '.';
export const MODULE_NAME_SEPARATOR = '*';
export const NODE_MODULES_DIR = 'node_modules';
const PACKAGE_JSON = 'package.json';
export const PATH_SUFFIXES = ['', '.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '/index.js', '/index.cjs', '/index.mjs', '/index.ts', '/index.cts', '/index.mts'];
export const PRIVATE_MODULE_PREFIX = '#';
export const RELATIVE_MODULE_PATH_SEPARATOR = '/';
export const SCOPED_MODULE_PREFIX = '@';
const WILDCARD_MODULE_PLACEHOLDER = '*';
const WILDCARD_MODULE_CONDITION_SUFFIX = '/*';
export const VAULT_ROOT_PREFIX = '//';

export abstract class RequireHandler {
  protected readonly moduleDependencies = new Map<string, Set<string>>();
  protected modulesCache!: NodeJS.Dict<NodeModule>;
  protected readonly moduleTimestamps = new Map<string, number>();
  protected originalRequire!: NodeRequire;
  protected plugin!: CodeScriptToolkitPlugin;
  protected requireEx!: RequireExFn;
  protected requireWithCacheWithoutInvalidation!: RequireExFn;
  protected vaultAbsolutePath!: string;
  private pluginRequire!: PluginRequireFn;
  private updatedModuleTimestamps = new Map<string, number>();

  public clearCache(): void {
    this.moduleTimestamps.clear();
    this.updatedModuleTimestamps.clear();
    this.moduleDependencies.clear();

    for (const key of Object.keys(this.modulesCache)) {
      if (key.startsWith('electron') || key.includes('app.asar')) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.modulesCache[key];
    }
  }

  public register(plugin: CodeScriptToolkitPlugin, pluginRequire: PluginRequireFn): void {
    this.plugin = plugin;
    this.pluginRequire = pluginRequire;
    this.vaultAbsolutePath = toPosixPath(plugin.app.vault.adapter.basePath);
    this.originalRequire = window.require;

    this.requireEx = Object.assign(this.require.bind(this), {
      cache: {}
    }, this.originalRequire);
    this.modulesCache = this.requireEx.cache;

    this.requireWithCacheWithoutInvalidation = Object.assign(this.requireWithoutInvalidation.bind(this), {
      cache: {}
    }, this.requireEx);

    const requireWindow = window as Partial<RequireWindow>;

    requireWindow.require = this.requireEx;
    plugin.register(() => requireWindow.require = this.originalRequire);

    requireWindow.requireAsync = this.requireAsync.bind(this);
    plugin.register(() => delete requireWindow.requireAsync);

    requireWindow.requireAsyncWrapper = this.requireAsyncWrapper.bind(this);
    plugin.register(() => delete requireWindow.requireAsyncWrapper);
  }

  public async requireAsync(id: string, options: Partial<RequireOptions> = {}): Promise<unknown> {
    const DEFAULT_OPTIONS: RequireOptions = {
      cacheInvalidationMode: CacheInvalidationMode.WhenPossible
    };
    const fullOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    const cleanId = splitQuery(id).cleanStr;
    const specialModule = this.requireSpecialModule(cleanId);
    if (specialModule) {
      return specialModule;
    }

    const { resolvedId, resolvedType } = this.resolve(id, fullOptions.parentPath);

    let cleanResolvedId: string;
    let query: string;

    if (resolvedType !== ResolvedType.Url) {
      ({ cleanStr: cleanResolvedId, query } = splitQuery(resolvedId));
    } else {
      cleanResolvedId = resolvedId;
      query = '';
    }

    const cachedModuleEntry = this.modulesCache[resolvedId];

    if (cachedModuleEntry) {
      if (!cachedModuleEntry.loaded) {
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}`);
        return cachedModuleEntry.exports;
      }

      switch (fullOptions.cacheInvalidationMode) {
        case CacheInvalidationMode.Never:
          return cachedModuleEntry.exports;
        case CacheInvalidationMode.WhenPossible:
          if (query) {
            return cachedModuleEntry.exports;
          }
      }
    }

    const module = await this.initModuleAndAddToCacheAsync(cleanResolvedId, () => this.requireNonCachedAsync(cleanResolvedId, resolvedType, fullOptions.cacheInvalidationMode));
    this.initModuleAndAddToCache(resolvedId, () => module);
    return module;
  }

  public async requireStringAsync(content: string, path: string, urlSuffix?: string): Promise<unknown> {
    if (splitQuery(path).cleanStr.endsWith('.json')) {
      return JSON.parse(content);
    }

    const filename = isUrl(path) ? path : basename(path);
    const dir = isUrl(path) ? '' : dirname(path);
    urlSuffix = urlSuffix ? `/${urlSuffix}` : '';
    const url = convertPathToObsidianUrl(path) + urlSuffix;
    const result = new SequentialBabelPlugin([
      new ConvertToCommonJsBabelPlugin(),
      new WrapInRequireFunctionBabelPlugin(true),
      new FixSourceMapBabelPlugin(url)
    ]).transform(content, filename, dir);

    if (result.error) {
      throw result.error;
    }

    try {
      const moduleFnAsyncWrapper = debuggableEval(result.transformedCode, `requireStringAsync/${path}${urlSuffix}`) as ModuleFnAsync;
      const module = { exports: {} };

      const childRequire = this.makeChildRequire(path);

      return await this.initModuleAndAddToCacheAsync(path, async () => {
        // eslint-disable-next-line import-x/no-commonjs
        await moduleFnAsyncWrapper(childRequire, module, module.exports, this.requireAsyncWrapper.bind(this));
        // eslint-disable-next-line import-x/no-commonjs
        return module.exports;
      });
    } catch (e) {
      throw new Error(`Failed to load module: ${path}`, { cause: e });
    }
  }

  protected abstract canRequireNonCached(type: ResolvedType): boolean;

  protected abstract existsDirectoryAsync(path: string): Promise<boolean>;

  protected abstract existsFileAsync(path: string): Promise<boolean>;

  protected getRelativeModulePath(packageJson: PackageJson, relativeModuleName: string): null | string {
    const isPrivateModule = relativeModuleName.startsWith(PRIVATE_MODULE_PREFIX);
    const importsExportsNode = isPrivateModule ? packageJson.imports : packageJson.exports;
    const path = this.getExportsRelativeModulePath(importsExportsNode, relativeModuleName);

    if (path) {
      return path;
    }

    if (relativeModuleName === ENTRY_POINT) {
      return packageJson.main ?? 'index.js';
    }

    if (!importsExportsNode && !isPrivateModule) {
      return relativeModuleName;
    }

    return null;
  }

  protected getRequireAsyncAdvice(isNewSentence?: boolean): string {
    let advice = `consider using

const module = await requireAsync(id);

or

await requireAsyncWrapper((require) => {
  const module = require(id);
});`;

    if (isNewSentence) {
      advice = advice.charAt(0).toUpperCase() + advice.slice(1);
    }

    return advice;
  }
  protected abstract getTimestampAsync(path: string): Promise<number>;

  protected initModuleAndAddToCache(id: string, moduleInitializer: () => unknown): unknown {
    const emptyModule = {};
    this.addToModuleCache(id, emptyModule, false);
    try {
      const loadedModule = moduleInitializer();
      const module = this.merge(emptyModule, loadedModule);
      this.addToModuleCache(id, module);
      return module;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.modulesCache[id];
      throw e;
    }
  }

  protected async initModuleAndAddToCacheAsync(id: string, moduleInitializer: () => Promise<unknown>): Promise<unknown> {
    const emptyModule = {};
    this.addToModuleCache(id, emptyModule, false);
    try {
      const loadedModule = await moduleInitializer();
      const module = this.merge(emptyModule, loadedModule);
      this.addToModuleCache(id, module);
      return module;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.modulesCache[id];
      throw e;
    }
  }

  protected makeChildRequire(parentPath: string): RequireExFn {
    return this.wrapRequire({
      beforeRequire: (id: string): void => {
        let dependencies = this.moduleDependencies.get(parentPath);
        if (!dependencies) {
          dependencies = new Set<string>();
          this.moduleDependencies.set(parentPath, dependencies);
        }
        dependencies.add(id);
      },
      optionsToPrepend: { parentPath },
      require: this.requireEx
    });
  }

  protected abstract readFileAsync(path: string): Promise<string>;

  protected async requireAsyncWrapper(requireFn: (require: RequireExFn) => MaybePromise<unknown>, require?: RequireExFn): Promise<unknown> {
    const result = new ExtractRequireArgsListBabelPlugin().transform(requireFn.toString(), 'extract-requires.js');
    const requireArgsList = result.data.requireArgsList;
    for (const requireArgs of requireArgsList) {
      const { id, options } = requireArgs;
      const newOptions = normalizeOptionalProperties<Partial<RequireOptions>>({ parentPath: require?.parentPath, ...options });
      await this.requireAsync(id, newOptions);
    }
    return await requireFn(this.wrapRequire({
      optionsToAppend: { cacheInvalidationMode: CacheInvalidationMode.Never },
      require: require ?? this.requireEx
    }));
  }

  protected abstract requireNonCached(id: string, type: ResolvedType, cacheInvalidationMode: CacheInvalidationMode): unknown;

  protected requireSpecialModule(id: string): unknown {
    if (id === 'obsidian/app') {
      return this.plugin.app;
    }

    if (id === 'obsidian/builtInModuleNames') {
      return builtInModuleNames;
    }

    if (builtInModuleNames.includes(id)) {
      return this.pluginRequire(id);
    }

    return null;
  }

  protected resolve(id: string, parentPath?: string): ResolveResult {
    id = toPosixPath(id);

    if (isUrl(id)) {
      const FILE_URL_PREFIX = 'file:///';
      if (id.toLowerCase().startsWith(FILE_URL_PREFIX)) {
        return { resolvedId: id.slice(FILE_URL_PREFIX.length), resolvedType: ResolvedType.Path };
      }

      if (id.toLowerCase().startsWith(Platform.resourcePathPrefix)) {
        return { resolvedId: id.slice(Platform.resourcePathPrefix.length), resolvedType: ResolvedType.Path };
      }

      return { resolvedId: id, resolvedType: ResolvedType.Url };
    }

    if (id.startsWith(VAULT_ROOT_PREFIX)) {
      return { resolvedId: join(this.vaultAbsolutePath, trimStart(id, VAULT_ROOT_PREFIX)), resolvedType: ResolvedType.Path };
    }

    const SYSTEM_ROOT_PATH_PREFIX = '~/';
    if (id.startsWith(SYSTEM_ROOT_PATH_PREFIX)) {
      return { resolvedId: '/' + trimStart(id, SYSTEM_ROOT_PATH_PREFIX), resolvedType: ResolvedType.Path };
    }

    const MODULES_ROOT_PATH_PREFIX = '/';
    if (id.startsWith(MODULES_ROOT_PATH_PREFIX)) {
      return { resolvedId: join(this.vaultAbsolutePath, this.plugin.settingsCopy.modulesRoot, trimStart(id, MODULES_ROOT_PATH_PREFIX)), resolvedType: ResolvedType.Path };
    }

    if (isAbsolute(id)) {
      return { resolvedId: id, resolvedType: ResolvedType.Path };
    }

    parentPath = parentPath ? toPosixPath(parentPath) : this.getParentPathFromCallStack() ?? this.plugin.app.workspace.getActiveFile()?.path ?? 'fakeRoot.js';
    if (!isAbsolute(parentPath)) {
      parentPath = join(this.vaultAbsolutePath, parentPath);
    }
    const parentDir = dirname(parentPath);

    if (id.startsWith('./') || id.startsWith('../')) {
      return { resolvedId: join(parentDir, id), resolvedType: ResolvedType.Path };
    }

    return { resolvedId: `${parentDir}${MODULE_NAME_SEPARATOR}${id}`, resolvedType: ResolvedType.Module };
  }

  private addToModuleCache(id: string, module: unknown, isLoaded = true): void {
    this.modulesCache[id] = {
      children: [],
      exports: module,
      filename: '',
      id,
      isPreloading: false,
      loaded: isLoaded,
      parent: null,
      path: '',
      paths: [],
      require: this.requireEx
    };
  }

  private async checkTimestampChangedAndReloadIfNeededAsync(path: string, cacheInvalidationMode: CacheInvalidationMode): Promise<boolean> {
    const timestamp = await this.getTimestampAsync(path);
    const cachedTimestamp = this.moduleTimestamps.get(path) ?? 0;
    if (timestamp !== cachedTimestamp) {
      const content = await this.readFileAsync(path);
      this.moduleTimestamps.set(path, timestamp);
      await this.initModuleAndAddToCacheAsync(path, async () => {
        return await this.requireStringAsync(content, path);
      });
      return true;
    }

    let ans = false;

    const dependencies = this.moduleDependencies.get(path) ?? [];
    for (const dependency of dependencies) {
      const { resolvedId, resolvedType } = this.resolve(dependency, path);
      switch (resolvedType) {
        case ResolvedType.Module:
          for (const rootDir of await this.getRootDirsAsync(path)) {
            const packageJsonPath = this.getPackageJsonPath(rootDir);
            if (!await this.existsFileAsync(packageJsonPath)) {
              continue;
            }

            if (await this.checkTimestampChangedAndReloadIfNeededAsync(packageJsonPath, cacheInvalidationMode)) {
              ans = true;
            }
          }
          break;
        case ResolvedType.Path: {
          const existingFilePath = await this.findExistingFilePathAsync(resolvedId);
          if (existingFilePath == null) {
            throw new Error(`File not found: ${resolvedId}`);
          }

          if (await this.checkTimestampChangedAndReloadIfNeededAsync(existingFilePath, cacheInvalidationMode)) {
            ans = true;
          }
          break;
        }
        case ResolvedType.Url: {
          if (cacheInvalidationMode === CacheInvalidationMode.Never) {
            continue;
          }

          ans = true;
          break;
        }
      }
    }

    return ans;
  }

  private async findExistingFilePathAsync(path: string): Promise<null | string> {
    for (const suffix of PATH_SUFFIXES) {
      const newPath = path + suffix;
      if (await this.existsFileAsync(newPath)) {
        return newPath;
      }
    }

    return null;
  }

  private getExportsRelativeModulePath(importsExportsNode: PackageJson['exports'], relativeModuleName: string, isTopLevel = true): null | string {
    if (!importsExportsNode) {
      return null;
    }

    if (typeof importsExportsNode === 'string') {
      return importsExportsNode + trimStart(relativeModuleName, ENTRY_POINT);
    }

    let conditions;

    if (Array.isArray(importsExportsNode)) {
      if (!importsExportsNode[0]) {
        return null;
      }

      if (typeof importsExportsNode[0] === 'string') {
        return importsExportsNode[0] + trimStart(relativeModuleName, ENTRY_POINT);
      }

      conditions = importsExportsNode[0];
    } else {
      conditions = importsExportsNode;
    }

    const path = conditions['require'] ?? conditions['node'] ?? conditions['import'] ?? conditions['default'];

    if (typeof path === 'string') {
      return path + trimStart(relativeModuleName, ENTRY_POINT);
    }

    if (!isTopLevel) {
      return null;
    }

    const separatorIndex = relativeModuleName.lastIndexOf(RELATIVE_MODULE_PATH_SEPARATOR);
    const parentRelativeModuleName = separatorIndex !== -1 ? relativeModuleName.slice(0, separatorIndex) : relativeModuleName;
    const leafRelativeModuleName = separatorIndex !== -1 ? relativeModuleName.slice(separatorIndex + 1) : '';

    for (const [condition, exportsNodeChild] of Object.entries(conditions)) {
      if (condition === relativeModuleName) {
        const modulePath = this.getExportsRelativeModulePath(exportsNodeChild, ENTRY_POINT, false);
        if (modulePath) {
          return modulePath;
        }
      } else if (condition.endsWith(WILDCARD_MODULE_CONDITION_SUFFIX)) {
        const parentCondition = trimEnd(condition, WILDCARD_MODULE_CONDITION_SUFFIX);
        if (parentCondition === parentRelativeModuleName && leafRelativeModuleName) {
          const modulePath = this.getExportsRelativeModulePath(exportsNodeChild, ENTRY_POINT, false);
          if (modulePath) {
            return modulePath.replace(WILDCARD_MODULE_PLACEHOLDER, leafRelativeModuleName);
          }
        }
      }
    }

    return null;
  }

  private getPackageJsonPath(packageDir: string): string {
    return join(packageDir, PACKAGE_JSON);
  }

  private getParentPathFromCallStack(): null | string {
    /**
     * The caller line index is 4 because the call stack is as follows:
     *
     * 0: Error
     * 1:     at CustomRequireImpl.getParentPathFromCallStack (plugin:fix-require-modules:?:?)
     * 2:     at CustomRequireImpl.resolve (plugin:fix-require-modules:?:?)
     * 3:     at CustomRequireImpl.require (plugin:fix-require-modules:?:?)
     * 4:     at functionName (path/to/caller.js:?:?)
     */
    const CALLER_LINE_INDEX = 4;
    const callStackLines = new Error().stack?.split('\n') ?? [];
    console.debug({ callStackLines });
    const callStackMatch = callStackLines.at(CALLER_LINE_INDEX)?.match(/^ {4}at .+? \((.+?):\d+:\d+\)$/);
    const parentPath = callStackMatch?.[1] ?? null;

    if (parentPath?.includes('<anonymous>')) {
      return null;
    }

    return parentPath;
  }

  private async getRootDirAsync(cwd: string): Promise<null | string> {
    let currentDir = toPosixPath(cwd);
    while (currentDir !== '.' && currentDir !== '/') {
      if (await this.existsFileAsync(this.getPackageJsonPath(currentDir))) {
        return toPosixPath(currentDir);
      }
      currentDir = dirname(currentDir);
    }
    return null;
  }

  private async getRootDirsAsync(dir: string): Promise<string[]> {
    const modulesRootDir = this.plugin.settingsCopy.modulesRoot ? join(this.vaultAbsolutePath, this.plugin.settingsCopy.modulesRoot) : null;

    const ans: string[] = [];
    for (const possibleDir of new Set([dir, modulesRootDir])) {
      if (possibleDir === null) {
        continue;
      }

      const rootDir = await this.getRootDirAsync(possibleDir);
      if (rootDir == null) {
        continue;
      }

      ans.push(rootDir);
    }

    return ans;
  }

  private merge(emptyModule: object, loadedModule: unknown): unknown {
    if (typeof loadedModule !== 'object' || loadedModule === null) {
      return loadedModule;
    }

    Object.assign(emptyModule, loadedModule);

    const esModule = loadedModule as Partial<EsModule>;

    if (esModule.__esModule) {
      Object.defineProperty(emptyModule, '__esModule', { value: true });
    }

    return emptyModule;
  }

  private async readPackageJsonAsync(path: string): Promise<PackageJson> {
    const content = await this.readFileAsync(path);
    return JSON.parse(content) as PackageJson;
  }

  private require(id: string, options: Partial<RequireOptions> = {}): unknown {
    const DEFAULT_OPTIONS: RequireOptions = {
      cacheInvalidationMode: CacheInvalidationMode.WhenPossible
    };
    const fullOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    const cleanId = splitQuery(id).cleanStr;
    const specialModule = this.requireSpecialModule(cleanId);
    if (specialModule) {
      return specialModule;
    }

    const { resolvedId, resolvedType } = this.resolve(id, fullOptions.parentPath);

    let cleanResolvedId: string;
    let query: string;

    if (resolvedType !== ResolvedType.Url) {
      ({ cleanStr: cleanResolvedId, query } = splitQuery(resolvedId));
    } else {
      cleanResolvedId = resolvedId;
      query = '';
    }

    const cachedModuleEntry = this.modulesCache[resolvedId];

    if (cachedModuleEntry) {
      if (!cachedModuleEntry.loaded) {
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}`);
        return cachedModuleEntry.exports;
      }

      switch (fullOptions.cacheInvalidationMode) {
        case CacheInvalidationMode.Never:
          return cachedModuleEntry.exports;
        case CacheInvalidationMode.WhenPossible:
          if (query) {
            return cachedModuleEntry.exports;
          }

          if (!this.canRequireNonCached(resolvedType)) {
            console.warn(`Cached module ${resolvedId} cannot be invalidated synchronously. The cached version will be used. `);
            return cachedModuleEntry.exports;
          }
      }
    }

    if (!this.canRequireNonCached(resolvedType)) {
      throw new Error(`Cannot require '${resolvedId}' synchronously.
${this.getRequireAsyncAdvice(true)}`);
    }

    const module = this.initModuleAndAddToCache(cleanResolvedId, () => this.requireNonCached(cleanResolvedId, resolvedType, fullOptions.cacheInvalidationMode));
    this.initModuleAndAddToCache(resolvedId, () => module);
    return module;
  }

  private async requireModuleAsync(moduleName: string, parentDir: string, cacheInvalidationMode: CacheInvalidationMode): Promise<unknown> {
    let separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR);

    if (moduleName.startsWith(SCOPED_MODULE_PREFIX)) {
      if (separatorIndex === -1) {
        throw new Error(`Invalid scoped module name: ${moduleName}`);
      }
      separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR, separatorIndex + 1);
    }

    const baseModuleName = separatorIndex !== -1 ? moduleName.slice(0, separatorIndex) : moduleName;
    let relativeModuleName = ENTRY_POINT + (separatorIndex !== -1 ? moduleName.slice(separatorIndex) : '');

    for (const rootDir of await this.getRootDirsAsync(parentDir)) {
      let packageDir: string;
      if (moduleName.startsWith(PRIVATE_MODULE_PREFIX)) {
        packageDir = rootDir;
        relativeModuleName = moduleName;
      } else {
        packageDir = join(rootDir, NODE_MODULES_DIR, baseModuleName);
      }

      if (!await this.existsDirectoryAsync(packageDir)) {
        continue;
      }

      const packageJsonPath = this.getPackageJsonPath(packageDir);
      if (!await this.existsFileAsync(packageJsonPath)) {
        continue;
      }

      const packageJson = await this.readPackageJsonAsync(packageJsonPath);
      const relativeModulePath = this.getRelativeModulePath(packageJson, relativeModuleName);
      if (relativeModulePath == null) {
        continue;
      }

      const resolvedPath = join(packageDir, relativeModulePath);
      return this.requirePathAsync(resolvedPath, cacheInvalidationMode);
    }

    throw new Error(`Could not resolve module: ${moduleName}`);
  }

  private async requireNonCachedAsync(id: string, type: ResolvedType, cacheInvalidationMode: CacheInvalidationMode): Promise<unknown> {
    switch (type) {
      case ResolvedType.Module: {
        const [parentDir = '', moduleName = ''] = id.split(MODULE_NAME_SEPARATOR);
        return this.requireModuleAsync(moduleName, parentDir, cacheInvalidationMode);
      }
      case ResolvedType.Path:
        return this.requirePathAsync(id, cacheInvalidationMode);
      case ResolvedType.Url:
        return this.requireUrlAsync(id);
    }
  }

  private async requirePathAsync(path: string, cacheInvalidationMode: CacheInvalidationMode): Promise<unknown> {
    const existingFilePath = await this.findExistingFilePathAsync(path);
    if (existingFilePath == null) {
      throw new Error(`File not found: ${path}`);
    }

    await this.checkTimestampChangedAndReloadIfNeededAsync(existingFilePath, cacheInvalidationMode);
    return this.modulesCache[existingFilePath]?.exports;
  }

  private async requireUrlAsync(url: string): Promise<unknown> {
    const response = await requestUrl(url);
    return this.requireStringAsync(response.text, url);
  }

  private requireWithoutInvalidation(id: string, options: Partial<RequireOptions> = {}): unknown {
    const optionsWithoutInvalidation = {
      ...options,
      cacheInvalidationMode: CacheInvalidationMode.Never
    };
    return this.require(id, optionsWithoutInvalidation);
  }

  private wrapRequire(options: WrapRequireOptions): RequireExFn {
    const fn = (id: string, requireOptions: Partial<RequireOptions> = {}): unknown => {
      options.beforeRequire?.(id);
      const newOptions = { ...options.optionsToPrepend, ...requireOptions, ...options.optionsToAppend };
      return options.require(id, newOptions);
    };
    return Object.assign(fn, options.require, normalizeOptionalProperties<{ parentPath?: string }>({ parentPath: options.optionsToPrepend?.parentPath }));
  }
}

function splitQuery(str: string): SplitQueryResult {
  const queryIndex = str.indexOf('?');
  return {
    cleanStr: queryIndex !== -1 ? str.slice(0, queryIndex) : str,
    query: queryIndex !== -1 ? str.slice(queryIndex) : ''
  };
}
