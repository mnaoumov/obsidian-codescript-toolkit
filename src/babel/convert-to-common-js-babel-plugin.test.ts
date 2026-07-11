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
      const result = plugin.transform({ code: 'import { foo } from "bar"; console.log(foo);', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('require');
      expect(result.transformedCode).not.toMatch(/^import\s/m);
    });

    it('should convert default import to require', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'import foo from "bar"; console.log(foo);', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('require');
    });
  });

  describe('export conversion', () => {
    it('should convert named export to module.exports', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'export const foo = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('exports');
    });

    it('should convert default export to module.exports', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'export default 42;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('exports');
    });
  });

  describe('hasTopLevelAwait', () => {
    it('should detect top-level await', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'const x = await fetch("url");', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(true);
    });

    it('should not flag await inside async function', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'async function foo() { await fetch("url"); }', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(false);
    });

    it('should not flag code without await', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.data.hasTopLevelAwait).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error for invalid syntax', () => {
      const plugin = new ConvertToCommonJsBabelPlugin();
      const result = plugin.transform({ code: 'const = ;', filename: TEST_FILENAME });
      expect(result.error).toBeDefined();
      expect(result.transformedCode).toBe('');
      expect(result.data.hasTopLevelAwait).toBe(false);
    });
  });
});
