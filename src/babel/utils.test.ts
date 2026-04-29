import type { ObjectProperty } from '@babel/types';

import {
  describe,
  expect,
  it
} from 'vitest';

import { objectPatternFromKeys } from './utils.ts';

describe('objectPatternFromKeys', () => {
  it('should return an empty ObjectPattern for an empty array', () => {
    const result = objectPatternFromKeys([]);
    expect(result.type).toBe('ObjectPattern');
    expect(result.properties).toHaveLength(0);
  });

  it('should return an ObjectPattern with a single shorthand property', () => {
    const result = objectPatternFromKeys(['foo']);
    expect(result.type).toBe('ObjectPattern');
    expect(result.properties).toHaveLength(1);
    const prop = result.properties[0] as ObjectProperty | undefined;
    expect(prop?.type).toBe('ObjectProperty');
    if (prop?.type === 'ObjectProperty') {
      expect(prop.shorthand).toBe(true);
      expect(prop.computed).toBe(false);
      if (prop.key.type === 'Identifier') {
        expect(prop.key.name).toBe('foo');
      }
      if (prop.value.type === 'Identifier') {
        expect(prop.value.name).toBe('foo');
      }
    }
  });

  it('should return an ObjectPattern with multiple shorthand properties', () => {
    const keys = ['alpha', 'beta', 'gamma'];
    const result = objectPatternFromKeys(keys);
    expect(result.type).toBe('ObjectPattern');
    expect(result.properties).toHaveLength(keys.length);
    for (const [index, key] of keys.entries()) {
      const prop = result.properties[index] as ObjectProperty | undefined;
      expect(prop?.type).toBe('ObjectProperty');
      if (prop?.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
        expect(prop.key.name).toBe(key);
      }
    }
  });
});
