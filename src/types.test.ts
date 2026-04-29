import {
  describe,
  expect,
  it
} from 'vitest';

import {
  CacheInvalidationMode,
  ModuleType
} from './types.ts';

describe('CacheInvalidationMode', () => {
  it('should have Always value', () => {
    expect(CacheInvalidationMode.Always).toBe('always');
  });

  it('should have Never value', () => {
    expect(CacheInvalidationMode.Never).toBe('never');
  });

  it('should have WhenPossible value', () => {
    expect(CacheInvalidationMode.WhenPossible).toBe('whenPossible');
  });
});

describe('ModuleType', () => {
  it('should have Json value', () => {
    expect(ModuleType.Json).toBe('json');
  });

  it('should have JsTs value', () => {
    expect(ModuleType.JsTs).toBe('jsTs');
  });

  it('should have Markdown value', () => {
    expect(ModuleType.Markdown).toBe('md');
  });

  it('should have Node value', () => {
    expect(ModuleType.Node).toBe('node');
  });

  it('should have Wasm value', () => {
    expect(ModuleType.Wasm).toBe('wasm');
  });
});
