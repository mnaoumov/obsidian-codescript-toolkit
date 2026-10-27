const IMPORT_MAP_URL = 'https://github.com/mnaoumov/obsidian-dev-utils#import-map';
const OBSIDIAN_LIB_NAME = '@mnaoumov/obsidian-lib';
const OBSIDIAN_PATH = 'obsidian';
const PATH_SEPARATOR = '/';
const RETIRED_LIBRARY_NAME = 'obsidian-dev-utils';
const SCRIPT_UTILS_PATH = 'script-utils';
const TYPESCRIPT_LIB_NAME = '@mnaoumov/typescript-lib';

/**
 * Builds the error a vault script gets when it requires the retired `obsidian-dev-utils`, naming the module that replaces it.
 *
 * @param id - The `obsidian-dev-utils` module id, without a query string.
 * @returns The error to throw.
 */
export function createRetiredLibraryModuleError(id: string): Error {
  return new Error(
    `Could not require module: ${id}. ${RETIRED_LIBRARY_NAME} is retired, and CodeScript Toolkit no longer bundles it. ${getReplacementHint(id)} See ${IMPORT_MAP_URL} for where each module went.`
  );
}

/**
 * Checks whether a module id names the retired `obsidian-dev-utils` library or one of its subpaths.
 *
 * @param id - The module id, without a query string.
 * @returns Whether the id names the retired library.
 */
export function isRetiredLibraryModuleId(id: string): boolean {
  return id === RETIRED_LIBRARY_NAME || id.startsWith(`${RETIRED_LIBRARY_NAME}${PATH_SEPARATOR}`);
}

function getReplacementHint(id: string): string {
  if (id === RETIRED_LIBRARY_NAME) {
    return `Use ${OBSIDIAN_LIB_NAME} and ${TYPESCRIPT_LIB_NAME} instead.`;
  }

  const relativePath = id.slice(RETIRED_LIBRARY_NAME.length + PATH_SEPARATOR.length);
  const [firstPathPart, ...otherPathParts] = relativePath.split(PATH_SEPARATOR);

  if (firstPathPart === OBSIDIAN_PATH) {
    return `Use ${[OBSIDIAN_LIB_NAME, ...otherPathParts].join(PATH_SEPARATOR)} instead.`;
  }

  return firstPathPart === SCRIPT_UTILS_PATH ? 'Its script-utils was build tooling meant for Node and has no replacement inside Obsidian.' : `Use ${TYPESCRIPT_LIB_NAME}/${relativePath} instead.`;
}
