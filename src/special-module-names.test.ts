import {
  describe,
  expect,
  it
} from 'vitest';

import { SPECIAL_MODULE_NAMES } from './special-module-names.ts';

const EXPECTED_CATEGORY_COUNT = 5;

describe('SPECIAL_MODULE_NAMES', () => {
  it('should be frozen', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES)).toBe(true);
  });

  it('should contain all expected categories', () => {
    const expectedKeys = [
      'asarPackedModuleNames',
      'deprecatedObsidianBuiltInModuleNames',
      'electronModuleNames',
      'nodeBuiltInModuleNames',
      'obsidianBuiltInModuleNames'
    ];
    expect(Object.keys(SPECIAL_MODULE_NAMES).sort()).toEqual(expectedKeys);
  });

  it('should have the expected number of categories', () => {
    expect(Object.keys(SPECIAL_MODULE_NAMES)).toHaveLength(EXPECTED_CATEGORY_COUNT);
  });

  it('should have frozen asarPackedModuleNames', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES.asarPackedModuleNames)).toBe(true);
  });

  it('should have frozen deprecatedObsidianBuiltInModuleNames', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES.deprecatedObsidianBuiltInModuleNames)).toBe(true);
  });

  it('should have frozen electronModuleNames', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES.electronModuleNames)).toBe(true);
  });

  it('should have frozen nodeBuiltInModuleNames', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES.nodeBuiltInModuleNames)).toBe(true);
  });

  it('should have frozen obsidianBuiltInModuleNames', () => {
    expect(Object.isFrozen(SPECIAL_MODULE_NAMES.obsidianBuiltInModuleNames)).toBe(true);
  });

  it('should include expected asar packed module names', () => {
    expect(SPECIAL_MODULE_NAMES.asarPackedModuleNames).toContain('@electron/remote');
    expect(SPECIAL_MODULE_NAMES.asarPackedModuleNames).toContain('btime');
    expect(SPECIAL_MODULE_NAMES.asarPackedModuleNames).toContain('get-fonts');
  });

  it('should include expected electron module names', () => {
    expect(SPECIAL_MODULE_NAMES.electronModuleNames).toContain('electron');
    expect(SPECIAL_MODULE_NAMES.electronModuleNames).toContain('electron/common');
    expect(SPECIAL_MODULE_NAMES.electronModuleNames).toContain('electron/renderer');
  });

  it('should include obsidian in obsidianBuiltInModuleNames', () => {
    expect(SPECIAL_MODULE_NAMES.obsidianBuiltInModuleNames).toContain('obsidian');
  });

  it('should include fs in nodeBuiltInModuleNames', () => {
    expect(SPECIAL_MODULE_NAMES.nodeBuiltInModuleNames).toContain('fs');
  });
});
