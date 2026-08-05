import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CachedModuleProxyHandler,
  EMPTY_MODULE_SYMBOL
} from './cached-module-proxy-handler.ts';

vi.mock('obsidian-dev-utils/function', () => ({
  noop: vi.fn()
}));

const TEST_PROPERTY = 'testProp';
const TEST_VALUE = 'testValue';

describe('CachedModuleProxyHandler', () => {
  describe('EMPTY_MODULE_SYMBOL', () => {
    it('should be a symbol', () => {
      expect(typeof EMPTY_MODULE_SYMBOL).toBe('symbol');
    });

    it('should have description emptyModule', () => {
      expect(EMPTY_MODULE_SYMBOL.description).toBe('emptyModule');
    });
  });

  describe('get', () => {
    it('should return true for EMPTY_MODULE_SYMBOL property', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.get({}, EMPTY_MODULE_SYMBOL, undefined);
      expect(result).toBe(true);
    });

    it('should delegate to cachedModule when it is an object', () => {
      const module = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.get({}, TEST_PROPERTY, undefined);
      expect(result).toBe(TEST_VALUE);
    });

    it('should return undefined when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.get({}, TEST_PROPERTY, undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when cachedModule is a primitive', () => {
      const handler = new CachedModuleProxyHandler(() => 42);
      const result = handler.get({}, TEST_PROPERTY, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set property on cachedModule when it is an object', () => {
      const module: Record<string, unknown> = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.set({}, TEST_PROPERTY, TEST_VALUE, module);
      expect(isResult).toBe(true);
      expect(module[TEST_PROPERTY]).toBe(TEST_VALUE);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.set({}, TEST_PROPERTY, TEST_VALUE, undefined);
      expect(isResult).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true when property exists on cachedModule', () => {
      const module = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.has({}, TEST_PROPERTY);
      expect(isResult).toBe(true);
    });

    it('should return false when property does not exist', () => {
      const module = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.has({}, 'nonexistent');
      expect(isResult).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.has({}, TEST_PROPERTY);
      expect(isResult).toBe(false);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property from cachedModule', () => {
      const module: Record<string, unknown> = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.deleteProperty({}, TEST_PROPERTY);
      expect(isResult).toBe(true);
      expect(module[TEST_PROPERTY]).toBeUndefined();
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.deleteProperty({}, TEST_PROPERTY);
      expect(isResult).toBe(false);
    });
  });

  describe('defineProperty', () => {
    it('should define property on cachedModule', () => {
      const module: Record<string, unknown> = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const descriptor: PropertyDescriptor = { configurable: true, value: TEST_VALUE };
      const isResult = handler.defineProperty({}, TEST_PROPERTY, descriptor);
      expect(isResult).toBe(true);
      expect(module[TEST_PROPERTY]).toBe(TEST_VALUE);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.defineProperty({}, TEST_PROPERTY, { value: TEST_VALUE });
      expect(isResult).toBe(false);
    });
  });

  describe('getOwnPropertyDescriptor', () => {
    it('should return descriptor from cachedModule', () => {
      const module = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.getOwnPropertyDescriptor({}, TEST_PROPERTY);
      expect(result).toEqual(expect.objectContaining({ value: TEST_VALUE }));
    });

    it('should return undefined when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.getOwnPropertyDescriptor({}, TEST_PROPERTY);
      expect(result).toBeUndefined();
    });

    it('should return undefined when property does not exist on module', () => {
      const module = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.getOwnPropertyDescriptor({}, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPrototypeOf', () => {
    it('should return prototype of cachedModule', () => {
      const prototype = { prototypeMethod: vi.fn() };
      const module = Object.create(prototype) as object;
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.getPrototypeOf();
      expect(result).toBe(prototype);
    });

    it('should return null when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.getPrototypeOf();
      expect(result).toBeNull();
    });
  });

  describe('isExtensible', () => {
    it('should return true for extensible cachedModule', () => {
      const module = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.isExtensible();
      expect(isResult).toBe(true);
    });

    it('should return false for non-extensible cachedModule', () => {
      const module = Object.preventExtensions({});
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.isExtensible();
      expect(isResult).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.isExtensible();
      expect(isResult).toBe(false);
    });
  });

  describe('ownKeys', () => {
    it('should return keys of cachedModule', () => {
      const module = { a: 1, b: 2 };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.ownKeys();
      expect(result).toEqual(['a', 'b']);
    });

    it('should return empty array when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.ownKeys();
      expect(result).toEqual([]);
    });
  });

  describe('preventExtensions', () => {
    it('should prevent extensions on cachedModule', () => {
      const module = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.preventExtensions();
      expect(isResult).toBe(true);
      expect(Object.isExtensible(module)).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.preventExtensions();
      expect(isResult).toBe(false);
    });
  });

  describe('setPrototypeOf', () => {
    it('should set prototype of cachedModule', () => {
      const module = {};
      const newPrototype = { newMethod: vi.fn() };
      const handler = new CachedModuleProxyHandler(() => module);
      const isResult = handler.setPrototypeOf({}, newPrototype);
      expect(isResult).toBe(true);
      expect(Object.getPrototypeOf(module)).toBe(newPrototype);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const isResult = handler.setPrototypeOf({}, {});
      expect(isResult).toBe(false);
    });
  });

  describe('apply', () => {
    it('should call cachedModule as a function when it is a function', () => {
      const RETURN_VALUE = 42;
      const moduleFunction = vi.fn().mockReturnValue(RETURN_VALUE);
      const handler = new CachedModuleProxyHandler(() => moduleFunction);
      const result = handler.apply({}, undefined, ['arg1', 'arg2']);
      expect(moduleFunction).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe(RETURN_VALUE);
    });

    it('should pass thisArgument correctly', () => {
      const moduleFunction = vi.fn();
      const handler = new CachedModuleProxyHandler(() => moduleFunction);
      const thisArgument = { context: true };
      handler.apply({}, thisArgument, []);
      expect(moduleFunction.mock.contexts[0]).toBe(thisArgument);
    });

    it('should return undefined when cachedModule is not a function', () => {
      const handler = new CachedModuleProxyHandler(() => ({ notAFunction: true }));
      const result = handler.apply({}, undefined, []);
      expect(result).toBeUndefined();
    });

    it('should return undefined when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.apply({}, undefined, []);
      expect(result).toBeUndefined();
    });

    it('should use empty array when argArray is undefined', () => {
      const moduleFunction = vi.fn();
      const handler = new CachedModuleProxyHandler(() => moduleFunction);
      handler.apply({}, undefined, undefined);
      expect(moduleFunction).toHaveBeenCalledWith();
    });
  });

  describe('construct', () => {
    let handler: CachedModuleProxyHandler;
    let MockClass: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      MockClass = vi.fn();
      handler = new CachedModuleProxyHandler(() => MockClass);
    });

    it('should construct instance when cachedModule is a function', () => {
      const result = handler.construct({}, ['arg1'], MockClass);
      expect(result).toBeInstanceOf(MockClass);
    });

    it('should pass arguments to constructor', () => {
      handler.construct({}, ['arg1', 'arg2'], MockClass);
      expect(MockClass).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return empty object when cachedModule is not a function', () => {
      const nonFunctionHandler = new CachedModuleProxyHandler(() => ({ notAFunction: true }));
      const result = nonFunctionHandler.construct({}, [], MockClass);
      expect(result).toEqual({});
    });

    it('should return empty object when cachedModule is null', () => {
      const nullHandler = new CachedModuleProxyHandler(() => null);
      const result = nullHandler.construct({}, [], MockClass);
      expect(result).toEqual({});
    });
  });
});
