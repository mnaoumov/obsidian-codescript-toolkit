import {
  describe,
  expect,
  it
} from 'vitest';

import { WrapInRequireFunctionBabelPlugin } from './wrap-in-require-function-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('WrapInRequireFunctionBabelPlugin', () => {
  describe('isAsync=false', () => {
    it('should wrap code in a function expression named scriptWrapper', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app', 'require'],
        isAsync: false
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('scriptWrapper');
    });

    it('should destructure contextKeys as parameters', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app', 'require'],
        isAsync: false
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('app');
      expect(result.transformedCode).toContain('require');
    });

    it('should not include requireAsyncWrapper for sync mode', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app'],
        isAsync: false
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).not.toContain('requireAsyncWrapper');
    });

    it('should handle empty contextKeys', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: [],
        isAsync: false
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('scriptWrapper');
    });
  });

  describe('isAsync=true', () => {
    it('should wrap code in requireAsyncWrapper call', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app', 'require'],
        isAsync: true
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('requireAsyncWrapper');
    });

    it('should include a return statement with requireAsyncWrapper', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app'],
        isAsync: true
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('return');
      expect(result.transformedCode).toContain('requireAsyncWrapper');
    });

    it('should create inner requireFn function', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app'],
        isAsync: true
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('requireFn');
    });

    it('should still wrap in scriptWrapper function', () => {
      const plugin = new WrapInRequireFunctionBabelPlugin({
        contextKeys: ['app'],
        isAsync: true
      });
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('scriptWrapper');
    });
  });
});
