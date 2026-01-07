import type { Code } from 'mdast';
import type { PackageJson } from 'obsidian-dev-utils/ScriptUtils/Npm';
import type { Promisable } from 'type-fest';

import { debuggableEval } from 'debuggable-eval';
import {
  Platform,
  requestUrl
} from 'obsidian';
import { noop } from 'obsidian-dev-utils/Function';
import { normalizeOptionalProperties } from 'obsidian-dev-utils/ObjectUtils';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  toPosixPath
} from 'obsidian-dev-utils/Path';
import {
  replaceAll,
  trimEnd,
  trimStart
} from 'obsidian-dev-utils/String';
import {
  assertAllTypeKeys,
  typeToDummyParam
} from 'obsidian-dev-utils/Type';
import { isUrl } from 'obsidian-dev-utils/url';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

import type { Plugin } from './Plugin.ts';
import type {
  require,
  requireAsync,
  requireAsyncWrapper,
  RequireExFn,
  RequireOptions
} from './types.ts';

import { SequentialBabelPlugin } from './babel/CombineBabelPlugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/ConvertToCommonJsBabelPlugin.ts';
import { ExtractRequireArgsListBabelPlugin } from './babel/ExtractRequireArgsListBabelPlugin.ts';
import { FixSourceMapBabelPlugin } from './babel/FixSourceMapBabelPlugin.ts';
import { ReplaceDynamicImportBabelPlugin } from './babel/ReplaceDynamicImportBabelPlugin.ts';
import { WrapInRequireFunctionBabelPlugin } from './babel/WrapInRequireFunctionBabelPlugin.ts';
import {
  CachedModuleProxyHandler,
  EMPTY_MODULE_SYMBOL
} from './CachedModuleProxyHandler.ts';
import { CODE_SCRIPT_BLOCK_LANGUAGE } from './CodeScriptBlock.ts';
import { createCodeScriptToolkitModule } from './CodeScriptToolkitModuleImpl.ts';
import { getCodeScriptToolkitNoteSettingsFromContent } from './CodeScriptToolkitNoteSettings.ts';
import { registerObsidianDevUtilsModule } from './ObsidianDevUtilsModule.ts';
import { SPECIAL_MODULE_NAMES } from './SpecialModuleNames.ts';
import {
  CacheInvalidationMode,
  ModuleType
} from './types.ts';

export enum ResolvedType {
  Module = 'module',
  Path = 'path',
  SpecialModule = 'specialModule',
  Url = 'url'
}

export type PluginRequireFn = (id: string) => unknown;
export type RequireAsyncFn = typeof requireAsync;
export type RequireAsyncWrapperFn = typeof requireAsyncWrapper;
export type RequireFn = typeof require;

interface EmptyModule {
  [EMPTY_MODULE_SYMBOL]: boolean;
}

interface ExtractCodeScriptResult {
  code: string;
  codeScriptName: string | undefined;
}

interface Module {
  exports: object;
}

interface RequireStringImplOptions {
  code: string;
  evalPrefix: string;
  path: string;
  shouldWrapInAsyncFunction: boolean;
  urlSuffix: string;
}

interface RequireStringImplResult {
  exportsFn: () => unknown;
  promisable: Promisable<void>;
}

interface RequireWindow {
  require?: RequireExFn;
  requireAsync?: RequireAsyncFn;
  requireAsyncWrapper?: RequireAsyncWrapperFn;
}

interface ResolveResult {
  resolvedId: string;
  resolvedType: ResolvedType;
}

type ScriptWrapper = (ctx: ScriptWrapperContext) => Promisable<void>;

interface ScriptWrapperContext {
  __dirname: string;
  __filename: string;
  exports: object;
  module: Module;
  require: RequireExFn;
  requireAsync: RequireAsyncFn;
  requireAsyncWrapper: RequireAsyncWrapperFn;
}

interface SplitQueryResult {
  cleanStr: string;
  query: string;
}

interface WrapRequireOptions {
  beforeRequire?(id: string): void;
  optionsToAppend?: Partial<RequireOptions>;
  optionsToPrepend?: Partial<RequireOptions>;
  require: RequireExFn;
}

/**
 * The caller line index is 4 because the call stack is as follows:
 *
 * 0: Error
 * 1:     at RequireHandlerImpl.getParentPathFromCallStack (plugin:fix-require-modules:?:?)
 * 2:     at RequireHandlerImpl.resolve (plugin:fix-require-modules:?:?)
 * 3:     at RequireHandlerImpl.require (plugin:fix-require-modules:?:?)
 * 4:     at functionName (path/to/caller.js:?:?)
 */
const CALLER_LINE_INDEX = 4;

export const ENTRY_POINT = '.';
export const EXTENSIONS = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.md'];
export const MODULE_NAME_SEPARATOR = '*';
export const NODE_MODULES_FOLDER = 'node_modules';
const PACKAGE_JSON = 'package.json';
export const PATH_SUFFIXES = ['', ...EXTENSIONS, ...EXTENSIONS.map((ext) => `/index${ext}`)];
export const PRIVATE_MODULE_PREFIX = '#';
export const RELATIVE_MODULE_PATH_SEPARATOR = '/';
export const SCOPED_MODULE_PREFIX = '@';
const SCRIPT_WRAPPER_CONTEXT_KEYS = assertAllTypeKeys(typeToDummyParam<ScriptWrapperContext>(), [
  '__dirname',
  '__filename',
  'require',
  'requireAsync',
  'requireAsyncWrapper',
  'module',
  'exports'
]);
const WILDCARD_MODULE_CONDITION_SUFFIX = '/*';
export const VAULT_ROOT_PREFIX = '//';

export abstract class RequireHandler {
  protected readonly currentModulesTimestampChain = new Set<string>();
  protected readonly moduleDependencies = new Map<string, Set<string>>();
  protected modulesCache: NodeJS.Dict<NodeJS.Module> = {};
  protected readonly moduleTimestamps = new Map<string, number>();
  protected vaultAbsolutePath?: string;
  protected get plugin(): Plugin {
    if (!this._plugin) {
      throw new Error('Plugin is not registered.');
    }
    return this._plugin;
  }

  protected get requireEx(): RequireExFn {
    if (!this._requireEx) {
      throw new Error('requireEx is not set');
    }
    return this._requireEx;
  }

  private _plugin?: Plugin;

  private _requireEx?: RequireExFn;
  private originalRequire?: NodeJS.Require;
  private pluginRequire?: PluginRequireFn;
  private readonly specialModuleFactories = new Map<string, (options: Partial<RequireOptions>) => unknown>();

  public clearCache(): void {
    this.moduleTimestamps.clear();
    this.currentModulesTimestampChain.clear();
    this.moduleDependencies.clear();

    for (const key of Object.keys(this.modulesCache)) {
      if (key.startsWith('electron') || key.includes('app.asar')) {
        continue;
      }

      this.deleteCacheEntry(key);
    }
  }

  public async register(plugin: Plugin, pluginRequire: PluginRequireFn): Promise<void> {
    this._plugin = plugin;
    await this.initSpecialModuleFactories();

    this.pluginRequire = pluginRequire;
    this.vaultAbsolutePath = toPosixPath(plugin.app.vault.adapter.basePath);
    this.originalRequire = window.require;

    this._requireEx = Object.assign(this.require.bind(this), {
      cache: {}
    }, this.originalRequire) as RequireExFn;
    this.modulesCache = this.requireEx.cache;

    plugin.registerDomWindowHandler((win) => {
      const requireWindow = win as Partial<RequireWindow>;

      requireWindow.require = this.requireEx;
      plugin.register(() => {
        if (!this.originalRequire) {
          return;
        }
        requireWindow.require = this.originalRequire;
      });

      requireWindow.requireAsync = this.requireAsync.bind(this);
      plugin.register(() => delete requireWindow.requireAsync);

      requireWindow.requireAsyncWrapper = this.requireAsyncWrapper.bind(this);
      plugin.register(() => delete requireWindow.requireAsyncWrapper);
    });
  }

  public async requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
    const DEFAULT_OPTIONS: RequireOptions = {
      cacheInvalidationMode: CacheInvalidationMode.WhenPossible
    };
    const fullOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    const specialModule = this.requireSpecialModule(id, fullOptions);
    if (specialModule !== undefined) {
      return specialModule;
    }

    const { resolvedId, resolvedType } = this.resolve(id, fullOptions.parentPath);

    let cleanResolvedId: string;
    let query: string;

    if (resolvedType === ResolvedType.Url) {
      cleanResolvedId = resolvedId;
      query = '';
    } else {
      ({ cleanStr: cleanResolvedId, query } = splitQuery(resolvedId));
    }

    const RELOAD_TIMEOUT_IN_MILLISECONDS = 2000;
    const REPEAT_INTERVAL_IN_MILLISECONDS = 100;
    let cachedModuleEntry: NodeJS.Module | undefined = undefined;
    const start = performance.now();
    while (performance.now() - start < RELOAD_TIMEOUT_IN_MILLISECONDS) {
      cachedModuleEntry = this.modulesCache[resolvedId];
      if (!cachedModuleEntry || cachedModuleEntry.loaded) {
        break;
      }
      await sleep(REPEAT_INTERVAL_IN_MILLISECONDS);
    }

    if (cachedModuleEntry) {
      if (!cachedModuleEntry.loaded) {
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}.`);
        return cachedModuleEntry.exports;
      }

      if (this.currentModulesTimestampChain.has(resolvedId)) {
        return cachedModuleEntry.exports;
      }

      switch (fullOptions.cacheInvalidationMode) {
        case CacheInvalidationMode.Always:
          break;
        case CacheInvalidationMode.Never:
          return cachedModuleEntry.exports;
        case CacheInvalidationMode.WhenPossible:
          if (query) {
            return cachedModuleEntry.exports;
          }
          break;
        default:
          throw new Error(`Unknown cacheInvalidationMode: '${fullOptions.cacheInvalidationMode as unknown as string}'.`);
      }
    }

    if (cleanResolvedId.endsWith('.md')) {
      return await this.initModuleAndAddToCacheAsync(
        resolvedId,
        () => this.requireNonCachedAsync(resolvedId, resolvedType, fullOptions)
      );
    }

    const module = await this.initModuleAndAddToCacheAsync(
      cleanResolvedId,
      () => this.requireNonCachedAsync(cleanResolvedId, resolvedType, fullOptions)
    );
    if (resolvedId !== cleanResolvedId) {
      this.initModuleAndAddToCache(resolvedId, () => module);
    }
    return module;
  }

  public async requireStringAsync(code: string, path: string, urlSuffix?: string): Promise<unknown> {
    urlSuffix = urlSuffix ? `/${urlSuffix}` : '';

    try {
      return await this.initModuleAndAddToCacheAsync(path, async () => {
        const result = this.requireStringImpl({
          code,
          evalPrefix: 'requireStringAsync',
          path,
          shouldWrapInAsyncFunction: true,
          urlSuffix
        });
        await result.promisable;
        return result.exportsFn();
      });
    } catch (e) {
      throw new Error(`Failed to load module: '${path}'.`, { cause: e });
    }
  }

  protected abstract canRequireNonCached(type: ResolvedType, options: Partial<RequireOptions>): boolean;

  protected abstract existsFileAsync(path: string): Promise<boolean>;

  protected abstract existsFolderAsync(path: string): Promise<boolean>;

  protected getCachedModule(id: string): unknown {
    return this.modulesCache[id]?.loaded ? this.modulesCache[id].exports : null;
  }

  protected getPackageJsonPath(packageFolder: string): string {
    return join(packageFolder, PACKAGE_JSON);
  }

  protected getParentPathFromCallStack(callerLineIndex = CALLER_LINE_INDEX): null | string {
    const callStackLines = new Error().stack?.split('\n') ?? [];
    this.plugin.consoleDebug('callStackLines', { callStackLines });
    const callStackMatch = callStackLines.at(callerLineIndex)?.match(/^ {4}at .+? \((?<ParentPath>.+?):\d+:\d+\)$/);
    let parentPath = callStackMatch?.groups?.['ParentPath'] ?? null;

    if (parentPath) {
      parentPath = trimStart(parentPath, 'requireString/');
    }

    if (parentPath?.includes('<anonymous>') || parentPath?.startsWith('plugin:')) {
      return null;
    }

    return parentPath;
  }

  protected getRelativeModulePaths(packageJson: PackageJson, relativeModuleName: string): string[] {
    const isPrivateModule = relativeModuleName.startsWith(PRIVATE_MODULE_PREFIX);
    const importsExportsNode = isPrivateModule ? packageJson.imports : packageJson.exports;
    const paths = this.getExportsRelativeModulePaths(importsExportsNode, relativeModuleName);

    if (relativeModuleName === ENTRY_POINT) {
      paths.push(packageJson.main ?? ENTRY_POINT);
    }

    if (!importsExportsNode && !isPrivateModule) {
      paths.push(relativeModuleName);
    }

    return paths;
  }

  protected getRequireAsyncAdvice(id: string): string {
    return `You cannot use synchronous require('${id}'), as it is not supported on Mobile for most features and on Desktop for some features as well. In order to use it with desired feature, you need to slightly modify your code. See https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/new-functions.md#migrate-to-async to adjust your code to work for the desired feature.`;
  }

  protected abstract getTimestampAsync(path: string): Promise<number>;

  protected handleCodeWithTopLevelAwait(_path: string): void {
    noop();
  }

  protected initModuleAndAddToCache(id: string, moduleInitializer: () => unknown): unknown {
    if (!this.modulesCache[id] || this.modulesCache[id].loaded) {
      this.deleteCacheEntry(id);
      this.addToModuleCache(id, this.createEmptyModule(id), false);
    }
    try {
      const module = moduleInitializer();
      const cachedModule = this.getCachedModule(id);
      if (cachedModule) {
        return cachedModule;
      }
      if (!this.isEmptyModule(module)) {
        this.addToModuleCache(id, module);
      }

      return module;
    } catch (e) {
      this.deleteCacheEntry(id);
      throw e;
    }
  }

  protected abstract readFileAsync(path: string): Promise<string>;

  protected abstract readFileBinaryAsync(path: string): Promise<ArrayBuffer>;

  protected abstract requireAsarPackedModule(id: string, options: Partial<RequireOptions>): unknown;

  protected abstract requireElectronModule(id: string, options: Partial<RequireOptions>): unknown;

  protected abstract requireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown>;

  protected abstract requireNodeBuiltInModule(id: string): unknown;

  protected abstract requireNonCached(id: string, type: ResolvedType, options: Partial<RequireOptions>): unknown;

  protected requireSpecialModule(id: string, options: Partial<RequireOptions>): unknown {
    if (options.parentModule?.path.includes('app.asar')) {
      return this.requireElectronModule(id, options);
    }

    const cleanId = splitQuery(id).cleanStr;
    return this.specialModuleFactories.get(cleanId)?.(options);
  }

  protected requireStringImpl(options: RequireStringImplOptions): RequireStringImplResult {
    const folder = isUrl(options.path) ? '' : dirname(options.path);
    const filename = isUrl(options.path) ? options.path : basename(options.path);
    const url = convertPathToObsidianUrl(options.path) + options.urlSuffix;

    const transformResult = new SequentialBabelPlugin([
      new ConvertToCommonJsBabelPlugin(),
      new WrapInRequireFunctionBabelPlugin(options.shouldWrapInAsyncFunction, SCRIPT_WRAPPER_CONTEXT_KEYS),
      new ReplaceDynamicImportBabelPlugin(),
      new FixSourceMapBabelPlugin(url)
    ]).transform(options.code, filename, folder);

    if (transformResult.error) {
      throw new Error(`Failed to transform code from: '${options.path}'.`, { cause: transformResult.error });
    }

    if (transformResult.data.hasTopLevelAwait) {
      this.handleCodeWithTopLevelAwait(options.path);
    }

    const scriptWrapper = debuggableEval(transformResult.transformedCode, `${options.evalPrefix}/${options.path}${options.urlSuffix}`) as ScriptWrapper;
    const module = { exports: {} };

    const ctx: ScriptWrapperContext = {
      __dirname: dirname(options.path),
      __filename: options.path,
      // eslint-disable-next-line import-x/no-commonjs -- Need to return exports.
      exports: module.exports,
      module,
      require: this.makeChildRequire(options.path),
      requireAsync: this.makeChildRequireAsync(options.path),
      requireAsyncWrapper: this.requireAsyncWrapper.bind(this)
    };
    const promisable = scriptWrapper(ctx);
    return {
      // eslint-disable-next-line import-x/no-commonjs -- Need to return exports.
      exportsFn: () => module.exports,
      promisable
    };
  }

  protected resolve(id: string, parentPath?: string): ResolveResult {
    id = toPosixPath(id);

    const cleanId = splitQuery(id).cleanStr;
    if (this.specialModuleFactories.has(cleanId)) {
      return { resolvedId: id, resolvedType: ResolvedType.SpecialModule };
    }

    // Check for URL resolution
    const urlResult = this.resolveUrl(id);
    if (urlResult) {
      return urlResult;
    }

    // Check for path prefix resolution
    const prefixResult = this.resolvePathPrefix(id);
    if (prefixResult) {
      return prefixResult;
    }

    if (isAbsolute(id)) {
      return { resolvedId: id, resolvedType: ResolvedType.Path };
    }

    // Handle relative paths and modules
    return this.resolveRelativeOrModule(id, parentPath);
  }

  private addToModuleCache(id: string, module: unknown, isLoaded = true): NodeJS.Module {
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
    if (
      !this.isEmptyModule(module) && (typeof module === 'object' || typeof module === 'function') && module !== null && !('default' in module)
      && Object.isExtensible(module)
    ) {
      Object.defineProperty(module, 'default', {
        configurable: false,
        enumerable: false,
        value: module,
        writable: false
      });
    }

    return this.modulesCache[id];
  }

  private applyCondition(condition: string, exportsNodeChild: PackageJson.Exports, relativeModuleName: string): string[] {
    if (condition === 'types') {
      return [];
    }

    if (condition === relativeModuleName) {
      return this.getExportsRelativeModulePaths(exportsNodeChild, ENTRY_POINT);
    }

    if (!condition.startsWith(ENTRY_POINT)) {
      return this.getExportsRelativeModulePaths(exportsNodeChild, relativeModuleName);
    }

    if (condition.endsWith(WILDCARD_MODULE_CONDITION_SUFFIX)) {
      const parentCondition = trimEnd(condition, WILDCARD_MODULE_CONDITION_SUFFIX);
      const separatorIndex = relativeModuleName.lastIndexOf(RELATIVE_MODULE_PATH_SEPARATOR);
      const parentRelativeModuleName = separatorIndex === -1 ? relativeModuleName : relativeModuleName.slice(0, separatorIndex);
      const leafRelativeModuleName = separatorIndex === -1 ? '' : relativeModuleName.slice(separatorIndex + 1);

      if (parentCondition === parentRelativeModuleName && leafRelativeModuleName) {
        return this.getExportsRelativeModulePaths(exportsNodeChild, join(ENTRY_POINT, leafRelativeModuleName));
      }
    }

    return [];
  }

  private createEmptyModule(id: string): EmptyModule {
    const loadingModule = {};
    const emptyModule = new Proxy({}, new CachedModuleProxyHandler(() => this.getCachedModule(id) ?? loadingModule));
    return emptyModule as EmptyModule;
  }

  private deleteCacheEntry(id: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Need to delete cache entry.
    delete this.modulesCache[id];
  }

  private async findExistingFilePathAsync(path: string): Promise<null | string> {
    const { cleanStr: cleanPath, query } = splitQuery(path);
    for (const suffix of PATH_SUFFIXES) {
      const newPath = cleanPath + suffix;
      if (await this.existsFileAsync(newPath)) {
        return newPath + query;
      }
    }

    return null;
  }

  private async getDependenciesTimestampChangedAndReloadIfNeededAsync(
    path: string,
    cacheInvalidationMode?: CacheInvalidationMode,
    moduleType?: ModuleType
  ): Promise<number> {
    if (this.currentModulesTimestampChain.has(path)) {
      return this.moduleTimestamps.get(path) ?? 0;
    }

    this.currentModulesTimestampChain.add(path);

    const updateTimestamp = (newTimestamp: number): void => {
      timestamp = Math.max(timestamp, newTimestamp);
      this.moduleTimestamps.set(path, timestamp);
    };

    const cachedTimestamp = this.moduleTimestamps.get(path) ?? 0;
    let timestamp = 0;
    updateTimestamp(await this.getTimestampAsync(path));
    const dependencies = this.moduleDependencies.get(path) ?? [];
    for (const dependency of dependencies) {
      const { resolvedId, resolvedType } = this.resolve(dependency, path);
      switch (resolvedType) {
        case ResolvedType.Module:
          for (const rootFolder of await this.getRootFoldersAsync(path)) {
            const packageJsonPath = this.getPackageJsonPath(rootFolder);
            if (!await this.existsFileAsync(packageJsonPath)) {
              continue;
            }

            const dependencyTimestamp = await this.getDependenciesTimestampChangedAndReloadIfNeededAsync(packageJsonPath, cacheInvalidationMode);
            updateTimestamp(dependencyTimestamp);
          }
          break;
        case ResolvedType.Path: {
          const existingFilePath = await this.findExistingFilePathAsync(resolvedId);
          if (existingFilePath === null) {
            throw new Error(`File not found: '${resolvedId}'.`);
          }

          const dependencyTimestamp = await this.getDependenciesTimestampChangedAndReloadIfNeededAsync(existingFilePath, cacheInvalidationMode);
          updateTimestamp(dependencyTimestamp);
          break;
        }
        case ResolvedType.SpecialModule:
          break;
        case ResolvedType.Url: {
          if (cacheInvalidationMode !== CacheInvalidationMode.Never) {
            updateTimestamp(Date.now());
          }
          break;
        }
        default:
          throw new Error(`Unknown resolvedType: '${resolvedType as string}'.`);
      }
    }

    if (timestamp > cachedTimestamp || !this.getCachedModule(path)) {
      await this.initModuleAndAddToCacheAsync(path, () => this.requirePathImplAsync(path, moduleType));
    }
    return timestamp;
  }

  private getExportsRelativeModulePaths(exportsNode: PackageJson.Exports | undefined, relativeModuleName: string): string[] {
    if (!exportsNode) {
      return [];
    }

    if (typeof exportsNode === 'string') {
      let path = exportsNode;

      if (!path.contains(MODULE_NAME_SEPARATOR)) {
        path = join(path, MODULE_NAME_SEPARATOR);
      }

      const resolvedPath = replaceAll(path, MODULE_NAME_SEPARATOR, relativeModuleName);
      return [resolvedPath];
    }

    const CONDITIONS = ['browser', 'import', 'default', 'require', 'node'];

    if (!Array.isArray(exportsNode)) {
      const conditions = exportsNode;
      return Object.entries(conditions)
        .sort((entry1, entry2) => {
          const key1 = entry1[0];
          const key2 = entry2[0];
          const NOT_FOUND_INDEX = -1;

          let index1 = CONDITIONS.indexOf(key1);
          if (index1 === NOT_FOUND_INDEX) {
            index1 = CONDITIONS.length;
          }
          let index2 = CONDITIONS.indexOf(key2);
          if (index2 === -1) {
            index2 = CONDITIONS.length;
          }
          return index1 - index2;
        })
        .flatMap(([condition, exportsNodeChild]) => this.applyCondition(condition, exportsNodeChild, relativeModuleName));
    }

    const arr = exportsNode;
    return arr.flatMap((exportsNodeChild) => this.getExportsRelativeModulePaths(exportsNodeChild, relativeModuleName));
  }

  private async getRootFolderAsync(cwd: string): Promise<null | string> {
    let currentFolder = toPosixPath(cwd);
    while (currentFolder !== '.' && currentFolder !== '/') {
      if (await this.existsFileAsync(this.getPackageJsonPath(currentFolder))) {
        return toPosixPath(currentFolder);
      }
      currentFolder = dirname(currentFolder);
    }
    return null;
  }

  private async getRootFoldersAsync(folder: string): Promise<string[]> {
    const modulesRootFolder = this.plugin.settings.modulesRoot ? join(this.vaultAbsolutePath ?? '', this.plugin.settings.modulesRoot) : null;

    const ans: string[] = [];
    for (const possibleFolder of new Set([folder, modulesRootFolder])) {
      if (possibleFolder === null) {
        continue;
      }

      const rootFolder = await this.getRootFolderAsync(possibleFolder);
      if (rootFolder === null) {
        continue;
      }

      ans.push(rootFolder);
    }

    return ans;
  }

  private async initModuleAndAddToCacheAsync(id: string, moduleInitializer: () => Promise<unknown>): Promise<unknown> {
    if (!this.modulesCache[id] || this.modulesCache[id].loaded) {
      this.deleteCacheEntry(id);
      this.addToModuleCache(id, this.createEmptyModule(id), false);
    }
    try {
      const module = await moduleInitializer();
      const cachedModule = this.getCachedModule(id);
      if (cachedModule) {
        return cachedModule;
      }
      if (!this.isEmptyModule(module)) {
        this.addToModuleCache(id, module);
      }
      return module;
    } catch (e) {
      this.deleteCacheEntry(id);
      throw e;
    }
  }

  private async initSpecialModuleFactories(): Promise<void> {
    this.specialModuleFactories.set('obsidian/app', () => this.plugin.app);
    this.specialModuleFactories.set('obsidian/specialModuleNames', () => SPECIAL_MODULE_NAMES);
    this.specialModuleFactories.set('codescript-toolkit', () => createCodeScriptToolkitModule(this.plugin));
    await registerObsidianDevUtilsModule(this.specialModuleFactories);

    for (const id of SPECIAL_MODULE_NAMES.obsidianBuiltInModuleNames) {
      this.specialModuleFactories.set(id, () => this.pluginRequire?.(id));
    }

    for (const id of SPECIAL_MODULE_NAMES.nodeBuiltInModuleNames) {
      this.specialModuleFactories.set(id, () => this.requireNodeBuiltInModule(id));
      const NODE_BUILT_IN_MODULE_PREFIX = 'node:';
      this.specialModuleFactories.set(NODE_BUILT_IN_MODULE_PREFIX + id, () => this.requireNodeBuiltInModule(id));
    }

    for (const id of SPECIAL_MODULE_NAMES.electronModuleNames) {
      this.specialModuleFactories.set(id, (options) => this.requireElectronModule(id, options));
    }

    for (const id of SPECIAL_MODULE_NAMES.asarPackedModuleNames) {
      this.specialModuleFactories.set(id, (options) => this.requireAsarPackedModule(id, options));
    }

    for (const id of SPECIAL_MODULE_NAMES.deprecatedObsidianBuiltInModuleNames) {
      this.specialModuleFactories.set(id, () => this.requireDeprecatedObsidianBuiltInModule(id));
    }
  }

  private isEmptyModule(module: unknown): boolean {
    return (module as Partial<EmptyModule> | undefined)?.[EMPTY_MODULE_SYMBOL] === true;
  }

  private makeChildRequire(parentPath: string): RequireExFn {
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

  private makeChildRequireAsync(parentPath: string): RequireAsyncFn {
    const that = this;
    return wrapped;

    async function wrapped(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
      const newOptions = normalizeOptionalProperties<Partial<RequireOptions>>({ parentPath, ...options });
      return await that.requireAsync(id, newOptions);
    }
  }

  private async readPackageJsonAsync(path: string): Promise<PackageJson> {
    const content = await this.readFileAsync(path);
    return JSON.parse(content) as PackageJson;
  }

  private require(id: string, options?: Partial<RequireOptions>): unknown {
    const DEFAULT_OPTIONS: RequireOptions = {
      cacheInvalidationMode: CacheInvalidationMode.WhenPossible
    };
    const fullOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    const specialModule = this.requireSpecialModule(id, fullOptions);
    if (specialModule !== undefined) {
      return specialModule;
    }

    const { resolvedId, resolvedType } = this.resolve(id, fullOptions.parentPath);

    let cleanResolvedId: string;
    let query: string;

    if (resolvedType === ResolvedType.Url) {
      cleanResolvedId = resolvedId;
      query = '';
    } else {
      ({ cleanStr: cleanResolvedId, query } = splitQuery(resolvedId));
    }

    const cachedModuleEntry = this.modulesCache[resolvedId];

    if (cachedModuleEntry) {
      if (!cachedModuleEntry.loaded) {
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}.`);
        return cachedModuleEntry.exports;
      }

      if (this.currentModulesTimestampChain.has(resolvedId)) {
        return cachedModuleEntry.exports;
      }

      switch (fullOptions.cacheInvalidationMode) {
        case CacheInvalidationMode.Always:
          if (!this.canRequireNonCached(resolvedType, fullOptions)) {
            throw new Error(
              `Cached module ${resolvedId} cannot be invalidated synchronously when cacheInvalidationMode=${CacheInvalidationMode.Always}. ${
                this.getRequireAsyncAdvice(resolvedId)
              }`
            );
          }
          break;
        case CacheInvalidationMode.Never:
          return cachedModuleEntry.exports;
        case CacheInvalidationMode.WhenPossible:
          if (query) {
            return cachedModuleEntry.exports;
          }

          if (!this.canRequireNonCached(resolvedType, fullOptions)) {
            console.warn(
              `Cached module ${resolvedId} cannot be invalidated synchronously when cacheInvalidationMode=${CacheInvalidationMode.WhenPossible}. The cached version will be used. ${
                this.getRequireAsyncAdvice(resolvedId)
              }`
            );
            return cachedModuleEntry.exports;
          }
          break;
        default:
          throw new Error(`Unknown cacheInvalidationMode: '${fullOptions.cacheInvalidationMode as unknown as string}'.`);
      }
    }

    if (cleanResolvedId.endsWith('.md')) {
      return this.initModuleAndAddToCache(
        resolvedId,
        () => this.requireNonCached(resolvedId, resolvedType, fullOptions)
      );
    }
    const module = this.initModuleAndAddToCache(
      cleanResolvedId,
      () => this.requireNonCached(cleanResolvedId, resolvedType, fullOptions)
    );
    if (resolvedId !== cleanResolvedId) {
      this.initModuleAndAddToCache(resolvedId, () => module);
    }
    return module;
  }

  private async requireAsyncWrapper(requireFn: (require: RequireExFn) => Promisable<unknown>, require?: RequireExFn): Promise<unknown> {
    const result = new ExtractRequireArgsListBabelPlugin().transform(requireFn.toString(), 'extract-requires.js');
    const requireArgsList = result.data.requireArgsList;
    const idErrorMap = new Map<string, Error>();
    for (const requireArgs of requireArgsList) {
      const { id, options } = requireArgs;
      const newOptions = normalizeOptionalProperties<Partial<RequireOptions>>({ parentPath: require?.parentPath, ...options });
      try {
        await this.requireAsync(id, newOptions);
      } catch (e) {
        idErrorMap.set(id, e as Error);
      }
    }
    return await requireFn(this.wrapRequire({
      beforeRequire: (id: string): void => {
        const error = idErrorMap.get(id);
        if (error) {
          throw error;
        }
      },
      require: require ?? this.requireEx
    }));
  }

  private requireDeprecatedObsidianBuiltInModule(id: string): unknown {
    throw new Error(`Could not require module: ${id}. Deprecated Obsidian built-in modules are no longer available.`);
  }

  private async requireJsonAsync(path: string, jsonStr?: string): Promise<unknown> {
    jsonStr ??= await this.readFileAsync(splitQuery(path).cleanStr);
    return JSON.parse(jsonStr) as unknown;
  }

  private async requireJsTsAsync(path: string, code?: string): Promise<unknown> {
    code ??= await this.readFileAsync(splitQuery(path).cleanStr);
    return this.requireStringAsync(code, path);
  }

  private async requireMdAsync(path: string, md?: string): Promise<unknown> {
    md ??= await this.readFileAsync(splitQuery(path).cleanStr);
    const { code, codeScriptName } = extractCodeScript(md, path);
    return this.requireStringAsync(code, `${path}.code-script.${codeScriptName ?? '(default)'}.ts`);
  }

  private async requireModuleAsync(
    moduleName: string,
    parentFolder: string,
    cacheInvalidationMode?: CacheInvalidationMode,
    moduleType?: ModuleType
  ): Promise<unknown> {
    let separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR);

    if (moduleName.startsWith(SCOPED_MODULE_PREFIX)) {
      if (separatorIndex === -1) {
        throw new Error(`Invalid scoped module name: '${moduleName}'.`);
      }
      separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR, separatorIndex + 1);
    }

    const baseModuleName = separatorIndex === -1 ? moduleName : moduleName.slice(0, separatorIndex);
    let relativeModuleName = ENTRY_POINT + (separatorIndex === -1 ? '' : moduleName.slice(separatorIndex));

    for (const rootFolder of await this.getRootFoldersAsync(parentFolder)) {
      let packageFolder: string;
      if (moduleName.startsWith(PRIVATE_MODULE_PREFIX) || moduleName === ENTRY_POINT) {
        packageFolder = rootFolder;
        relativeModuleName = moduleName;
      } else {
        packageFolder = join(rootFolder, NODE_MODULES_FOLDER, baseModuleName);
      }

      if (!await this.existsFolderAsync(packageFolder)) {
        continue;
      }

      const packageJsonPath = this.getPackageJsonPath(packageFolder);
      if (!await this.existsFileAsync(packageJsonPath)) {
        continue;
      }

      const packageJson = await this.readPackageJsonAsync(packageJsonPath);
      const relativeModulePaths = this.getRelativeModulePaths(packageJson, relativeModuleName);

      for (const relativeModulePath of relativeModulePaths) {
        const fullModulePath = join(packageFolder, relativeModulePath);
        const existingPath = await this.findExistingFilePathAsync(fullModulePath);
        if (!existingPath) {
          continue;
        }

        return this.requirePathAsync(existingPath, cacheInvalidationMode, moduleType);
      }
    }

    throw new Error(`Could not resolve module: '${moduleName}'.`);
  }

  private async requireNonCachedAsync(id: string, type: ResolvedType, options: Partial<RequireOptions>): Promise<unknown> {
    switch (type) {
      case ResolvedType.Module: {
        const [parentFolder = '', moduleName = ''] = id.split(MODULE_NAME_SEPARATOR);
        return await this.requireModuleAsync(moduleName, parentFolder, options.cacheInvalidationMode, options.moduleType);
      }
      case ResolvedType.Path:
        return await this.requirePathAsync(id, options.cacheInvalidationMode, options.moduleType);
      case ResolvedType.SpecialModule:
        return this.requireSpecialModule(id, options);
      case ResolvedType.Url:
        return await this.requireUrlAsync(id, options.moduleType);
      default:
        throw new Error(`Unknown resolvedType: '${type as string}'.`);
    }
  }

  private async requirePathAsync(path: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): Promise<unknown> {
    const existingFilePath = await this.findExistingFilePathAsync(path);
    if (existingFilePath === null) {
      throw new Error(`File not found: '${path}'.`);
    }

    const isRootRequire = this.currentModulesTimestampChain.size === 0;

    try {
      await this.getDependenciesTimestampChangedAndReloadIfNeededAsync(existingFilePath, cacheInvalidationMode, moduleType);
    } finally {
      if (isRootRequire) {
        this.currentModulesTimestampChain.clear();
      }
    }

    return this.modulesCache[existingFilePath]?.exports;
  }

  private async requirePathImplAsync(path: string, moduleType?: ModuleType): Promise<unknown> {
    moduleType ??= getModuleTypeFromPath(path);
    switch (moduleType) {
      case ModuleType.Json:
        return this.requireJsonAsync(path);
      case ModuleType.JsTs:
        return this.requireJsTsAsync(path);
      case ModuleType.Markdown:
        return this.requireMdAsync(path);
      case ModuleType.Node:
        return this.requireNodeBinaryAsync(path);
      case ModuleType.Wasm:
        return this.requireWasmAsync(path);
      default:
        throw new Error(`Unknown module type: '${moduleType as string}'.`);
    }
  }

  private async requireUrlAsync(url: string, moduleType?: ModuleType): Promise<unknown> {
    const response = await requestUrl(url);
    moduleType ??= getModuleTypeFromContentType(response.headers['content-type'], url);

    switch (moduleType) {
      case ModuleType.Json:
        return this.requireJsonAsync(url, response.text);
      case ModuleType.JsTs:
        return this.requireJsTsAsync(url, response.text);
      case ModuleType.Markdown:
        return this.requireMdAsync(url, response.text);
      case ModuleType.Node:
        return this.requireNodeBinaryAsync(url, response.arrayBuffer);
      case ModuleType.Wasm:
        return this.requireWasmAsync(url, response.arrayBuffer);
      default:
        throw new Error(`Unknown module type: '${moduleType as string}'.`);
    }
  }

  private async requireWasmAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    arrayBuffer ??= await this.readFileBinaryAsync(path);
    const wasm = await WebAssembly.instantiate(arrayBuffer);
    return wasm.instance.exports;
  }

  private resolvePathPrefix(id: string): null | ResolveResult {
    if (id.startsWith(VAULT_ROOT_PREFIX)) {
      return { resolvedId: join(this.vaultAbsolutePath ?? '', trimStart(id, VAULT_ROOT_PREFIX)), resolvedType: ResolvedType.Path };
    }

    const SYSTEM_ROOT_PATH_PREFIX = '~/';
    if (id.startsWith(SYSTEM_ROOT_PATH_PREFIX)) {
      return { resolvedId: `/${trimStart(id, SYSTEM_ROOT_PATH_PREFIX)}`, resolvedType: ResolvedType.Path };
    }

    const MODULES_ROOT_PATH_PREFIX = '/';
    if (id.startsWith(MODULES_ROOT_PATH_PREFIX)) {
      return {
        resolvedId: join(this.vaultAbsolutePath ?? '', this.plugin.settings.modulesRoot, trimStart(id, MODULES_ROOT_PATH_PREFIX)),
        resolvedType: ResolvedType.Path
      };
    }

    return null;
  }

  private resolveRelativeOrModule(id: string, parentPath?: string): ResolveResult {
    parentPath = parentPath ? toPosixPath(parentPath) : this.getParentPathFromCallStack() ?? this.plugin.app.workspace.getActiveFile()?.path ?? 'fakeRoot.js';
    if (!isAbsolute(parentPath)) {
      parentPath = join(this.vaultAbsolutePath ?? '', parentPath);
    }
    const parentFolder = dirname(parentPath);

    if (id.startsWith('./') || id.startsWith('../')) {
      return { resolvedId: join(parentFolder, id), resolvedType: ResolvedType.Path };
    }

    return { resolvedId: `${parentFolder}${MODULE_NAME_SEPARATOR}${id}`, resolvedType: ResolvedType.Module };
  }

  private resolveUrl(id: string): null | ResolveResult {
    if (!isUrl(id)) {
      return null;
    }

    const FILE_URL_PREFIX = 'file:///';
    if (id.toLowerCase().startsWith(FILE_URL_PREFIX)) {
      return { resolvedId: id.slice(FILE_URL_PREFIX.length), resolvedType: ResolvedType.Path };
    }

    if (id.toLowerCase().startsWith(Platform.resourcePathPrefix)) {
      return { resolvedId: id.slice(Platform.resourcePathPrefix.length), resolvedType: ResolvedType.Path };
    }

    return { resolvedId: id, resolvedType: ResolvedType.Url };
  }

  private wrapRequire(options: WrapRequireOptions): RequireExFn {
    function wrapped(id: string, requireOptions?: Partial<RequireOptions>): unknown {
      options.beforeRequire?.(id);
      const newOptions = { ...options.optionsToPrepend, ...requireOptions, ...options.optionsToAppend };
      return options.require(id, newOptions);
    }

    return Object.assign(
      wrapped,
      options.require,
      normalizeOptionalProperties<{ parentPath?: string }>({ parentPath: options.optionsToPrepend?.parentPath })
    ) as RequireExFn;
  }
}

export function extractCodeScript(md: string, path: string): ExtractCodeScriptResult {
  const processor = remark().use(remarkParse);
  const root = processor.parse(md);

  const codes: Code[] = [];

  visit(root, 'code', (code: Code) => {
    if (code.lang !== CODE_SCRIPT_BLOCK_LANGUAGE) {
      return;
    }

    codes.push(code);
  });

  codes.sort((a, b) => (a.position?.start.offset ?? 0) - (b.position?.start.offset ?? 0));

  if (codes.length === 0) {
    throw new Error(`No ${CODE_SCRIPT_BLOCK_LANGUAGE} code block found in '${path}'.`);
  }

  const codeScriptName = getCodeScriptName(md, path);

  if (!codeScriptName) {
    return { code: codes[0]?.value ?? '', codeScriptName: undefined };
  }

  const code = codes.find((c) => c.value.startsWith(`// codeScriptName: ${codeScriptName}\n`));
  if (!code) {
    throw new Error(`Code script with name ${codeScriptName} not found in '${path}'.`);
  }

  return { code: code.value, codeScriptName };
}

export function getModuleTypeFromPath(path: string): ModuleType {
  const ext = extname(splitQuery(path).cleanStr);
  switch (ext) {
    case '.cjs':
    case '.cts':
    case '.js':
    case '.mjs':
    case '.mts':
    case '.ts':
      return ModuleType.JsTs;
    case '.json':
      return ModuleType.Json;
    case '.md':
      return ModuleType.Markdown;
    case '.node':
      return ModuleType.Node;
    case '.wasm':
      return ModuleType.Wasm;
    default:
      throw new Error(`Unsupported file extension: '${ext}'.`);
  }
}

export function splitQuery(str: string): SplitQueryResult {
  const queryIndex = str.indexOf('?');
  return {
    cleanStr: queryIndex === -1 ? str : str.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : str.slice(queryIndex)
  };
}

function convertPathToObsidianUrl(path: string): string {
  if (!isAbsolute(path)) {
    return path;
  }

  return Platform.resourcePathPrefix + path.replaceAll('\\', '/');
}

function getCodeScriptName(md: string, path: string): string | undefined {
  const query = splitQuery(path).query;

  if (!query) {
    const settings = getCodeScriptToolkitNoteSettingsFromContent(md);
    return settings.defaultCodeScriptName;
  }

  const match = /^\?codeScriptName=(?<CodeScriptName>\S+)$/.exec(query);

  if (!match) {
    throw new Error(`Invalid query: '${query}'.`);
  }

  return match.groups?.['CodeScriptName'];
}

function getModuleTypeFromContentType(contentType: string | undefined, url: string): ModuleType {
  contentType ??= '';
  switch (contentType) {
    case 'application/javascript':
    case 'application/typescript':
      return ModuleType.JsTs;
    case 'application/json':
      return ModuleType.Json;
    case 'application/octet-stream':
      return ModuleType.Node;
    case 'application/wasm':
      return ModuleType.Wasm;
    case 'text/markdown':
      return ModuleType.Markdown;
    default:
      console.warn(`URL: ${url} returned unsupported content type: ${contentType}.
Assuming it's a JavaScript/TypeScript file.
Consider passing moduleType explicitly:

const module = await requireAsync(url, { moduleType: 'jsTs' });`);
      return ModuleType.JsTs;
  }
}
