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

import { BabelPluginBase } from './BabelPluginBase.ts';
import { objectPatternFromKeys } from './utils.ts';

export class WrapInRequireFunctionBabelPlugin extends BabelPluginBase {
  public constructor(private readonly isAsync: boolean, private readonly contextKeys: readonly string[]) {
    super({});
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
