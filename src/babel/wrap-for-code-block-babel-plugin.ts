import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';
import type {
  Expression,
  Statement
} from '@babel/types';

import {
  arrowFunctionExpression,
  assignmentExpression,
  awaitExpression,
  binaryExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  functionExpression,
  identifier,
  ifStatement,
  isExpressionStatement,
  memberExpression,
  tryStatement,
  variableDeclaration,
  variableDeclarator
} from '@babel/types';

import { BabelPluginBase } from './babel-plugin-base.ts';

interface WrapForCodeBlockBabelPluginConstructorParams {
  readonly shouldAutoOutput: boolean;
  readonly shouldAutoOutputUndefined: boolean;
}

export class WrapForCodeBlockBabelPlugin extends BabelPluginBase {
  private readonly shouldAutoOutput: boolean;
  private readonly shouldAutoOutputUndefined: boolean;

  public constructor(params: WrapForCodeBlockBabelPluginConstructorParams) {
    super({});
    this.shouldAutoOutput = params.shouldAutoOutput;
    this.shouldAutoOutputUndefined = params.shouldAutoOutputUndefined;
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      Program: (path): void => {
        const programBody = path.node.body;

        if (this.shouldAutoOutput) {
          const lastStatement = programBody.pop();
          const lastStatementExpression = convertToExpression(lastStatement);

          if (lastStatementExpression) {
            // An un-awaited Promise would otherwise reach the results panel as the object itself, which formats as `{}`.
            const settledExpression = awaitExpression(lastStatementExpression);
            const newLastStatement = expressionStatement(
              this.shouldAutoOutputUndefined
                ? makeConsoleLogCall(settledExpression)
                : makeConsoleLogIfDefinedCall(settledExpression)
            );

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

  return isExpressionStatement(statement) ? statement.expression : null;
}

function makeConsoleLogCall(expression: Expression): Expression {
  return callExpression(
    memberExpression(
      identifier('console'),
      identifier('log')
    ),
    [
      expression
    ]
  );
}

/**
 * Builds `(value => { if (value !== undefined) { console.log(value); } })(expression)`.
 *
 * The expression stays the argument, so it is still evaluated in the script's own scope (`await` keeps working), and
 * the parameter name cannot clash with anything the script declares.
 */
function makeConsoleLogIfDefinedCall(expression: Expression): Expression {
  const value = identifier('__codeButtonAutoOutputValue');
  const definedCheck = binaryExpression('!==', value, identifier('undefined'));
  const logValue = blockStatement([expressionStatement(makeConsoleLogCall(value))]);
  const helper = arrowFunctionExpression([value], blockStatement([ifStatement(definedCheck, logValue)]));
  return callExpression(helper, [expression]);
}
