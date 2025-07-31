import type { ObjectPattern } from '@babel/types';

import {
  identifier,
  objectPattern,
  objectProperty
} from '@babel/types';

export function objectPatternFromKeys(keys: readonly string[]): ObjectPattern {
  return objectPattern(keys.map((key) => objectProperty(identifier(key), identifier(key), false, true)));
}
