import type { Promisable } from 'type-fest';

/**
 * Require a module.
 *
 * @param id - The ID of the module to require.
 * @param options - The options for the require function.
 * @returns The module.
 */
export declare function require(id: string, options?: Partial<RequireOptions>): unknown;

/**
 * Require a module asynchronously.
 *
 * @param id - The ID of the module to require.
 * @param options - The options for the require function.
 * @returns The module.
 */
export declare function requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown>;

/**
 * Wrap a synchronous require function with an asynchronous require function.
 *
 * @param requireFn - The synchronous require function to wrap.
 * @returns The module.
 */
export declare function requireAsyncWrapper(requireFn: RequireAsyncWrapperArg): Promise<unknown>;

/**
 * A cache invalidation mode.
 */
// eslint-disable-next-line perfectionist/sort-modules -- I need functions on top of the file.
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
 * A wrapper for the require function.
 *
 * @param require - The require function.
 * @returns The resolved module or a promise that resolves to the module.
 */
export type RequireAsyncWrapperArg = (require: RequireExFn) => Promisable<unknown>;

/**
 * An extended require function.
 */
export type RequireExFn =
  & {
    /**
     * A parent path of the module to require.
     */
    parentPath?: string;
  }
  & NodeJS.Require
  & typeof require;

/**
 * Options for the require function.
 */
export interface RequireOptions {
  /**
   * A cache invalidation mode.
   */
  cacheInvalidationMode?: CacheInvalidationMode;

  /**
   * A type of the module to require.
   */
  moduleType?: ModuleType;

  /**
   * A parent module.
   */
  parentModule?: NodeJS.Module;

  /**
   * A parent path of the module to require.
   */
  parentPath?: string;
}
