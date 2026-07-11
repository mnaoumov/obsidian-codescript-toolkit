import type { TFile } from 'obsidian';
import type { Promisable } from 'type-fest';

/**
 * A cache invalidation mode.
 */
export enum CacheInvalidationMode {
  /**
   * Always invalidate the cache.
   */
  Always = 'always',

  /**
   * Never invalidate the cache.
   */
  Never = 'never',

  /**
   * Invalidate the cache when possible.
   */
  WhenPossible = 'whenPossible'
}

/**
 * A type of the module to require.
 */
export enum ModuleType {
  /**
   * A JSON module.
   */
  Json = 'json',

  /**
   * A JavaScript/TypeScript module.
   */
  JsTs = 'jsTs',

  /**
   * A Markdown module.
   */
  Markdown = 'md',

  /**
   * A Node module.
   */
  Node = 'node',

  /**
   * A WebAssembly module.
   */
  Wasm = 'wasm'
}

/**
 * Options for the parent path.
 */
export interface ParentPathOptions {
  readonly parentPath?: string;
}

/**
 * An extended require function.
 */
export type RequireExFn =
  & NodeJS.Require
  & ParentPathOptions
  & typeof require;

/**
 * Options for the require function.
 */
export interface RequireOptions {
  /**
   * A cache invalidation mode.
   */
  readonly cacheInvalidationMode?: CacheInvalidationMode;

  /**
   * A type of the module to require.
   */
  readonly moduleType?: ModuleType;

  /**
   * A parent module.
   */
  readonly parentModule?: NodeJS.Module;

  /**
   * A parent path of the module to require.
   */
  readonly parentPath?: string;

  /**
   * Whether to transpile the module through Babel before executing it.
   *
   * Leave unset to auto-detect: a module with a `.js` or `.cjs` extension that contains no ESM
   * `import`/`export` syntax is executed as-is, skipping the (potentially multi-second) Babel
   * pipeline; everything else is transpiled. Set to `false` to force a module to run as-is without
   * transpilation (useful for large prebuilt CommonJS bundles such as Eruda or Monaco), or `true`
   * to always transpile.
   *
   * @default `undefined`
   */
  readonly shouldTranspile?: boolean;
}

/**
 * A wrapper for the require function.
 *
 * @param require - The require function.
 * @returns The resolved module or a promise that resolves to the module.
 */
type RequireAsyncWrapperArg = (require: RequireExFn) => Promisable<unknown>;

/**
 * Require a module.
 *
 * @param id - The ID of the module to require.
 * @param options - The options for the require function.
 * @returns The module.
 */
export declare function require(id: string | TFile, options?: Partial<RequireOptions>): unknown;

/**
 * Require a module asynchronously.
 *
 * @param id - The ID of the module to require.
 * @param options - The options for the require function.
 * @returns The module.
 */
export declare function requireAsync(id: string | TFile, options?: Partial<RequireOptions>): Promise<unknown>;

/**
 * Wrap a synchronous require function with an asynchronous require function.
 *
 * @param requireFn - The synchronous require function to wrap.
 * @returns The module.
 */
export declare function requireAsyncWrapper(requireFn: RequireAsyncWrapperArg): Promise<unknown>;
