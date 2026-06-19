import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';
import type { Expression } from '@babel/types';

import {
  callExpression,
  identifier
} from '@babel/types';

import { BabelPluginBase } from './babel-plugin-base.ts';

export class ReplaceDynamicImportBabelPlugin extends BabelPluginBase {
  public constructor() {
    super({});
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      ImportExpression(path): void {
        const args: Expression[] = [path.node.source];
        if (path.node.options !== null && path.node.options !== undefined) {
          args.push(path.node.options);
        }
        path.replaceWith(callExpression(identifier('requireAsync'), args));
      }
    };
  }
}
