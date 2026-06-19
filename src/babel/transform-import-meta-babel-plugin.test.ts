import { transform } from '@babel/standalone';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';
import {
  describe,
  expect,
  it
} from 'vitest';

import { transformImportMetaBabelPlugin } from './transform-import-meta-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

describe('transformImportMetaBabelPlugin', () => {
  it('should rewrite import.meta.url and inject the url import', () => {
    const code = transformCode('const u = import.meta.url;');
    expect(code).toContain('import url from \'url\';');
    expect(code).toContain('url.pathToFileURL(__filename).toString()');
    expect(code).not.toContain('import.meta');
  });

  it('should rewrite import.meta.filename to __filename', () => {
    const code = transformCode('const f = import.meta.filename;');
    expect(code).toContain('__filename');
    expect(code).not.toContain('import.meta');
    expect(code).not.toContain('pathToFileURL');
  });

  it('should rewrite import.meta.dirname to __dirname', () => {
    const code = transformCode('const d = import.meta.dirname;');
    expect(code).toContain('__dirname');
    expect(code).not.toContain('import.meta');
  });

  it('should rewrite import.meta.resolve and inject the createRequire import', () => {
    const code = transformCode('const r = import.meta.resolve("dep");');
    expect(code).toContain('createRequire');
    expect(code).toContain('from \'module\';');
    expect(code).toContain('.resolve("dep")');
    expect(code).not.toContain('import.meta');
  });

  it('should rewrite optional import.meta.resolve calls', () => {
    const code = transformCode('const r = import.meta.resolve?.("dep");');
    expect(code).toContain('createRequire');
    expect(code).toContain('.resolve("dep")');
    expect(code).not.toContain('import.meta');
  });

  it('should generate a unique identifier when url is already bound', () => {
    const code = transformCode('const url = 1; export const u = import.meta.url;');
    expect(code).toContain('const url = 1;');
    expect(code).toContain('_url.pathToFileURL(__filename).toString()');
    expect(code).toContain('import _url from \'url\';');
  });

  it('should leave unknown import.meta properties untouched', () => {
    const code = transformCode('const x = import.meta.unknown;');
    expect(code).toContain('import.meta.unknown');
    expect(code).not.toContain('pathToFileURL');
  });

  it('should not touch member expressions and calls that are not import.meta', () => {
    const code = transformCode('const a = obj.url; const b = obj.resolve("dep");');
    expect(code).toContain('obj.url');
    expect(code).toContain('obj.resolve("dep")');
    expect(code).not.toContain('pathToFileURL');
    expect(code).not.toContain('createRequire');
  });

  it('should not treat other meta properties as import.meta', () => {
    const code = transformCode('function f() { return new.target.url; }');
    expect(code).toContain('new.target.url');
    expect(code).not.toContain('pathToFileURL');
  });
});

function transformCode(code: string): string {
  const result = transform(code, {
    filename: TEST_FILENAME,
    plugins: [transformImportMetaBabelPlugin],
    sourceType: 'module'
  });
  return ensureNonNullable(result.code);
}
