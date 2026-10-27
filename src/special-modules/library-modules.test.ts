import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireOptions } from '../types.ts';

import { registerLibraryModules } from './library-modules.ts';

const MOCK_NESTED_MODULE = { nestedFunction: (): string => 'nested' };
const MOCK_ROOT_FUNC_RESULT = 'test';

const mockGetNestedPropertyValue = vi.fn((_object: unknown, _path: unknown) => MOCK_NESTED_MODULE);

vi.mock('@mnaoumov/obsidian-lib', () => ({
  obsidianLibFunction: (): string => MOCK_ROOT_FUNC_RESULT
}));

vi.mock('@mnaoumov/typescript-lib', () => ({
  typescriptLibFunction: (): string => MOCK_ROOT_FUNC_RESULT
}));

vi.mock('@mnaoumov/typescript-lib/object-utils', () => ({
  getNestedPropertyValue: ($object: unknown, path: unknown): unknown => mockGetNestedPropertyValue($object, path)
}));

vi.mock('../../node_modules/@mnaoumov/obsidian-lib/package.json', () => ({
  default: {
    exports: {
      '.': './dist/index.js',
      './@types/something': './dist/@types/something.js',
      './*': './dist/*.js',
      './components': './dist/components/index.js',
      './file-manager/my-utils': './dist/file-manager/my-utils.js',
      './script-utils': './dist/script-utils.js'
    },
    name: '@mnaoumov/obsidian-lib'
  }
}));

vi.mock('../../node_modules/@mnaoumov/typescript-lib/package.json', () => ({
  default: {
    exports: {
      '.': './dist/index.js',
      './@types/*': './dist/@types/*.js',
      './my-utils': './dist/my-utils.js',
      './transformers': './dist/transformers/index.js'
    },
    name: '@mnaoumov/typescript-lib'
  }
}));

describe('registerLibraryModules', () => {
  let specialModuleFactories: Map<string, (options: Partial<RequireOptions>) => unknown>;

  beforeEach(() => {
    specialModuleFactories = new Map();
    mockGetNestedPropertyValue.mockClear();
  });

  it('should register the root @mnaoumov/obsidian-lib module', () => {
    registerLibraryModules(specialModuleFactories);
    const $module = specialModuleFactories.get('@mnaoumov/obsidian-lib')?.({});
    expect($module).toEqual({ obsidianLibFunction: expect.any(Function) as unknown });
  });

  it('should register the root @mnaoumov/typescript-lib module', () => {
    registerLibraryModules(specialModuleFactories);
    const $module = specialModuleFactories.get('@mnaoumov/typescript-lib')?.({});
    expect($module).toEqual({ typescriptLibFunction: expect.any(Function) as unknown });
  });

  it('should no longer register obsidian-dev-utils', () => {
    registerLibraryModules(specialModuleFactories);
    const hasRetiredLibrary = [...specialModuleFactories.keys()].some((key) => key.startsWith('obsidian-dev-utils'));
    expect(hasRetiredLibrary).toBe(false);
  });

  it('should register individual exports of the root modules', () => {
    registerLibraryModules(specialModuleFactories);
    expect(typeof specialModuleFactories.get('@mnaoumov/obsidian-lib/obsidianLibFunction')?.({})).toBe('function');
    expect(specialModuleFactories.has('@mnaoumov/typescript-lib/typescriptLibFunction')).toBe(true);
  });

  it('should register non-root export paths with their individual exports', () => {
    registerLibraryModules(specialModuleFactories);
    expect(specialModuleFactories.get('@mnaoumov/obsidian-lib/components/nestedFunction')?.({})).toBe(MOCK_NESTED_MODULE.nestedFunction);
    expect(specialModuleFactories.get('@mnaoumov/typescript-lib/transformers/nestedFunction')?.({})).toBe(MOCK_NESTED_MODULE.nestedFunction);
  });

  it('should skip wildcard export paths', () => {
    registerLibraryModules(specialModuleFactories);
    const hasWildcard = [...specialModuleFactories.keys()].some((key) => key.includes('*'));
    expect(hasWildcard).toBe(false);
  });

  it('should skip forbidden export path script-utils', () => {
    registerLibraryModules(specialModuleFactories);
    const hasScriptUtils = [...specialModuleFactories.keys()].some((key) => key.includes('script-utils'));
    expect(hasScriptUtils).toBe(false);
  });

  it('should skip forbidden export path @types', () => {
    registerLibraryModules(specialModuleFactories);
    const hasTypes = [...specialModuleFactories.keys()].some((key) => key.includes('@types'));
    expect(hasTypes).toBe(false);
  });

  it('should preserve kebab-case in property paths for nested modules', () => {
    registerLibraryModules(specialModuleFactories);
    expect(mockGetNestedPropertyValue).toHaveBeenCalledWith(
      expect.anything(),
      'my-utils'
    );
  });

  it('should preserve kebab-case in nested property paths with multiple segments', () => {
    registerLibraryModules(specialModuleFactories);
    expect(mockGetNestedPropertyValue).toHaveBeenCalledWith(
      expect.anything(),
      'file-manager.my-utils'
    );
  });

  it('should use the requireId with the original kebab-case path', () => {
    registerLibraryModules(specialModuleFactories);
    expect(specialModuleFactories.has('@mnaoumov/typescript-lib/my-utils/nestedFunction')).toBe(true);
    expect(specialModuleFactories.has('@mnaoumov/obsidian-lib/file-manager/my-utils/nestedFunction')).toBe(true);
  });
});
