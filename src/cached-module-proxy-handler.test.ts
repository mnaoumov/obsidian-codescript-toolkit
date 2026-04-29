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
      const result = handler.set({}, TEST_PROPERTY, TEST_VALUE, module);
      expect(result).toBe(true);
      expect(module[TEST_PROPERTY]).toBe(TEST_VALUE);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.set({}, TEST_PROPERTY, TEST_VALUE, undefined);
      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true when property exists on cachedModule', () => {
      const module = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.has({}, TEST_PROPERTY);
      expect(result).toBe(true);
    });

    it('should return false when property does not exist', () => {
      const module = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.has({}, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.has({}, TEST_PROPERTY);
      expect(result).toBe(false);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property from cachedModule', () => {
      const module: Record<string, unknown> = { [TEST_PROPERTY]: TEST_VALUE };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.deleteProperty({}, TEST_PROPERTY);
      expect(result).toBe(true);
      expect(module[TEST_PROPERTY]).toBeUndefined();
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.deleteProperty({}, TEST_PROPERTY);
      expect(result).toBe(false);
    });
  });

  describe('defineProperty', () => {
    it('should define property on cachedModule', () => {
      const module: Record<string, unknown> = {};
      const handler = new CachedModuleProxyHandler(() => module);
      const descriptor: PropertyDescriptor = { configurable: true, value: TEST_VALUE };
      const result = handler.defineProperty({}, TEST_PROPERTY, descriptor);
      expect(result).toBe(true);
      expect(module[TEST_PROPERTY]).toBe(TEST_VALUE);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.defineProperty({}, TEST_PROPERTY, { value: TEST_VALUE });
      expect(result).toBe(false);
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
      const proto = { protoMethod: vi.fn() };
      const module = Object.create(proto) as object;
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.getPrototypeOf();
      expect(result).toBe(proto);
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
      const result = handler.isExtensible();
      expect(result).toBe(true);
    });

    it('should return false for non-extensible cachedModule', () => {
      const module = Object.preventExtensions({});
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.isExtensible();
      expect(result).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.isExtensible();
      expect(result).toBe(false);
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
      const result = handler.preventExtensions();
      expect(result).toBe(true);
      expect(Object.isExtensible(module)).toBe(false);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.preventExtensions();
      expect(result).toBe(false);
    });
  });

  describe('setPrototypeOf', () => {
    it('should set prototype of cachedModule', () => {
      const module = {};
      const newProto = { newMethod: vi.fn() };
      const handler = new CachedModuleProxyHandler(() => module);
      const result = handler.setPrototypeOf({}, newProto);
      expect(result).toBe(true);
      expect(Object.getPrototypeOf(module)).toBe(newProto);
    });

    it('should return false when cachedModule is null', () => {
      const handler = new CachedModuleProxyHandler(() => null);
      const result = handler.setPrototypeOf({}, {});
      expect(result).toBe(false);
    });
  });

  describe('apply', () => {
    it('should call cachedModule as a function when it is a function', () => {
      const RETURN_VALUE = 42;
      const moduleFn = vi.fn().mockReturnValue(RETURN_VALUE);
      const handler = new CachedModuleProxyHandler(() => moduleFn);
      const result = handler.apply({}, undefined, ['arg1', 'arg2']);
      expect(moduleFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe(RETURN_VALUE);
    });

    it('should pass thisArg correctly', () => {
      const moduleFn = vi.fn();
      const handler = new CachedModuleProxyHandler(() => moduleFn);
      const thisArg = { context: true };
      handler.apply({}, thisArg, []);
      expect(moduleFn.mock.contexts[0]).toBe(thisArg);
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
      const moduleFn = vi.fn();
      const handler = new CachedModuleProxyHandler(() => moduleFn);
      handler.apply({}, undefined, undefined);
      expect(moduleFn).toHaveBeenCalledWith();
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
      const nonFnHandler = new CachedModuleProxyHandler(() => ({ notAFunction: true }));
      const result = nonFnHandler.construct({}, [], MockClass);
      expect(result).toEqual({});
    });

    it('should return empty object when cachedModule is null', () => {
      const nullHandler = new CachedModuleProxyHandler(() => null);
      const result = nullHandler.construct({}, [], MockClass);
      expect(result).toEqual({});
    });
  });
});
