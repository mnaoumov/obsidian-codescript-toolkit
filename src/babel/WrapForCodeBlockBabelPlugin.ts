import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';
import type {
  Expression,
  Statement
} from '@babel/types';

import {
  assignmentExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  functionExpression,
  identifier,
  isExpressionStatement,
  memberExpression,
  tryStatement,
  variableDeclaration,
  variableDeclarator
} from '@babel/types';

import { BabelPluginBase } from './BabelPluginBase.ts';

export class WrapForCodeBlockBabelPlugin extends BabelPluginBase {
  public constructor(private readonly shouldAutoOutput: boolean) {
    super({});
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      Program: (path): void => {
        const programBody = path.node.body;

        if (this.shouldAutoOutput) {
          const lastStatement = programBody.pop();
          const lastStatementExpression = convertToExpression(lastStatement);

          if (lastStatementExpression) {
            const newLastStatement = expressionStatement(callExpression(
              memberExpression(
                identifier('console'),
                identifier('log')
              ),
              [
                lastStatementExpression
              ]
            ));

            programBody.push(newLastStatement);
          } else if (lastStatement) {
            programBody.push(lastStatement);
          }
        }

        const wrapperFunction = functionExpression(
          identifier('codeButtonBlockScriptWrapper'),
          [
            identifier('codeButtonContext')
          ],
          blockStatement([
            variableDeclaration('const', [
              variableDeclarator(
                identifier('__console'),
                memberExpression(
                  identifier('window'),
                  identifier('console')
                )
              )
            ]),
            expressionStatement(
              assignmentExpression(
                '=',
                memberExpression(
                  identifier('window'),
                  identifier('console')
                ),
                memberExpression(
                  identifier('codeButtonContext'),
                  identifier('console')
                )
              )
            ),
            variableDeclaration('const', [
              variableDeclarator(
                identifier('app'),
                memberExpression(
                  identifier('codeButtonContext'),
                  identifier('app')
                )
              )
            ]),
            tryStatement(
              blockStatement(programBody),
              null,
              blockStatement([
                expressionStatement(
                  assignmentExpression(
                    '=',
                    memberExpression(
                      identifier('window'),
                      identifier('console')
                    ),
                    identifier('__console')
                  )
                )
              ])
            )
          ]),
          false,
          true
        );

        const moduleExports = expressionStatement(
          assignmentExpression(
            '=',
            memberExpression(identifier('module'), identifier('exports')),
            wrapperFunction
          )
        );

        path.node.body = [moduleExports];
      }
    };
  }
}
function convertToExpression(statement: Statement | undefined): Expression | null {
  if (!statement) {
    return identifier('undefined');
  }

  if (isExpressionStatement(statement)) {
    return statement.expression;
  }

  return null;
}
