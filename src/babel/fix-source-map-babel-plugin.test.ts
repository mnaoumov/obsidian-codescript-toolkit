import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';
import {
  describe,
  expect,
  it
} from 'vitest';

import { BabelPluginBase } from './babel-plugin-base.ts';
import { FixSourceMapBabelPlugin } from './fix-source-map-babel-plugin.ts';

interface SourceMapData {
  sources: string[];
}

const TEST_FILENAME = 'test.ts';
const SOURCE_URL = 'https://example.com/script.ts';

describe('FixSourceMapBabelPlugin', () => {
  it('should set the sourceUrl in data', () => {
    const plugin = new FixSourceMapBabelPlugin(SOURCE_URL);
    expect(plugin.data.sourceUrl).toBe(SOURCE_URL);
  });

  it('should modify inline source map sources to the specified URL', () => {
    const codeWithSourceMap = generateCodeWithSourceMap('const x = 1;');
    const plugin = new FixSourceMapBabelPlugin(SOURCE_URL);
    const result = plugin.transform({ code: codeWithSourceMap, filename: TEST_FILENAME });
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('//# sourceMappingURL=data:');

    const sourceMapMatch = /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,(?<encoded>.+)/.exec(result.transformedCode);
    expect(sourceMapMatch).toBeTruthy();
    if (sourceMapMatch?.groups) {
      const decoded = Buffer.from(ensureNonNullable(sourceMapMatch.groups['encoded']), 'base64').toString('utf-8');
      const sourceMap = JSON.parse(decoded) as SourceMapData;
      expect(sourceMap.sources[0]).toBe(SOURCE_URL);
    }
  });

  it('should transform code without errors when input has a source map', () => {
    const codeWithSourceMap = generateCodeWithSourceMap('function hello() { return 42; }');
    const plugin = new FixSourceMapBabelPlugin('custom://path');
    const result = plugin.transform({ code: codeWithSourceMap, filename: TEST_FILENAME });
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('function hello');
  });

  it('should return an error when input has no source map', () => {
    const plugin = new FixSourceMapBabelPlugin(SOURCE_URL);
    const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
    expect(result.error).toBeDefined();
  });
});

class IdentityBabelPlugin extends BabelPluginBase<Record<string, never>> {
  public constructor() {
    super({});
  }
}

function generateCodeWithSourceMap(code: string): string {
  const identity = new IdentityBabelPlugin();
  const result = identity.transform({ code, filename: TEST_FILENAME });
  return result.transformedCode;
}
