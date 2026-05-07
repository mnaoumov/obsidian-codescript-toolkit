import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireOptions } from './types.ts';

import { registerObsidianDevUtilsModule } from './obsidian-dev-utils-module.ts';

const MOCK_NESTED_MODULE = { nestedFunc: (): string => 'nested' };
const MOCK_ROOT_FUNC_RESULT = 'test';

const mockGetNestedPropertyValue = vi.fn((_obj: unknown, _path: unknown) => MOCK_NESTED_MODULE);

vi.mock('obsidian-dev-utils', () => ({
  someFunc: (): string => MOCK_ROOT_FUNC_RESULT
}));

vi.mock('obsidian-dev-utils/object-utils', () => ({
  getNestedPropertyValue: (obj: unknown, path: unknown): unknown => mockGetNestedPropertyValue(obj, path)
}));

vi.mock('obsidian-dev-utils/string', () => ({
  trimStart: (str: string, prefix: string): string => str.startsWith(prefix) ? str.slice(prefix.length) : str
}));

vi.mock('../node_modules/obsidian-dev-utils/package.json', () => ({
  default: {
    exports: {
      '.': './dist/index.js',
      './@types/something': './dist/@types/something.js',
      './*': './dist/*.js',
      './error': './dist/error.js',
      './my-utils': './dist/my-utils.js',
      './obsidian/file-manager': './dist/obsidian/file-manager.js',
      './script-utils': './dist/script-utils.js'
    }
  }
}));

describe('registerObsidianDevUtilsModule', () => {
  let specialModuleFactories: Map<string, (options: Partial<RequireOptions>) => unknown>;

  beforeEach(() => {
    specialModuleFactories = new Map();
    mockGetNestedPropertyValue.mockClear();
  });

  it('should register the root obsidian-dev-utils module', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const factory = specialModuleFactories.get('obsidian-dev-utils');
    expect(factory).toBeDefined();
    const module = factory?.({});
    expect(module).toEqual({ someFunc: expect.any(Function) as unknown });
  });

  it('should register individual exports of the root module', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const factory = specialModuleFactories.get('obsidian-dev-utils/someFunc');
    expect(factory).toBeDefined();
    const value = factory?.({});
    expect(typeof value).toBe('function');
  });

  it('should register non-root export paths with their individual exports', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const factory = specialModuleFactories.get('obsidian-dev-utils/error/nestedFunc');
    expect(factory).toBeDefined();
    const value = factory?.({});
    expect(value).toBe(MOCK_NESTED_MODULE.nestedFunc);
  });

  it('should skip wildcard export paths', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const hasWildcard = Array.from(specialModuleFactories.keys()).some((key) => key.includes('*'));
    expect(hasWildcard).toBe(false);
  });

  it('should skip forbidden export path script-utils', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const hasScriptUtils = Array.from(specialModuleFactories.keys()).some((key) => key.includes('script-utils'));
    expect(hasScriptUtils).toBe(false);
  });

  it('should skip forbidden export path @types', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const hasTypes = Array.from(specialModuleFactories.keys()).some((key) => key.includes('@types'));
    expect(hasTypes).toBe(false);
  });

  it('should preserve kebab-case in property paths for nested modules', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    expect(mockGetNestedPropertyValue).toHaveBeenCalledWith(
      expect.anything(),
      'my-utils'
    );
  });

  it('should preserve kebab-case in nested property paths with multiple segments', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    expect(mockGetNestedPropertyValue).toHaveBeenCalledWith(
      expect.anything(),
      'obsidian.file-manager'
    );
  });

  it('should use the requireId with the original kebab-case path', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const factory = specialModuleFactories.get('obsidian-dev-utils/my-utils/nestedFunc');
    expect(factory).toBeDefined();
  });

  it('should register nested kebab-case module exports', () => {
    registerObsidianDevUtilsModule(specialModuleFactories);
    const factory = specialModuleFactories.get('obsidian-dev-utils/obsidian/file-manager/nestedFunc');
    expect(factory).toBeDefined();
  });
});
