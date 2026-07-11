import {
  describe,
  expect,
  it
} from 'vitest';

import { WrapForCodeBlockBabelPlugin } from './wrap-for-code-block-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('WrapForCodeBlockBabelPlugin', () => {
  describe('shouldAutoOutput=true', () => {
    it('should wrap the last expression statement in console.log', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(true);
      const result = plugin.transform({ code: '1 + 2;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('console.log');
      expect(result.transformedCode).toContain('1 + 2');
    });

    it('should not wrap non-expression last statement (if statement)', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(true);
      const result = plugin.transform({ code: 'if (true) { console.log("hi"); }', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('if');
      // The if statement should remain, not be wrapped in console.log
      expect(result.transformedCode).not.toMatch(/console\.log\(\s*if/);
    });

    it('should handle empty program body', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(true);
      const result = plugin.transform({ code: '', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      // With empty body + shouldAutoOutput, convertToExpression(undefined) returns identifier('undefined')
      expect(result.transformedCode).toContain('console.log');
    });
  });

  describe('shouldAutoOutput=false', () => {
    it('should not wrap any statement in console.log', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(false);
      const result = plugin.transform({ code: '1 + 2;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      // Console appears in the wrapper (for __console and window.console), but not as console.log wrapping the expression
      expect(result.transformedCode).not.toMatch(/console\.log\(1\s*\+\s*2\)/);
      expect(result.transformedCode).toContain('1 + 2');
    });
  });

  describe('wrapper structure', () => {
    it('should wrap code in module.exports = function codeButtonBlockScriptWrapper', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('module.exports');
      expect(result.transformedCode).toContain('codeButtonBlockScriptWrapper');
      expect(result.transformedCode).toContain('codeButtonContext');
    });

    it('should save and restore window.console in the wrapper', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('__console');
      expect(result.transformedCode).toContain('window.console');
    });

    it('should declare app from codeButtonContext.app', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('codeButtonContext.app');
    });

    it('should use try/finally to restore console', () => {
      const plugin = new WrapForCodeBlockBabelPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('try');
      expect(result.transformedCode).toContain('finally');
    });
  });
});
