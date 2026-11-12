import {
  describe,
  expect,
  it
} from 'vitest';

import { isSameOrUnderFolder } from './is-same-or-under-folder.ts';

describe('isSameOrUnderFolder', () => {
  it('should match the folder itself', () => {
    expect(isSameOrUnderFolder('a/b', 'a/b')).toBe(true);
  });

  it('should match a folder under it', () => {
    expect(isSameOrUnderFolder('a/b/c', 'a')).toBe(true);
  });

  it('should not match a sibling whose name starts the same', () => {
    expect(isSameOrUnderFolder('a/bc', 'a/b')).toBe(false);
  });

  it('should not match a parent of it', () => {
    expect(isSameOrUnderFolder('a', 'a/b')).toBe(false);
  });

  it('should never match an empty path', () => {
    expect(isSameOrUnderFolder('', 'a')).toBe(false);
    expect(isSameOrUnderFolder('a', '')).toBe(false);
  });
});
