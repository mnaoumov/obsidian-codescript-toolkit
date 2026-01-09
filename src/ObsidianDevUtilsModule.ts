// eslint-disable-next-line import-x/no-namespace -- Need entire module.
import * as obsidianDevUtils from 'obsidian-dev-utils';
import { getNestedPropertyValue } from 'obsidian-dev-utils/ObjectUtils';
import { trimStart } from 'obsidian-dev-utils/String';

import type { RequireOptions } from './types.ts';

// eslint-disable-next-line import-x/no-relative-packages -- package.json is not exported.
import packageJson from '../node_modules/obsidian-dev-utils/package.json' with { type: 'json' };

const EXPORT_PATH_PREFIX = './';
const EXPORT_PATH_SEPARATOR = '/';
const FORBIDDEN_EXPORT_PATHS = ['ScriptUtils', '@types'];
const LIB_NAME = 'obsidian-dev-utils';
const PROPERTY_PATH_SEPARATOR = '.';
const ROOT_EXPORT_PATH = '.';
const WILDCARD_EXPORT_PATH = '*';

export async function registerObsidianDevUtilsModule(specialModuleFactories: Map<string, (options: Partial<RequireOptions>) => unknown>): Promise<void> {
  specialModuleFactories.set(LIB_NAME, () => obsidianDevUtils);

  for (const exportPath of Object.keys(packageJson.exports)) {
    if (exportPath.endsWith(WILDCARD_EXPORT_PATH)) {
      continue;
    }

    const relativeExportPath = trimStart(exportPath, EXPORT_PATH_PREFIX);

    const pathParts = relativeExportPath.split(EXPORT_PATH_SEPARATOR);
    if (pathParts.some((pathPart) => FORBIDDEN_EXPORT_PATHS.includes(pathPart))) {
      continue;
    }

    const propertyPath = relativeExportPath.replaceAll(EXPORT_PATH_SEPARATOR, PROPERTY_PATH_SEPARATOR);

    const module = relativeExportPath === ROOT_EXPORT_PATH ? obsidianDevUtils : getNestedPropertyValue(obsidianDevUtils, propertyPath) as object;

    const requireId = relativeExportPath === ROOT_EXPORT_PATH ? LIB_NAME : `${LIB_NAME}/${relativeExportPath}`;

    for (const [key, value] of Object.entries(module)) {
      specialModuleFactories.set(`${requireId}/${key}`, () => value);
    }
  }
}
