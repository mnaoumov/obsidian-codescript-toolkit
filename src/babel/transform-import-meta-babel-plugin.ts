import type { PluginObject } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type {
  CallExpression,
  Expression,
  MemberExpression,
  MetaProperty,
  OptionalCallExpression,
  Program
} from '@babel/types';

import { template } from '@babel/core';
import {
  isIdentifier,
  isMemberExpression,
  isMetaProperty
} from '@babel/types';

const URL_MODULE_DEFAULT_IMPORT = 'url';
const CREATE_REQUIRE_IMPORT = 'createRequire';

interface GenerateUniqueIdentifierParams {
  readonly path: NodePath<Program>;
  readonly preferredName: string;
  readonly reservedIdentifiers: Set<string>;
}

export function transformImportMetaBabelPlugin(): PluginObject {
  return {
    name: 'transform-import-meta',
    visitor: {
      Program: transformProgram
    }
  };

  function transformProgram(path: NodePath<Program>): void {
    const urlMetas: NodePath<MemberExpression>[] = [];
    const filenameMetas: NodePath<MemberExpression>[] = [];
    const dirnameMetas: NodePath<MemberExpression>[] = [];
    const resolveMetas: NodePath<CallExpression | OptionalCallExpression>[] = [];
    const reservedIdentifiers = new Set<string>();

    path.traverse({
      CallExpression: collectResolve,
      MemberExpression: collectMemberExpression,
      OptionalCallExpression: collectResolve
    });

    if (urlMetas.length !== 0 || resolveMetas.length !== 0) {
      const urlId = generateUniqueIdentifier({ path, preferredName: URL_MODULE_DEFAULT_IMPORT, reservedIdentifiers });
      const createRequireId = generateUniqueIdentifier({ path, preferredName: CREATE_REQUIRE_IMPORT, reservedIdentifiers });

      path.node.body.unshift(template.statement.ast(`import ${urlId} from 'url';`));
      if (resolveMetas.length !== 0) {
        path.node.body.unshift(template.statement.ast(`import { createRequire as ${createRequireId} } from 'module';`));
      }

      const urlReplacement = template.expression.ast(`${urlId}.pathToFileURL(__filename).toString()`);
      for (const meta of urlMetas) {
        meta.replaceWith(urlReplacement);
      }

      const buildResolveReplacement = template.expression(
        `${urlId}.pathToFileURL(${createRequireId}(${urlId}.pathToFileURL(__filename).toString()).resolve(%%args%%)).toString()`
      );
      for (const meta of resolveMetas) {
        meta.replaceWith(buildResolveReplacement({ args: meta.node.arguments }));
      }
    }

    const filenameReplacement = template.expression.ast('__filename');
    for (const meta of filenameMetas) {
      meta.replaceWith(filenameReplacement);
    }

    const dirnameReplacement = template.expression.ast('__dirname');
    for (const meta of dirnameMetas) {
      meta.replaceWith(dirnameReplacement);
    }

    function collectMemberExpression(memberExpPath: NodePath<MemberExpression>): void {
      switch (getImportMetaPropertyName(memberExpPath.node)) {
        case 'dirname':
          dirnameMetas.push(memberExpPath);
          break;
        case 'filename':
          filenameMetas.push(memberExpPath);
          break;
        case 'url':
          urlMetas.push(memberExpPath);
          collectBindings(memberExpPath, reservedIdentifiers);
          break;
        default:
          break;
      }
    }

    function collectResolve(callExpPath: NodePath<CallExpression | OptionalCallExpression>): void {
      const callee = callExpPath.node.callee;
      if (isMemberExpression(callee) && getImportMetaPropertyName(callee) === 'resolve') {
        resolveMetas.push(callExpPath);
        collectBindings(callExpPath, reservedIdentifiers);
      }
    }
  }
}

function collectBindings(path: NodePath, reservedIdentifiers: Set<string>): void {
  for (const name of Object.keys(path.scope.getAllBindings())) {
    reservedIdentifiers.add(name);
  }
}

function generateUniqueIdentifier(params: GenerateUniqueIdentifierParams): string {
  const { path, preferredName, reservedIdentifiers } = params;
  let name = preferredName;
  while (reservedIdentifiers.has(name)) {
    name = path.scope.generateUidIdentifier(preferredName).name;
  }
  return name;
}

function getImportMetaPropertyName(node: MemberExpression): string | undefined {
  if (!isImportMeta(node.object) || !isIdentifier(node.property)) {
    return undefined;
  }
  return node.property.name;
}

function isImportMeta(node: Expression | MemberExpression['object']): node is MetaProperty {
  return isMetaProperty(node) && node.meta.name === 'import' && node.property.name === 'meta';
}
