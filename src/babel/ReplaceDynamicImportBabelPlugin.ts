import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';

import {
  callExpression,
  identifier,
  isImport
} from '@babel/types';

import { BabelPluginBase } from './BabelPluginBase.ts';

export class ReplaceDynamicImportBabelPlugin extends BabelPluginBase {
  public constructor() {
    super({});
  }

  public override getVisitor(): Visitor<PluginPass> {
    return {
      CallExpression(path): void {
        if (isImport(path.node.callee)) {
          path.replaceWith(callExpression(identifier('requireAsync'), path.node.arguments));
        }
      }
    };
  }
}
