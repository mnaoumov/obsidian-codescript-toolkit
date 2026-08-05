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

import { BabelPluginBase } from './babel-plugin-base.ts';

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
            /* v8 ignore start -- convertToExpression returns identifier('undefined') for undefined input, so this falsy branch is unreachable. */
          } else if (lastStatement) {
            programBody.push(lastStatement);
          }
          /* v8 ignore stop */
        }

        const wrapperFunction = functionExpression(
          identifier('codeButtonBlockScriptWrapper'),
          [
            identifier('codeButtonContext')
          ],
          blockStatement([
            variableDeclaration('const', [
              variableDeclarator(
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                identifier('__console'),
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                memberExpression(
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('window'),
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('console')
                )
              )
            ]),
            expressionStatement(
              assignmentExpression(
                '=',
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                memberExpression(
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('window'),
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('console')
                ),
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                memberExpression(
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('codeButtonContext'),
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('console')
                )
              )
            ),
            variableDeclaration('const', [
              variableDeclarator(
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                identifier('app'),
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                memberExpression(
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('codeButtonContext'),
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  identifier('app')
                )
              )
            ]),
            tryStatement(
              blockStatement(programBody),
              null,
              blockStatement([
                // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                expressionStatement(
                  // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                  assignmentExpression(
                    '=',
                    // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                    memberExpression(
                      // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                      identifier('window'),
                      // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
                      identifier('console')
                    ),
                    // eslint-disable-next-line unicorn/max-nested-calls -- Babel AST builders nest by construction; flattening them into named temporaries would hide the tree being built.
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
