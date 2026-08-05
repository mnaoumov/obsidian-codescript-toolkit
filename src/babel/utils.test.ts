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
    const property = result.properties[0] as ObjectProperty | undefined;
    expect(property?.type).toBe('ObjectProperty');
    if (property?.type === 'ObjectProperty') {
      expect(property.shorthand).toBe(true);
      expect(property.computed).toBe(false);
      if (property.key.type === 'Identifier') {
        expect(property.key.name).toBe('foo');
      }
      if (property.value.type === 'Identifier') {
        expect(property.value.name).toBe('foo');
      }
    }
  });

  it('should return an ObjectPattern with multiple shorthand properties', () => {
    const keys = ['alpha', 'beta', 'gamma'];
    const result = objectPatternFromKeys(keys);
    expect(result.type).toBe('ObjectPattern');
    expect(result.properties).toHaveLength(keys.length);
    for (const [index, key] of keys.entries()) {
      const property = result.properties[index] as ObjectProperty | undefined;
      expect(property?.type).toBe('ObjectProperty');
      if (property?.type === 'ObjectProperty' && property.key.type === 'Identifier') {
        expect(property.key.name).toBe(key);
      }
    }
  });
});
