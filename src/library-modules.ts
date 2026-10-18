// eslint-disable-next-line import-x/no-namespace -- Need entire module.
import * as obsidianLib from '@mnaoumov/obsidian-lib';
// eslint-disable-next-line import-x/no-namespace -- Need entire module.
import * as typescriptLib from '@mnaoumov/typescript-lib';
import { getNestedPropertyValue } from '@mnaoumov/typescript-lib/object-utils';
import { trimStart } from '@mnaoumov/typescript-lib/string';

import type { RequireOptions } from './types.ts';

// eslint-disable-next-line import-x/no-relative-packages -- package.json is not exported.
import obsidianLibPackageJson from '../node_modules/@mnaoumov/obsidian-lib/package.json';
// eslint-disable-next-line import-x/no-relative-packages -- package.json is not exported.
import typescriptLibPackageJson from '../node_modules/@mnaoumov/typescript-lib/package.json';

const EXPORT_PATH_PREFIX = './';
const EXPORT_PATH_SEPARATOR = '/';
const FORBIDDEN_EXPORT_PATHS = new Set(['@types', 'script-utils']);
const PROPERTY_PATH_SEPARATOR = '.';
const ROOT_EXPORT_PATH = '.';
const WILDCARD_EXPORT_PATH = '*';

interface RegisterLibraryModuleParams {
  readonly exportPaths: readonly string[];
  readonly libName: string;
  readonly module: Record<string, unknown>;
  readonly specialModuleFactories: SpecialModuleFactories;
}

type SpecialModuleFactories = Map<string, (options: Partial<RequireOptions>) => unknown>;

/**
 * Registers the libraries `CodeScript Toolkit` bundles as special modules, so a vault script can `require` or `import` them
 * without a `node_modules` folder: `@mnaoumov/obsidian-lib` and `@mnaoumov/typescript-lib`.
 *
 * Each library is registered by its root name and by every non-wildcard export path, and every export of those is registered
 * as `<lib>/<path>/<export>`.
 *
 * @param specialModuleFactories - The map to register the module factories in.
 */
export function registerLibraryModules(specialModuleFactories: SpecialModuleFactories): void {
  registerLibraryModule({
    exportPaths: Object.keys(obsidianLibPackageJson.exports),
    libName: obsidianLibPackageJson.name,
    module: obsidianLib,
    specialModuleFactories
  });
  registerLibraryModule({
    exportPaths: Object.keys(typescriptLibPackageJson.exports),
    libName: typescriptLibPackageJson.name,
    module: typescriptLib,
    specialModuleFactories
  });
}

function registerLibraryModule(params: RegisterLibraryModuleParams): void {
  const { exportPaths, libName, module, specialModuleFactories } = params;
  specialModuleFactories.set(libName, () => module);

  for (const exportPath of exportPaths) {
    if (exportPath.endsWith(WILDCARD_EXPORT_PATH)) {
      continue;
    }

    const relativeExportPath = trimStart({ $string: exportPath, prefix: EXPORT_PATH_PREFIX });

    const pathParts = relativeExportPath.split(EXPORT_PATH_SEPARATOR);
    if (pathParts.some((pathPart) => FORBIDDEN_EXPORT_PATHS.has(pathPart))) {
      continue;
    }

    const propertyPath = relativeExportPath
      .replaceAll(EXPORT_PATH_SEPARATOR, () => PROPERTY_PATH_SEPARATOR);

    const subModule = relativeExportPath === ROOT_EXPORT_PATH ? module : getNestedPropertyValue(module, propertyPath) as object;

    const requireId = relativeExportPath === ROOT_EXPORT_PATH ? libName : `${libName}/${relativeExportPath}`;

    for (const [key, value] of Object.entries(subModule)) {
      specialModuleFactories.set(`${requireId}/${key}`, () => value);
    }
  }
}
