import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';
import type { Statement } from '@babel/types';

import {
  blockStatement,
  callExpression,
  expressionStatement,
  functionExpression,
  identifier,
  returnStatement
} from '@babel/types';

import { BabelPluginBase } from './babel-plugin-base.ts';
import { objectPatternFromKeys } from './utils.ts';

interface WrapInRequireFunctionBabelPluginConstructorParams {
  readonly contextKeys: readonly string[];
  readonly isAsync: boolean;
}

export class WrapInRequireFunctionBabelPlugin extends BabelPluginBase {
  private readonly contextKeys: readonly string[];
  private readonly isAsync: boolean;

  public constructor(params: WrapInRequireFunctionBabelPluginConstructorParams) {
    super({});
    this.contextKeys = params.contextKeys;
    this.isAsync = params.isAsync;
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      Program: (path): void => {
        const programBody = path.node.body;

        let wrapperBody: Statement[];

        if (this.isAsync) {
          wrapperBody = [
            returnStatement(callExpression(
              identifier('requireAsyncWrapper'),
              [
                functionExpression(
                  identifier('requireFn'),
                  [
                    identifier('require')
                  ],
                  blockStatement(programBody),
                  false,
                  true
                ),
                identifier('require')
              ]
            ))
          ];
        } else {
          wrapperBody = programBody;
        }

        const wrapperFunction = functionExpression(
          identifier('scriptWrapper'),
          [
            objectPatternFromKeys(this.contextKeys)
          ],
          blockStatement(wrapperBody),
          false,
          false
        );

        path.node.body = [expressionStatement(wrapperFunction)];
      }
    };
  }
}
