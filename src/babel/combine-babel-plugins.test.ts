import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';

import {
  callExpression,
  identifier,
  isCallExpression,
  isIdentifier
} from '@babel/types';
import {
  describe,
  expect,
  it
} from 'vitest';

import { BabelPluginBase } from './babel-plugin-base.ts';
import { SequentialBabelPlugin } from './combine-babel-plugins.ts';

const TEST_FILENAME = 'test.ts';

interface RenameData {
  renamed: boolean;
}

interface WrapData {
  wrapped: boolean;
}

class ErrorBabelPlugin extends BabelPluginBase<Record<string, never>> {
  public constructor() {
    super({});
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      Program: (): void => {
        throw new Error('Intentional error');
      }
    };
  }
}

class RenameFooBabelPlugin extends BabelPluginBase<RenameData> {
  public constructor() {
    super({ renamed: false });
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      Identifier: (path): void => {
        if (path.node.name === 'foo') {
          path.node.name = 'bar';
          this.data.renamed = true;
        }
      }
    };
  }
}

class WrapInCallBabelPlugin extends BabelPluginBase<WrapData> {
  public constructor() {
    super({ wrapped: false });
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      ExpressionStatement: (path): void => {
        const expr = path.node.expression;
        if (isCallExpression(expr) && isIdentifier(expr.callee) && expr.callee.name === 'wrapper') {
          return;
        }
        path.node.expression = callExpression(identifier('wrapper'), [expr]);
        this.data.wrapped = true;
      }
    };
  }
}

describe('SequentialBabelPlugin', () => {
  it('should run plugins in sequence and combine data', () => {
    const plugin = new SequentialBabelPlugin([
      new RenameFooBabelPlugin(),
      new WrapInCallBabelPlugin()
    ]);
    const result = plugin.transform('foo();', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('bar');
    expect(result.transformedCode).toContain('wrapper');
    expect(result.data.renamed).toBe(true);
    expect(result.data.wrapped).toBe(true);
  });

  it('should propagate errors from the first plugin', () => {
    const plugin = new SequentialBabelPlugin([
      new ErrorBabelPlugin(),
      new RenameFooBabelPlugin()
    ]);
    const result = plugin.transform('foo();', TEST_FILENAME);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Intentional error');
    expect(result.transformedCode).toBe('');
  });

  it('should propagate errors from a later plugin', () => {
    const plugin = new SequentialBabelPlugin([
      new RenameFooBabelPlugin(),
      new ErrorBabelPlugin()
    ]);
    const result = plugin.transform('foo();', TEST_FILENAME);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Intentional error');
    expect(result.transformedCode).toBe('');
  });

  it('should work with a single plugin', () => {
    const plugin = new SequentialBabelPlugin([
      new RenameFooBabelPlugin()
    ]);
    const result = plugin.transform('foo();', TEST_FILENAME);
    expect(result.error).toBeUndefined();
    expect(result.transformedCode).toContain('bar');
    expect(result.data.renamed).toBe(true);
  });
});
