import type { PackageJson } from 'obsidian-dev-utils/ScriptUtils/Npm';

import { FileSystemAdapter } from 'obsidian';
import {
  getPrototypeOf,
  normalizeOptionalProperties
} from 'obsidian-dev-utils/ObjectUtils';
import { registerPatch } from 'obsidian-dev-utils/obsidian/MonkeyAround';
import {
  dirname,
  join,
  toPosixPath
} from 'obsidian-dev-utils/Path';

import type { Plugin } from '../Plugin.ts';
import type {
  PluginRequireFn,
  RequireFn
} from '../RequireHandler.ts';
import type { RequireOptions } from '../types.ts';

import {
  ENTRY_POINT,
  extractCodeScript,
  getModuleTypeFromPath,
  MODULE_NAME_SEPARATOR,
  NODE_MODULES_FOLDER,
  PATH_SUFFIXES,
  PRIVATE_MODULE_PREFIX,
  RELATIVE_MODULE_PATH_SEPARATOR,
  RequireHandler,
  ResolvedType,
  SCOPED_MODULE_PREFIX,
  splitQuery
} from '../RequireHandler.ts';
import {
  CacheInvalidationMode,
  ModuleType
} from '../types.ts';

class RequireHandlerImpl extends RequireHandler {
  private _fs?: typeof import('node:fs');
  private _fsPromises?: typeof import('node:fs/promises');
  private originalModulePrototypeRequire?: RequireFn;

  private get fileSystemAdapter(): FileSystemAdapter {
    const adapter = this.plugin?.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error('Vault adapter is not a FileSystemAdapter.');
    }

    return adapter;
  }

  private get fs(): typeof import('node:fs') {
    if (this._fs) {
      return this._fs;
    }

    const fs = (this.originalModulePrototypeRequireWrapped('node:fs', {}) ?? this.fileSystemAdapter.fs) as typeof import('node:fs');
    this._fs = fs;
    return this._fs;
  }

  private get fsPromises(): typeof import('node:fs/promises') {
    if (this._fsPromises) {
      return this._fsPromises;
    }

    const fsPromises =
      (this.originalModulePrototypeRequireWrapped('node:fs/promises', {}) ?? this.fileSystemAdapter.fsPromises) as typeof import('node:fs/promises');
    this._fsPromises = fsPromises;
    return this._fsPromises;
  }

  public override async existsFileAsync(path: string): Promise<boolean> {
    return await Promise.resolve(this.existsFile(path));
  }

  public override async existsFolderAsync(path: string): Promise<boolean> {
    return await Promise.resolve(this.existsFolder(path));
  }

  public override async getTimestampAsync(path: string): Promise<number> {
    path = splitQuery(path).cleanStr;
    return (await this.fsPromises.stat(path)).mtimeMs;
  }

  public override async readFileAsync(path: string): Promise<string> {
    path = splitQuery(path).cleanStr;
    return await this.fsPromises.readFile(path, 'utf8');
  }

  public override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    path = splitQuery(path).cleanStr;
    const buffer = await this.fsPromises.readFile(path);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer;
  }

  public override register(plugin: Plugin, pluginRequire: PluginRequireFn): void {
    super.register(plugin, pluginRequire);

    const moduleProto = getPrototypeOf(window.module);
    registerPatch(plugin, moduleProto, {
      require: (next: RequireFn): RequireFn => {
        this.originalModulePrototypeRequire = next;
        const that = this;
        return function modulePrototypeRequirePatched(this: NodeJS.Module, id: string): unknown {
          return that.modulePrototypeRequire(id, this);
        };
      }
    });
  }

  public override async requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
    try {
      return await super.requireAsync(id, options);
    } catch (e) {
      if (this.plugin?.settings.shouldUseSyncFallback) {
        console.warn(`requireAsync('${id}') failed with error:`, e);
        console.warn('Trying a synchronous fallback.');
        this.currentModulesTimestampChain.clear();
        return this.requireEx(id, options ?? {});
      }

      throw e;
    }
  }

  protected override canRequireNonCached(type: ResolvedType): boolean {
    return type !== ResolvedType.Url;
  }

  protected override handleCodeWithTopLevelAwait(path: string): void {
    throw new Error(`Cannot load module: ${path}.
Top-level await is not supported in sync require.
Consider putting them inside an async function.
${this.getRequireAsyncAdvice(path)}`);
  }

  protected requireAsarPackedModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.originalModulePrototypeRequireWrapped(id, options);
  }

  protected override requireElectronModule(id: string, options: Partial<RequireOptions>): unknown {
    return this.originalModulePrototypeRequireWrapped(id, options);
  }

  protected override async requireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    await Promise.resolve();
    if (arrayBuffer) {
      const tempDir = join(this.plugin?.app.vault.configDir ?? '', 'temp');
      if (!this.existsFolder(tempDir)) {
        await this.fsPromises.mkdir(tempDir);
      }
      const tmpFilePath = join(tempDir, `${String(Date.now())}.node`);
      await this.writeFileBinaryAsync(tmpFilePath, arrayBuffer);
      try {
        return this.requireNodeBinary(tmpFilePath);
      } finally {
        await this.fsPromises.rm(tmpFilePath);
      }
    }

    return this.requireNodeBinary(path);
  }

  protected override requireNodeBuiltInModule(id: string): unknown {
    return this.originalModulePrototypeRequire?.(id);
  }

  protected override requireNonCached(id: string, type: ResolvedType, options: Partial<RequireOptions>): unknown {
    switch (type) {
      case ResolvedType.Module: {
        const [parentFolder = '', moduleName = ''] = id.split(MODULE_NAME_SEPARATOR);
        return this.requireModule(moduleName, parentFolder, options.cacheInvalidationMode, options.moduleType);
      }
      case ResolvedType.Path:
        return this.requirePath(id, options.cacheInvalidationMode, options.moduleType);
      case ResolvedType.SpecialModule:
        return this.requireSpecialModule(id, options);
      case ResolvedType.Url:
        throw new Error(`Cannot require synchronously from URL. ${this.getRequireAsyncAdvice(id)}`);
      default:
        throw new Error(`Unknown type: '${type as string}'.`);
    }
  }

  private existsFile(path: string): boolean {
    path = splitQuery(path).cleanStr;
    return this.fs.existsSync(path) && this.fs.statSync(path).isFile();
  }

  private existsFolder(path: string): boolean {
    path = splitQuery(path).cleanStr;
    return this.fs.existsSync(path) && this.fs.statSync(path).isDirectory();
  }

  private findExistingFilePath(path: string): null | string {
    for (const suffix of PATH_SUFFIXES) {
      const newPath = path + suffix;
      if (this.existsFile(newPath)) {
        return newPath;
      }
    }

    return null;
  }

  private getDependenciesTimestampChangedAndReloadIfNeeded(path: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): number {
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
    updateTimestamp(this.getTimestamp(path));
    const dependencies = this.moduleDependencies.get(path) ?? [];
    for (const dependency of dependencies) {
      const { resolvedId, resolvedType } = this.resolve(dependency, path);
      switch (resolvedType) {
        case ResolvedType.Module:
          for (const rootFolder of this.getRootFolders(path)) {
            const packageJsonPath = this.getPackageJsonPath(rootFolder);
            if (!this.existsFile(packageJsonPath)) {
              continue;
            }

            const dependencyTimestamp = this.getDependenciesTimestampChangedAndReloadIfNeeded(packageJsonPath, cacheInvalidationMode);
            updateTimestamp(dependencyTimestamp);
          }
          break;
        case ResolvedType.Path: {
          const existingFilePath = this.findExistingFilePath(resolvedId);
          if (existingFilePath === null) {
            continue;
          }

          const dependencyTimestamp = this.getDependenciesTimestampChangedAndReloadIfNeeded(existingFilePath, cacheInvalidationMode);
          updateTimestamp(dependencyTimestamp);
          break;
        }
        case ResolvedType.SpecialModule:
          break;
        case ResolvedType.Url: {
          const errorMessage = this.getUrlDependencyErrorMessage(path, resolvedId, cacheInvalidationMode);
          switch (cacheInvalidationMode) {
            case CacheInvalidationMode.Always:
              throw new Error(errorMessage);
            case CacheInvalidationMode.Never:
              break;
            case CacheInvalidationMode.WhenPossible:
              console.warn(errorMessage);
              break;
            default:
              throw new Error(`Unknown cacheInvalidationMode: '${cacheInvalidationMode as unknown as string}'.`);
          }
          break;
        }
        default:
          throw new Error(`Unknown type: '${resolvedType as string}'.`);
      }
    }

    if (timestamp > cachedTimestamp || !this.getCachedModule(path)) {
      this.initModuleAndAddToCache(path, () => this.requirePathImpl(path, moduleType));
    }
    return timestamp;
  }

  private getRootFolder(cwd: string): null | string {
    let currentFolder = toPosixPath(cwd);
    while (currentFolder !== '.' && currentFolder !== '/') {
      if (this.existsFile(join(currentFolder, 'package.json'))) {
        return toPosixPath(currentFolder);
      }
      currentFolder = dirname(currentFolder);
    }

    return null;
  }

  private getRootFolders(folder: string): string[] {
    const modulesRootFolder = this.plugin?.settings.modulesRoot ? join(this.vaultAbsolutePath ?? '', this.plugin.settings.modulesRoot) : null;

    const ans: string[] = [];
    for (const possibleFolder of new Set([folder, modulesRootFolder])) {
      if (possibleFolder === null) {
        continue;
      }

      const rootFolder = this.getRootFolder(possibleFolder);
      if (rootFolder === null) {
        continue;
      }

      ans.push(rootFolder);
    }

    return ans;
  }

  private getTimestamp(path: string): number {
    path = splitQuery(path).cleanStr;
    return this.fs.statSync(path).mtimeMs;
  }

  private getUrlDependencyErrorMessage(path: string, resolvedId: string, cacheInvalidationMode?: CacheInvalidationMode): string {
    return `Module ${path} depends on URL ${resolvedId}.
URL dependencies validation is not supported when cacheInvalidationMode=${cacheInvalidationMode ?? CacheInvalidationMode.WhenPossible}.
Consider using cacheInvalidationMode=${CacheInvalidationMode.Never}.
${this.getRequireAsyncAdvice(path)}`;
  }

  private modulePrototypeRequire(id: string, module: NodeJS.Module): unknown {
    /**
     * The caller line index is 6 because the call stack is as follows:
     *
     * 0: Error
     * 1:     at RequireHandlerImpl.getParentPathFromCallStack (plugin:fix-require-modules:?:?)
     * 2:     at RequireHandlerImpl.modulePrototypeRequire (plugin:fix-require-modules:?:?)
     * 3:     at Module.modulePrototypeRequirePatched (plugin:fix-require-modules:?:?)
     * 4:     at Module.wrapper [as require] (plugin:fix-require-modules:?:?)
     * 5:     at require (node:internal/modules/helpers:?:?)
     * 6:     at functionName (path/to/caller.js:?:?)
     */
    const CALLER_LINE_INDEX = 6;
    const parentPath = this.getParentPathFromCallStack(CALLER_LINE_INDEX) ?? undefined;
    const options = normalizeOptionalProperties<RequireOptions>({
      parentModule: module,
      parentPath
    });
    return this.requireEx(id, options);
  }

  private originalModulePrototypeRequireWrapped(id: string, options: Partial<RequireOptions>): unknown {
    const module = options.parentModule ?? window.module;
    return this.originalModulePrototypeRequire?.call(module, id, options);
  }

  private readFile(path: string): string {
    path = splitQuery(path).cleanStr;
    return this.fs.readFileSync(path, 'utf8');
  }

  private readPackageJson(path: string): PackageJson {
    path = splitQuery(path).cleanStr;
    const content = this.readFile(path);
    return JSON.parse(content) as PackageJson;
  }

  private requireJson(path: string): unknown {
    path = splitQuery(path).cleanStr;
    const jsonStr = this.readFile(path);
    return JSON.parse(jsonStr);
  }

  private requireJsTs(path: string): unknown {
    path = splitQuery(path).cleanStr;
    const code = this.readFile(path);
    return this.requireString(code, path);
  }

  private requireMd(path: string): unknown {
    const md = this.readFile(path);
    const { code, codeScriptName } = extractCodeScript(md, path);
    return this.requireString(code, `${path}.code-script.${codeScriptName ?? '(default)'}.ts`);
  }

  private requireModule(moduleName: string, parentFolder: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): unknown {
    let separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR);

    if (moduleName.startsWith(SCOPED_MODULE_PREFIX)) {
      if (separatorIndex === -1) {
        throw new Error(`Invalid scoped module name: '${moduleName}'.`);
      }
      separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR, separatorIndex + 1);
    }

    const baseModuleName = separatorIndex === -1 ? moduleName : moduleName.slice(0, separatorIndex);
    let relativeModuleName = ENTRY_POINT + (separatorIndex === -1 ? '' : moduleName.slice(separatorIndex));

    for (const rootFolder of this.getRootFolders(parentFolder)) {
      let packageFolder: string;
      if (moduleName.startsWith(PRIVATE_MODULE_PREFIX) || moduleName === ENTRY_POINT) {
        packageFolder = rootFolder;
        relativeModuleName = moduleName;
      } else {
        packageFolder = join(rootFolder, NODE_MODULES_FOLDER, baseModuleName);
      }

      if (!this.existsFolder(packageFolder)) {
        continue;
      }

      const packageJsonPath = this.getPackageJsonPath(packageFolder);
      if (!this.existsFile(packageJsonPath)) {
        continue;
      }

      const packageJson = this.readPackageJson(packageJsonPath);
      const relativeModulePaths = this.getRelativeModulePaths(packageJson, relativeModuleName);

      for (const relativeModulePath of relativeModulePaths) {
        const fullModulePath = join(packageFolder, relativeModulePath);
        const existingPath = this.findExistingFilePath(fullModulePath);
        if (!existingPath) {
          continue;
        }

        return this.requirePath(existingPath, cacheInvalidationMode, moduleType);
      }
    }

    throw new Error(`Could not resolve module: '${moduleName}'.`);
  }

  private requireNodeBinary(path: string): unknown {
    return this.originalModulePrototypeRequire?.(path);
  }

  private requirePath(path: string, cacheInvalidationMode?: CacheInvalidationMode, moduleType?: ModuleType): unknown {
    const existingFilePath = this.findExistingFilePath(path);
    if (existingFilePath === null) {
      throw new Error(`File not found: '${path}'.`);
    }

    const isRootRequire = this.currentModulesTimestampChain.size === 0;

    try {
      this.getDependenciesTimestampChangedAndReloadIfNeeded(existingFilePath, cacheInvalidationMode, moduleType);
    } finally {
      if (isRootRequire) {
        this.currentModulesTimestampChain.clear();
      }
    }
    return this.modulesCache[existingFilePath]?.exports;
  }

  private requirePathImpl(path: string, moduleType?: ModuleType): unknown {
    moduleType ??= getModuleTypeFromPath(path);
    switch (moduleType) {
      case ModuleType.Json:
        return this.requireJson(path);
      case ModuleType.JsTs:
        return this.requireJsTs(path);
      case ModuleType.Markdown:
        return this.requireMd(path);
      case ModuleType.Node:
        return this.requireNodeBinary(path);
      case ModuleType.Wasm:
        return this.requireWasm(path);
      default:
        throw new Error(`Unknown module type: '${moduleType as string}'.`);
    }
  }

  private requireString(code: string, path: string): unknown {
    try {
      return this.initModuleAndAddToCache(path, () => {
        const result = this.requireStringImpl({
          code,
          evalPrefix: 'requireString',
          path,
          shouldWrapInAsyncFunction: false,
          urlSuffix: ''
        });
        return result.exportsFn();
      });
    } catch (e) {
      throw new Error(`Failed to load module: ${path}`, { cause: e });
    }
  }

  private requireWasm(path: string): unknown {
    throw new Error(`Cannot require WASM synchronously. ${this.getRequireAsyncAdvice(path)}`);
  }

  private async writeFileBinaryAsync(path: string, arrayBuffer: ArrayBuffer): Promise<void> {
    path = splitQuery(path).cleanStr;
    const buffer = Buffer.from(arrayBuffer);
    await this.fsPromises.writeFile(path, buffer);
  }
}

export const requireHandler = new RequireHandlerImpl();
