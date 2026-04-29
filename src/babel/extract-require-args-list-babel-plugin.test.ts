import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ExtractRequireArgsListBabelPlugin } from './extract-require-args-list-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('ExtractRequireArgsListBabelPlugin', () => {
  describe('arrow function with require calls', () => {
    it('should extract require arguments from arrow function', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a"); req("module-b"); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireFnName).toBe('req');
      expect(result.data.requireArgsList).toHaveLength(2);
      expect(result.data.requireArgsList[0]?.id).toBe('module-a');
      expect(result.data.requireArgsList[1]?.id).toBe('module-b');
    });

    it('should extract require arguments with parentPath option', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { "parentPath": "/some/path" }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(1);
      expect(result.data.requireArgsList[0]?.id).toBe('module-a');
      expect(result.data.requireArgsList[0]?.options.parentPath).toBe('/some/path');
    });

    it('should extract require arguments with cacheInvalidationMode option', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { "cacheInvalidationMode": "Always" }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(1);
      expect(result.data.requireArgsList[0]?.options.cacheInvalidationMode).toBe('Always');
    });
  });

  describe('function declaration with require calls', () => {
    it('should extract require arguments from function declaration', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = 'function wrapper(req) { req("module-x"); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireFnName).toBe('req');
      expect(result.data.requireArgsList).toHaveLength(1);
      expect(result.data.requireArgsList[0]?.id).toBe('module-x');
    });
  });

  describe('non-string arguments', () => {
    it('should warn and skip require calls with non-string first argument', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req(someVariable); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not statically analyze require call'));
      warnSpy.mockRestore();
    });
  });

  describe('invalid options', () => {
    it('should warn and skip require calls with invalid cacheInvalidationMode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { "cacheInvalidationMode": "invalid" }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn and skip require calls with unknown option keys', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { "unknownKey": "value" }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn and skip when options argument is not an object expression', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", someVar); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should ignore calls to functions that are not the require function', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { console.log("hello"); req("module-a"); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(1);
      expect(result.data.requireArgsList[0]?.id).toBe('module-a');
    });

    it('should handle empty options object', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", {}); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(1);
      expect(result.data.requireArgsList[0]?.id).toBe('module-a');
      expect(result.data.requireArgsList[0]?.options).toEqual({});
    });

    it('should warn when arrow function has no identifier parameter', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '({}) => { }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith('Could not find require function name in arrow function expression.');
      warnSpy.mockRestore();
    });

    it('should warn when function declaration has no identifier parameter', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = 'function wrapper({}) { }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith('Could not find require function name in function declaration.');
      warnSpy.mockRestore();
    });

    it('should ignore arrow function not at top level (nested in another function)', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = 'function outer() { const inner = (req) => { req("module-a"); }; }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireFnName).toBe('');
      expect(result.data.requireArgsList).toHaveLength(0);
    });

    it('should ignore function declaration not at top level (nested)', () => {
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = 'function outer() { function inner(req) { req("module-a"); } }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireFnName).toBe('');
      expect(result.data.requireArgsList).toHaveLength(0);
    });

    it('should return null for spread element in options object', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { ...opts }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should return null for non-string property value in options', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { "parentPath": 42 }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should return null for identifier (non-string) property key in options', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentional noop for test spy.
      });
      const plugin = new ExtractRequireArgsListBabelPlugin();
      const code = '(req) => { req("module-a", { parentPath: "/some/path" }); }';
      const result = plugin.transform(code, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.requireArgsList).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
