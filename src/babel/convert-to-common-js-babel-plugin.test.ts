import {
  describe,
  expect,
  it
} from 'vitest';

import { ConvertToCommonJsBabelPlugin } from './convert-to-common-js-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('ConvertToCommonJsBabelPlugin', () => {
  describe('import conversion', () => {
    it('should convert ES import to require', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('import { foo } from "bar"; console.log(foo);', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('require');
      expect(result.transformedCode).not.toMatch(/^import\s/m);
    });

    it('should convert default import to require', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('import foo from "bar"; console.log(foo);', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('require');
    });
  });

  describe('export conversion', () => {
    it('should convert named export to module.exports', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('export const foo = 1;', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('exports');
    });

    it('should convert default export to module.exports', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('export default 42;', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('exports');
    });
  });

  describe('hasTopLevelAwait', () => {
    it('should detect top-level await', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('const x = await fetch("url");', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(true);
    });

    it('should not flag await inside async function', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('async function foo() { await fetch("url"); }', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(false);
    });

    it('should not flag code without await', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('const x = 1;', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error for invalid syntax', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform('const = ;', TEST_FILENAME);
      expect(result.error).toBeDefined();
      expect(result.transformedCode).toBe('');
      expect(result.data.hasTopLevelAwait).toBe(false);
    });
  });
});
