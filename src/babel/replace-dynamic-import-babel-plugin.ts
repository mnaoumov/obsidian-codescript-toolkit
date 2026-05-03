import type { PluginPass } from '@babel/core';
import type { Visitor } from '@babel/traverse';

import {
  callExpression,
  identifier,
  isImport
} from '@babel/types';

import { BabelPluginBase } from './babel-plugin-base.ts';

export class ReplaceDynamicImportBabelPlugin extends BabelPluginBase {
  public constructor() {
    super({});
  }

  // eslint-disable-next-line obsidian-dev-utils/require-super-call -- Base getVisitor returns empty object; subclass provides its own visitor.
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
