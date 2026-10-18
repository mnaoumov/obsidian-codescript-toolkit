import {
  describe,
  expect,
  it
} from 'vitest';

import {
  createRetiredLibraryModuleError,
  isRetiredLibraryModuleId
} from './retired-library-module.ts';

describe('isRetiredLibraryModuleId', () => {
  it('should match the obsidian-dev-utils root and its subpaths', () => {
    expect(isRetiredLibraryModuleId('obsidian-dev-utils')).toBe(true);
    expect(isRetiredLibraryModuleId('obsidian-dev-utils/obsidian/modals/alert')).toBe(true);
  });

  it('should not match other modules sharing the prefix', () => {
    expect(isRetiredLibraryModuleId('obsidian-dev-utils-extra')).toBe(false);
    expect(isRetiredLibraryModuleId('@mnaoumov/obsidian-lib')).toBe(false);
  });
});

describe('createRetiredLibraryModuleError', () => {
  it('should point the root at both replacement libraries', () => {
    expect(createRetiredLibraryModuleError('obsidian-dev-utils').message).toBe(
      'Could not require module: obsidian-dev-utils. obsidian-dev-utils is retired, and CodeScript Toolkit no longer bundles it. '
        + 'Use @mnaoumov/obsidian-lib and @mnaoumov/typescript-lib instead. '
        + 'See https://github.com/mnaoumov/obsidian-dev-utils#import-map for where each module went.'
    );
  });

  it('should map an obsidian/ subpath to @mnaoumov/obsidian-lib, dropping the obsidian segment', () => {
    expect(createRetiredLibraryModuleError('obsidian-dev-utils/obsidian/modals/alert').message).toContain(
      'Use @mnaoumov/obsidian-lib/modals/alert instead.'
    );
    expect(createRetiredLibraryModuleError('obsidian-dev-utils/obsidian').message).toContain('Use @mnaoumov/obsidian-lib instead.');
  });

  it('should map a generic subpath to @mnaoumov/typescript-lib', () => {
    expect(createRetiredLibraryModuleError('obsidian-dev-utils/async/sleep').message).toContain('Use @mnaoumov/typescript-lib/async/sleep instead.');
  });

  it('should say script-utils has no replacement inside Obsidian', () => {
    expect(createRetiredLibraryModuleError('obsidian-dev-utils/script-utils/build').message).toContain(
      'Its script-utils was build tooling meant for Node and has no replacement inside Obsidian.'
    );
  });
});
