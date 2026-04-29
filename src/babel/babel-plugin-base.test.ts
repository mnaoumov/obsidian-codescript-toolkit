import type { BabelFileMetadata } from '@babel/core';

import { transform } from '@babel/standalone';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { BabelPluginBase } from './babel-plugin-base.ts';

vi.mock('@babel/standalone', async (importOriginal) => {
  const original = await importOriginal<typeof import('@babel/standalone')>();
  return {
    ...original,
    transform: vi.fn(original.transform)
  };
});

const TEST_FILENAME = 'test.ts';

class MinimalBabelPlugin extends BabelPluginBase<Record<string, never>> {
  public constructor() {
    super({});
  }
}

describe('BabelPluginBase', () => {
  describe('default methods', () => {
    it('should return an empty visitor from getVisitor', () => {
      const plugin = new MinimalBabelPlugin();
      expect(plugin.getVisitor()).toEqual({});
    });

    it('should return undefined from getInherits', () => {
      const plugin = new MinimalBabelPlugin();
      expect(plugin.getInherits()).toBeUndefined();
    });

    it('should not throw from manipulateOptions', () => {
      const plugin = new MinimalBabelPlugin();
      expect(() => {
        plugin.manipulateOptions({}, {});
      }).not.toThrow();
    });

    it('should expose data via the data property', () => {
      const plugin = new MinimalBabelPlugin();
      expect(plugin.data).toEqual({});
    });
  });

  describe('transform', () => {
    it('should return transformedCode for valid TypeScript code', () => {
      const plugin = new MinimalBabelPlugin();
      const result = plugin.transform('const x: number = 1;', TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('const x = 1');
    });

    it('should return an error for syntactically invalid code', () => {
      const plugin = new MinimalBabelPlugin();
      const result = plugin.transform('const = ;', TEST_FILENAME);
      expect(result.error).toBeDefined();
      expect(result.transformedCode).toBe('');
    });

    it('should include data in the result', () => {
      const plugin = new MinimalBabelPlugin();
      const result = plugin.transform('const x = 1;', TEST_FILENAME);
      expect(result.data).toEqual({});
    });

    it('should return error when babelTransform returns null code', () => {
      const transformMock = vi.mocked(transform);
      transformMock.mockReturnValueOnce({
        ast: null,
        code: null,
        map: null,
        metadata: strictProxy<BabelFileMetadata>({})
      });

      const plugin = new MinimalBabelPlugin();
      const result = plugin.transform('const x = 1;', TEST_FILENAME);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Unknown error.');
      expect(result.transformedCode).toBe('');
    });

    it('should strip TypeScript type annotations', () => {
      const plugin = new MinimalBabelPlugin();
      const input = 'function greet(name: string): void { console.log(name); }';
      const result = plugin.transform(input, TEST_FILENAME);
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).not.toContain(': string');
      expect(result.transformedCode).not.toContain(': void');
      expect(result.transformedCode).toContain('function greet');
    });
  });
});
