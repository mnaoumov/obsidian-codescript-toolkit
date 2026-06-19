import {
  describe,
  expect,
  it
} from 'vitest';

import { ReplaceDynamicImportBabelPlugin } from './replace-dynamic-import-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('ReplaceDynamicImportBabelPlugin', () => {
  it('should replace dynamic import() with requireAsync()', () => {
    const plugin = new ReplaceDynamicImportBabelPlugin();
    const result = plugin.transform('const m = import("my-module");', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('requireAsync');
    expect(result.transformedCode).toContain('"my-module"');
    expect(result.transformedCode).not.toMatch(/\bimport\(/);
  });

  it('should replace multiple dynamic imports', () => {
    const plugin = new ReplaceDynamicImportBabelPlugin();
    const code = 'const a = import("mod-a"); const b = import("mod-b");';
    const result = plugin.transform(code, TEST_FILENAME);
    expect(result.error).toBeUndefined();
    const requireAsyncCount = (result.transformedCode.match(/requireAsync/g) ?? []).length;
    const EXPECTED_COUNT = 2;
    expect(requireAsyncCount).toBe(EXPECTED_COUNT);
  });

  it('should not modify code without dynamic imports', () => {
    const plugin = new ReplaceDynamicImportBabelPlugin();
    const result = plugin.transform('const x = 1;', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).not.toContain('requireAsync');
  });

  it('should preserve the import argument', () => {
    const plugin = new ReplaceDynamicImportBabelPlugin();
    const result = plugin.transform('import("./relative-path");', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('requireAsync("./relative-path")');
  });

  it('should preserve the import options argument', () => {
    const plugin = new ReplaceDynamicImportBabelPlugin();
    const result = plugin.transform('const m = import("my-module", { with: { type: "json" } });', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('requireAsync("my-module", {');
    expect(result.transformedCode).toContain('type: "json"');
  });
});
