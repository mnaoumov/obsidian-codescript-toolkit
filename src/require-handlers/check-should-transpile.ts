import { extname } from 'obsidian-dev-utils/path';

import { splitQuery } from './split-query.ts';

export interface CheckShouldTranspileParams {
  readonly canRequireSync?: boolean | undefined;
  readonly code: string;
  readonly path: string;
  readonly shouldTranspile?: boolean | undefined;
}

const COMMON_JS_EXTENSION = '.cjs';
export const ESM_SYNTAX_REG_EXP = /(?:^|[^.\w$])(?:import|export)\b/;
const REQUIRE_CALL_REG_EXP = /(?:^|[^.\w$])require\s*\(/;

export function checkShouldTranspile(params: CheckShouldTranspileParams): boolean {
  if (params.shouldTranspile !== undefined) {
    return params.shouldTranspile;
  }

  // Without a package.json, only `.cjs` is unambiguously CommonJS: top-level await is illegal in it, so a valid `.cjs` never needs the transpiled async wrapper.
  // Skip transpilation for `.cjs` unless it uses ESM-only or dynamic-import syntax.
  // Everything else defaults to transpiling; the async resolver refines a bare `.js` via the nearest package.json before this is reached.
  if (extname(splitQuery(params.path).cleanStr) === COMMON_JS_EXTENSION) {
    if (ESM_SYNTAX_REG_EXP.test(params.code)) {
      return true;
    }

    // On a platform without synchronous require (mobile), a nested `require()` only resolves when the module is transpiled:
    // The async wrapper preloads the dependency into the cache before the synchronous module body runs.
    // A raw `.cjs` would instead reach the mobile handler's synchronous require and throw, so force transpilation when it calls `require()`.
    if (params.canRequireSync === false && REQUIRE_CALL_REG_EXP.test(params.code)) {
      return true;
    }

    return false;
  }

  return true;
}
