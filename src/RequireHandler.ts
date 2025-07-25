import type { Code } from 'mdast';
import type { PackageJson } from 'obsidian-dev-utils/ScriptUtils/Npm';
import type { Promisable } from 'type-fest';

import { debuggableEval } from 'debuggable-eval';
import {
  Platform,
  requestUrl
} from 'obsidian';
import { noop } from 'obsidian-dev-utils/Function';
import { normalizeOptionalProperties } from 'obsidian-dev-utils/Object';
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
import { isUrl } from 'obsidian-dev-utils/url';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

import type { Plugin } from './Plugin.ts';

import { SequentialBabelPlugin } from './babel/CombineBabelPlugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/ConvertToCommonJsBabelPlugin.ts';
import { ExtractRequireArgsListBabelPlugin } from './babel/ExtractRequireArgsListBabelPlugin.ts';
import { FixSourceMapBabelPlugin } from './babel/FixSourceMapBabelPlugin.ts';
import { WrapInRequireFunctionBabelPlugin } from './babel/WrapInRequireFunctionBabelPlugin.ts';
import { builtInModuleNames } from './BuiltInModuleNames.ts';
import {
  CachedModuleProxyHandler,
  EMPTY_MODULE_SYMBOL
} from './CachedModuleProxyHandler.ts';
import { CacheInvalidationMode } from './CacheInvalidationMode.ts';
import { CODE_SCRIPT_BLOCK_LANGUAGE } from './CodeScriptBlock.ts';
import { getCodeScriptToolkitNoteSettingsFromContent } from './CodeScriptToolkitNoteSettings.ts';

export enum ResolvedType {
  Module = 'module',
  Path = 'path',
  Url = 'url'
}

export type ModuleType = 'json' | 'jsTs' | 'md' | 'node' | 'wasm';
export type PluginRequireFn = (id: string) => unknown;
export type RequireAsyncWrapperFn = (requireFn: RequireAsyncWrapperArg) => Promise<unknown>;
export type RequireFn = (id: string, options?: Partial<RequireOptions>) => unknown;

export interface RequireOptions {
  cacheInvalidationMode: CacheInvalidationMode;
  moduleType?: ModuleType;
  parentPath?: string;
}

interface EmptyModule {
  [EMPTY_MODULE_SYMBOL]: boolean;
}

interface ExtractCodeScriptResult {
  code: string;
  codeScriptName: string | undefined;
}

type ModuleFnWrapper = (
  require: NodeJS.Require,
  module: { exports: unknown },
  exports: unknown,
  requireAsyncWrapper: RequireAsyncWrapperFn
) => Promisable<void>;
type RequireAsyncFn = (id: string, options?: Partial<RequireOptions>) => Promise<unknown>;
type RequireAsyncWrapperArg = (require: RequireExFn) => Promisable<unknown>;
type RequireExFn = { parentPath?: string } & NodeJS.Require & RequireFn;

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
  beforeRequire?(id: string): void;
  optionsToAppend?: Partial<RequireOptions>;
  optionsToPrepend?: Partial<RequireOptions>;
  require: RequireExFn;
}

export const ENTRY_POINT = '.';
export const EXTENSIONS = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.md'];
export const MODULE_NAME_SEPARATOR = '*';
export const MODULE_TO_SKIP = Symbol('MODULE_TO_SKIP');
const NODE_BUILTIN_MODULE_PREFIX = 'node:';
export const NODE_MODULES_FOLDER = 'node_modules';
const PACKAGE_JSON = 'package.json';
export const PATH_SUFFIXES = ['', ...EXTENSIONS, ...EXTENSIONS.map((ext) => `/index${ext}`)];
export const PRIVATE_MODULE_PREFIX = '#';
export const RELATIVE_MODULE_PATH_SEPARATOR = '/';
export const SCOPED_MODULE_PREFIX = '@';
const WILDCARD_MODULE_CONDITION_SUFFIX = '/*';
export const VAULT_ROOT_PREFIX = '//';

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

export abstract class RequireHandler {
  protected readonly currentModulesTimestampChain = new Set<string>();
  protected readonly moduleDependencies = new Map<string, Set<string>>();
  protected modulesCache!: NodeJS.Dict<NodeJS.Module>;
  protected readonly moduleTimestamps = new Map<string, number>();
  protected plugin!: Plugin;
  protected requireEx!: RequireExFn;
  protected vaultAbsolutePath!: string;
  private originalRequire!: NodeJS.Require;
  private pluginRequire!: PluginRequireFn;

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

  public register(plugin: Plugin, pluginRequire: PluginRequireFn): void {
    this.plugin = plugin;
    this.pluginRequire = pluginRequire;
    this.vaultAbsolutePath = toPosixPath(plugin.app.vault.adapter.basePath);
    this.originalRequire = window.require;

    this.requireEx = Object.assign(this.require.bind(this), {
      cache: {}
    }, this.originalRequire) as RequireExFn;
    this.modulesCache = this.requireEx.cache;

    const requireWindow = window as Partial<RequireWindow>;

    requireWindow.require = this.requireEx;
    plugin.register(() => {
      requireWindow.require = this.originalRequire;
    });

    requireWindow.requireAsync = this.requireAsync.bind(this);
    plugin.register(() => delete requireWindow.requireAsync);

    requireWindow.requireAsyncWrapper = this.requireAsyncWrapper.bind(this);
    plugin.register(() => delete requireWindow.requireAsyncWrapper);
  }

  public async requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
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
      if (specialModule === MODULE_TO_SKIP) {
        return null;
      }
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
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}`);
        return cachedModuleEntry.exports;
      }

      if (this.currentModulesTimestampChain.has(resolvedId)) {
        return cachedModuleEntry.exports;
      }

      switch (fullOptions.cacheInvalidationMode) {
        case CacheInvalidationMode.Never:
          return cachedModuleEntry.exports;
        case CacheInvalidationMode.WhenPossible:
          if (query) {
            return cachedModuleEntry.exports;
          }
          break;
        default:
          throw new Error('Unknown cacheInvalidationMode');
      }
    }

    if (cleanResolvedId.endsWith('.md')) {
      return await this.initModuleAndAddToCacheAsync(
        resolvedId,
        () => this.requireNonCachedAsync(resolvedId, resolvedType, fullOptions.cacheInvalidationMode, fullOptions.moduleType)
      );
    }

    const module = await this.initModuleAndAddToCacheAsync(
      cleanResolvedId,
      () => this.requireNonCachedAsync(cleanResolvedId, resolvedType, fullOptions.cacheInvalidationMode, fullOptions.moduleType)
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
      throw new Error(`Failed to load module: ${path}`, { cause: e });
    }
  }

  protected abstract canRequireNonCached(type: ResolvedType): boolean;

  protected abstract existsFileAsync(path: string): Promise<boolean>;

  protected abstract existsFolderAsync(path: string): Promise<boolean>;

  protected getCachedModule(id: string): unknown {
    return this.modulesCache[id]?.loaded ? this.modulesCache[id].exports : null;
  }

  protected getPackageJsonPath(packageFolder: string): string {
    return join(packageFolder, PACKAGE_JSON);
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

  protected async initModuleAndAddToCacheAsync(id: string, moduleInitializer: () => Promise<unknown>): Promise<unknown> {
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

  protected isJson(path: string): boolean {
    return splitQuery(path).cleanStr.endsWith('.json');
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
  protected abstract readFileBinaryAsync(path: string): Promise<ArrayBuffer>;

  protected async requireAsyncWrapper(requireFn: (require: RequireExFn) => Promisable<unknown>, require?: RequireExFn): Promise<unknown> {
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
      optionsToAppend: { cacheInvalidationMode: CacheInvalidationMode.Never },
      require: require ?? this.requireEx
    }));
  }

  protected abstract requireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown>;

  protected abstract requireNonCached(id: string, type: ResolvedType, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): unknown;

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

  protected requireStringImpl(options: RequireStringImplOptions): RequireStringImplResult {
    const folder = isUrl(options.path) ? '' : dirname(options.path);
    const filename = isUrl(options.path) ? options.path : basename(options.path);
    const url = convertPathToObsidianUrl(options.path) + options.urlSuffix;

    const transformResult = new SequentialBabelPlugin([
      new ConvertToCommonJsBabelPlugin(),
      new WrapInRequireFunctionBabelPlugin(options.shouldWrapInAsyncFunction),
      new FixSourceMapBabelPlugin(url)
    ]).transform(options.code, filename, folder);

    if (transformResult.error) {
      throw new Error(`Failed to transform code from: ${options.path}`, { cause: transformResult.error });
    }

    if (transformResult.data.hasTopLevelAwait) {
      this.handleCodeWithTopLevelAwait(options.path);
    }

    const moduleFnWrapper = debuggableEval(transformResult.transformedCode, `${options.evalPrefix}/${options.path}${options.urlSuffix}`) as ModuleFnWrapper;
    const module = { exports: {} };
    const childRequire = this.makeChildRequire(options.path);
    // eslint-disable-next-line import-x/no-commonjs
    const promisable = moduleFnWrapper(childRequire, module, module.exports, this.requireAsyncWrapper.bind(this));
    return {
      // eslint-disable-next-line import-x/no-commonjs
      exportsFn: () => module.exports,
      promisable
    };
  }

  protected resolve(id: string, parentPath?: string): ResolveResult {
    id = toPosixPath(id);

    if (id.startsWith(NODE_BUILTIN_MODULE_PREFIX)) {
      return { resolvedId: id, resolvedType: ResolvedType.Path };
    }

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
      return { resolvedId: `/${trimStart(id, SYSTEM_ROOT_PATH_PREFIX)}`, resolvedType: ResolvedType.Path };
    }

    const MODULES_ROOT_PATH_PREFIX = '/';
    if (id.startsWith(MODULES_ROOT_PATH_PREFIX)) {
      return {
        resolvedId: join(this.vaultAbsolutePath, this.plugin.settings.modulesRoot, trimStart(id, MODULES_ROOT_PATH_PREFIX)),
        resolvedType: ResolvedType.Path
      };
    }

    if (isAbsolute(id)) {
      return { resolvedId: id, resolvedType: ResolvedType.Path };
    }

    parentPath = parentPath ? toPosixPath(parentPath) : this.getParentPathFromCallStack() ?? this.plugin.app.workspace.getActiveFile()?.path ?? 'fakeRoot.js';
    if (!isAbsolute(parentPath)) {
      parentPath = join(this.vaultAbsolutePath, parentPath);
    }
    const parentFolder = dirname(parentPath);

    if (id.startsWith('./') || id.startsWith('../')) {
      return { resolvedId: join(parentFolder, id), resolvedType: ResolvedType.Path };
    }

    return { resolvedId: `${parentFolder}${MODULE_NAME_SEPARATOR}${id}`, resolvedType: ResolvedType.Module };
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
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
    cacheInvalidationMode: CacheInvalidationMode,
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
            throw new Error(`File not found: ${resolvedId}`);
          }

          const dependencyTimestamp = await this.getDependenciesTimestampChangedAndReloadIfNeededAsync(existingFilePath, cacheInvalidationMode);
          updateTimestamp(dependencyTimestamp);
          break;
        }
        case ResolvedType.Url: {
          if (cacheInvalidationMode !== CacheInvalidationMode.Never) {
            updateTimestamp(Date.now());
          }
          break;
        }
        default:
          throw new Error('Unknown resolvedType');
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

    if (!Array.isArray(exportsNode)) {
      const conditions = exportsNode;
      return Object.entries(conditions)
        .flatMap(([condition, exportsNodeChild]) => this.applyCondition(condition, exportsNodeChild, relativeModuleName));
    }

    const arr = exportsNode;
    return arr.flatMap((exportsNodeChild) => this.getExportsRelativeModulePaths(exportsNodeChild, relativeModuleName));
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
    this.plugin.consoleDebug('callStackLines', { callStackLines });
    const callStackMatch = callStackLines.at(CALLER_LINE_INDEX)?.match(/^ {4}at .+? \((?<ParentPath>.+?):\d+:\d+\)$/);
    const parentPath = callStackMatch?.groups?.['ParentPath'] ?? null;

    if (parentPath?.includes('<anonymous>')) {
      return null;
    }

    return parentPath;
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
    const modulesRootFolder = this.plugin.settings.modulesRoot ? join(this.vaultAbsolutePath, this.plugin.settings.modulesRoot) : null;

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

  private isEmptyModule(module: unknown): boolean {
    return (module as Partial<EmptyModule> | undefined)?.[EMPTY_MODULE_SYMBOL] === true;
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
    const cleanId = splitQuery(id).cleanStr;
    const specialModule = this.requireSpecialModule(cleanId);
    if (specialModule) {
      if (specialModule === MODULE_TO_SKIP) {
        return null;
      }
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
        console.warn(`Circular dependency detected: ${resolvedId} -> ... -> ${fullOptions.parentPath ?? ''} -> ${resolvedId}`);
        return cachedModuleEntry.exports;
      }

      if (this.currentModulesTimestampChain.has(resolvedId)) {
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
          break;
        default:
          throw new Error('Unknown cacheInvalidationMode');
      }
    }

    if (!this.canRequireNonCached(resolvedType)) {
      throw new Error(`Cannot require '${resolvedId}' synchronously.
${this.getRequireAsyncAdvice(true)}`);
    }

    if (cleanResolvedId.endsWith('.md')) {
      return this.initModuleAndAddToCache(
        resolvedId,
        () => this.requireNonCached(resolvedId, resolvedType, fullOptions.cacheInvalidationMode, fullOptions.moduleType)
      );
    }
    const module = this.initModuleAndAddToCache(
      cleanResolvedId,
      () => this.requireNonCached(cleanResolvedId, resolvedType, fullOptions.cacheInvalidationMode, fullOptions.moduleType)
    );
    if (resolvedId !== cleanResolvedId) {
      this.initModuleAndAddToCache(resolvedId, () => module);
    }
    return module;
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
    cacheInvalidationMode: CacheInvalidationMode,
    moduleType?: ModuleType
  ): Promise<unknown> {
    let separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR);

    if (moduleName.startsWith(SCOPED_MODULE_PREFIX)) {
      if (separatorIndex === -1) {
        throw new Error(`Invalid scoped module name: ${moduleName}`);
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

    throw new Error(`Could not resolve module: ${moduleName}`);
  }

  private async requireNonCachedAsync(id: string, type: ResolvedType, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): Promise<unknown> {
    switch (type) {
      case ResolvedType.Module: {
        const [parentFolder = '', moduleName = ''] = id.split(MODULE_NAME_SEPARATOR);
        return await this.requireModuleAsync(moduleName, parentFolder, cacheInvalidationMode, moduleType);
      }
      case ResolvedType.Path:
        return await this.requirePathAsync(id, cacheInvalidationMode, moduleType);
      case ResolvedType.Url:
        return await this.requireUrlAsync(id, moduleType);
      default:
        throw new Error('Unknown resolvedType');
    }
  }

  private async requirePathAsync(path: string, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): Promise<unknown> {
    const existingFilePath = await this.findExistingFilePathAsync(path);
    if (existingFilePath === null) {
      throw new Error(`File not found: ${path}`);
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
      case 'json':
        return this.requireJsonAsync(path);
      case 'jsTs':
        return this.requireJsTsAsync(path);
      case 'md':
        return this.requireMdAsync(path);
      case 'node':
        return this.requireNodeBinaryAsync(path);
      case 'wasm':
        return this.requireWasmAsync(path);
      default:
        throw new Error(`Unknown module type: ${moduleType as string}`);
    }
  }

  private async requireUrlAsync(url: string, moduleType?: ModuleType): Promise<unknown> {
    const response = await requestUrl(url);
    moduleType ??= getModuleTypeFromContentType(response.headers['content-type'], url);

    switch (moduleType) {
      case 'json':
        return this.requireJsonAsync(url, response.text);
      case 'jsTs':
        return this.requireJsTsAsync(url, response.text);
      case 'md':
        return this.requireMdAsync(url, response.text);
      case 'node':
        return this.requireNodeBinaryAsync(url, response.arrayBuffer);
      case 'wasm':
        return this.requireWasmAsync(url, response.arrayBuffer);
      default:
        throw new Error(`Unknown module type: ${moduleType as string}`);
    }
  }

  private async requireWasmAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    arrayBuffer ??= await this.readFileBinaryAsync(path);
    const wasm = await WebAssembly.instantiate(arrayBuffer);
    return wasm.instance.exports;
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
    throw new Error(`No ${CODE_SCRIPT_BLOCK_LANGUAGE} code block found in ${path}`);
  }

  const codeScriptName = getCodeScriptName(md, path);

  if (!codeScriptName) {
    return { code: codes[0]?.value ?? '', codeScriptName: undefined };
  }

  const code = codes.find((c) => c.value.startsWith(`// codeScriptName: ${codeScriptName}\n`));
  if (!code) {
    throw new Error(`Code script with name ${codeScriptName} not found in ${path}`);
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
      return 'jsTs';
    case '.json':
      return 'json';
    case '.md':
      return 'md';
    case '.node':
      return 'node';
    case '.wasm':
      return 'wasm';
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

export function splitQuery(str: string): SplitQueryResult {
  const queryIndex = str.indexOf('?');
  return {
    cleanStr: queryIndex === -1 ? str : str.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : str.slice(queryIndex)
  };
}

export function trimNodePrefix(id: string): string {
  return trimStart(id, NODE_BUILTIN_MODULE_PREFIX);
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
    throw new Error(`Invalid query: ${query}`);
  }

  return match.groups?.['CodeScriptName'];
}

function getModuleTypeFromContentType(contentType: string | undefined, url: string): ModuleType {
  contentType ??= '';
  switch (contentType) {
    case 'application/javascript':
    case 'application/typescript':
      return 'jsTs';
    case 'application/json':
      return 'json';
    case 'application/octet-stream':
      return 'node';
    case 'application/wasm':
      return 'wasm';
    case 'text/markdown':
      return 'md';
    default:
      console.warn(`URL: ${url} returned unsupported content type: ${contentType}.
Assuming it's a JavaScript/TypeScript file.
Consider passing moduleType explicitly:

const module = await requireAsync(url, { moduleType: 'jsTs' });`);
      return 'jsTs';
  }
}
