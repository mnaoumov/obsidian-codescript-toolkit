import type { PackageJson } from 'obsidian-dev-utils/ScriptUtils/Npm';

import { FileSystemAdapter } from 'obsidian';
import { join } from 'obsidian-dev-utils/Path';
import { tmpdir } from 'obsidian-dev-utils/ScriptUtils/NodeModules';
import { getRootDir } from 'obsidian-dev-utils/ScriptUtils/Root';

import type { CodeScriptToolkitPlugin } from '../CodeScriptToolkitPlugin.ts';
import type {
  ModuleType,
  PluginRequireFn,
  RequireOptions
} from '../RequireHandler.ts';

import { CacheInvalidationMode } from '../CacheInvalidationMode.ts';
import {
  ENTRY_POINT,
  getModuleTypeFromPath,
  MODULE_NAME_SEPARATOR,
  NODE_MODULES_DIR,
  PATH_SUFFIXES,
  PRIVATE_MODULE_PREFIX,
  RELATIVE_MODULE_PATH_SEPARATOR,
  RequireHandler,
  ResolvedType,
  SCOPED_MODULE_PREFIX,
  splitQuery,
  trimNodePrefix
} from '../RequireHandler.ts';

class RequireHandlerImpl extends RequireHandler {
  private electronModules = new Map<string, unknown>();
  private nodeBuiltinModules = new Set<string>();
  private originalProtoRequire!: NodeJS.Require;
  private get fileSystemAdapter(): FileSystemAdapter {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error('Vault adapter is not a FileSystemAdapter');
    }

    return adapter;
  }

  public override register(plugin: CodeScriptToolkitPlugin, pluginRequire: PluginRequireFn): void {
    super.register(plugin, pluginRequire);

    const Module = this.originalRequire('node:module') as typeof import('node:module');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.originalProtoRequire = Module.prototype.require as NodeJS.Require;

    plugin.register(() => {
      Module.prototype.require = this.originalProtoRequire;
    });

    Module.prototype.require = this.requireEx;

    for (const [key, value] of Object.entries(this.originalRequire.cache)) {
      if ((key.startsWith('electron') || key.includes('app.asar')) && value?.exports) {
        this.electronModules.set(key, value.exports);
      }
    }

    this.nodeBuiltinModules = new Set(Module.builtinModules);
  }

  public override async requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
    try {
      return await super.requireAsync(id, options);
    } catch (e) {
      if (this.plugin.settings.shouldUseSyncFallback) {
        console.warn(`requireAsync('${id}') failed with error:`, e);
        console.warn('Trying a synchronous fallback');
        this.currentModulesTimestampChain.clear();
        return this.requireEx(id, options ?? {});
      }

      throw e;
    }
  }

  protected override canRequireNonCached(type: ResolvedType): boolean {
    return type !== ResolvedType.Url;
  }

  protected override async existsDirectoryAsync(path: string): Promise<boolean> {
    return await Promise.resolve(this.existsDirectory(path));
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    return await Promise.resolve(this.existsFile(path));
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    return (await this.fileSystemAdapter.fsPromises.stat(path)).mtimeMs;
  }

  protected override handleCodeWithTopLevelAwait(path: string): void {
    throw new Error(`Cannot load module: ${path}.
Top-level await is not supported in sync require.
Put them inside an async function or ${this.getRequireAsyncAdvice()}`);
  }

  protected override async readFileAsync(path: string): Promise<string> {
    return await this.fileSystemAdapter.fsPromises.readFile(path, 'utf8');
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    const buffer = await this.fileSystemAdapter.fsPromises.readFile(path);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer as ArrayBuffer;
  }

  protected override async requireNodeBinaryAsync(path: string, arrayBuffer?: ArrayBuffer): Promise<unknown> {
    await Promise.resolve();
    if (arrayBuffer) {
      const tmpFilePath = join(tmpdir(), `${Date.now().toString()}.node`);
      await this.writeFileBinaryAsync(tmpFilePath, arrayBuffer);
      try {
        return this.requireNodeBinary(tmpFilePath);
      } finally {
        await this.fileSystemAdapter.remove(tmpFilePath);
      }
    }

    return this.requireNodeBinary(path);
  }

  protected override requireNonCached(id: string, type: ResolvedType, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): unknown {
    switch (type) {
      case ResolvedType.Module: {
        const [parentDir = '', moduleName = ''] = id.split(MODULE_NAME_SEPARATOR);
        return this.requireModule(moduleName, parentDir, cacheInvalidationMode, moduleType);
      }
      case ResolvedType.Path:
        return this.requirePath(id, cacheInvalidationMode, moduleType);
      case ResolvedType.Url:
        throw new Error(`Cannot require synchronously from URL. ${this.getRequireAsyncAdvice(true)}`);
      default:
        throw new Error(`Unknown type: ${type as string}`);
    }
  }

  protected override requireSpecialModule(id: string): unknown {
    return super.requireSpecialModule(id) ?? this.electronModules.get(id) ?? this.requireNodeBuiltinModule(id);
  }

  private existsDirectory(path: string): boolean {
    return this.fileSystemAdapter.fs.existsSync(path) && this.fileSystemAdapter.fs.statSync(path).isDirectory();
  }

  private existsFile(path: string): boolean {
    return this.fileSystemAdapter.fs.existsSync(path) && this.fileSystemAdapter.fs.statSync(path).isFile();
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

  private getDependenciesTimestampChangedAndReloadIfNeeded(path: string, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): number {
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
          for (const rootDir of this.getRootDirs(path)) {
            const packageJsonPath = this.getPackageJsonPath(rootDir);
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
        case ResolvedType.Url: {
          const errorMessage = this.getUrlDependencyErrorMessage(path, resolvedId, cacheInvalidationMode);
          switch (cacheInvalidationMode) {
            case CacheInvalidationMode.Always:
              throw new Error(errorMessage);
            case CacheInvalidationMode.WhenPossible:
              console.warn(errorMessage);
              break;
            default:
              throw new Error('Unknown cacheInvalidationMode');
          }
          break;
        }
        default:
          throw new Error('Unknown type');
      }
    }

    if (timestamp > cachedTimestamp || !this.getCachedModule(path)) {
      this.initModuleAndAddToCache(path, () => this.requirePathImpl(path, moduleType));
    }
    return timestamp;
  }

  private getRootDirs(dir: string): string[] {
    const modulesRootDir = this.plugin.settings.modulesRoot ? join(this.vaultAbsolutePath, this.plugin.settings.modulesRoot) : null;

    const ans: string[] = [];
    for (const possibleDir of new Set([dir, modulesRootDir])) {
      if (possibleDir === null) {
        continue;
      }

      const rootDir = getRootDir(possibleDir);
      if (rootDir === null) {
        continue;
      }

      ans.push(rootDir);
    }

    return ans;
  }

  private getTimestamp(path: string): number {
    return this.fileSystemAdapter.fs.statSync(path).mtimeMs;
  }

  private getUrlDependencyErrorMessage(path: string, resolvedId: string, cacheInvalidationMode: CacheInvalidationMode): string {
    return `Module ${path} depends on URL ${resolvedId}.
URL dependencies validation is not supported when cacheInvalidationMode=${cacheInvalidationMode}.
Consider using cacheInvalidationMode=${CacheInvalidationMode.Never} or ${this.getRequireAsyncAdvice()}`;
  }

  private readFile(path: string): string {
    return this.fileSystemAdapter.fs.readFileSync(path, 'utf8');
  }

  private readPackageJson(path: string): PackageJson {
    const content = this.readFile(path);
    return JSON.parse(content) as PackageJson;
  }

  private requireJson(path: string): unknown {
    const jsonStr = this.readFile(splitQuery(path).cleanStr);
    return JSON.parse(jsonStr);
  }

  private requireJsTs(path: string): unknown {
    const code = this.readFile(splitQuery(path).cleanStr);
    return this.requireString(code, path);
  }

  private requireModule(moduleName: string, parentDir: string, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): unknown {
    let separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR);

    if (moduleName.startsWith(SCOPED_MODULE_PREFIX)) {
      if (separatorIndex === -1) {
        throw new Error(`Invalid scoped module name: ${moduleName}`);
      }
      separatorIndex = moduleName.indexOf(RELATIVE_MODULE_PATH_SEPARATOR, separatorIndex + 1);
    }

    const baseModuleName = separatorIndex === -1 ? moduleName : moduleName.slice(0, separatorIndex);
    let relativeModuleName = ENTRY_POINT + (separatorIndex === -1 ? '' : moduleName.slice(separatorIndex));

    for (const rootDir of this.getRootDirs(parentDir)) {
      let packageDir: string;
      if (moduleName.startsWith(PRIVATE_MODULE_PREFIX) || moduleName === ENTRY_POINT) {
        packageDir = rootDir;
        relativeModuleName = moduleName;
      } else {
        packageDir = join(rootDir, NODE_MODULES_DIR, baseModuleName);
      }

      if (!this.existsDirectory(packageDir)) {
        continue;
      }

      const packageJsonPath = this.getPackageJsonPath(packageDir);
      if (!this.existsFile(packageJsonPath)) {
        continue;
      }

      const packageJson = this.readPackageJson(packageJsonPath);
      const relativeModulePaths = this.getRelativeModulePaths(packageJson, relativeModuleName);

      for (const relativeModulePath of relativeModulePaths) {
        const fullModulePath = join(packageDir, relativeModulePath);
        const existingPath = this.findExistingFilePath(fullModulePath);
        if (!existingPath) {
          continue;
        }

        return this.requirePath(existingPath, cacheInvalidationMode, moduleType);
      }
    }

    throw new Error(`Could not resolve module: ${moduleName}`);
  }

  private requireNodeBinary(path: string): unknown {
    return this.originalProtoRequire(path) as unknown;
  }

  private requireNodeBuiltinModule(id: string): unknown {
    id = trimNodePrefix(id);
    if (this.nodeBuiltinModules.has(id)) {
      return this.originalProtoRequire(id);
    }

    return null;
  }

  private requirePath(path: string, cacheInvalidationMode: CacheInvalidationMode, moduleType?: ModuleType): unknown {
    const existingFilePath = this.findExistingFilePath(path);
    if (existingFilePath === null) {
      throw new Error(`File not found: ${path}`);
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
      case 'json':
        return this.requireJson(path);
      case 'jsTs':
        return this.requireJsTs(path);
      case 'node':
        return this.requireNodeBinary(path);
      case 'wasm':
        return this.requireWasm();
      default:
        throw new Error(`Unknown module type: ${moduleType as string}`);
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

  private requireWasm(): unknown {
    throw new Error(`Cannot require WASM synchronously. ${this.getRequireAsyncAdvice(true)}`);
  }

  private async writeFileBinaryAsync(path: string, arrayBuffer: ArrayBuffer): Promise<void> {
    const buffer = Buffer.from(arrayBuffer);
    await this.fileSystemAdapter.fsPromises.writeFile(path, buffer);
  }
}

export const requireHandler = new RequireHandlerImpl();
