import type { PopulateFilesParams } from 'obsidian-integration-testing';

import {
  readdirSync,
  readFileSync
} from 'node:fs';
import {
  join,
  relative,
  sep
} from 'node:path';
import process from 'node:process';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';

// Obsidian internals and repo tooling that must not be written into the test vault
// (the harness provisions `.obsidian/plugins/<id>` itself).
const EXCLUDED_NAMES = new Set(['.git', '.gitignore', '.markdownlint-cli2.jsonc', '.obsidian']);

/**
 * Reads the in-repo `demo-vault/` tree into a {@link PopulateFilesParams} map so a
 * Vitest global setup can seed it into the temp vault BEFORE Obsidian opens it, letting
 * the startup scan index every note in one pass (avoids the file-watcher race that drops
 * events under a bulk post-launch `populate`).
 *
 * @returns A map of vault-relative path to file bytes.
 */
export function readDemoVaultTree(): PopulateFilesParams {
  const demoVaultDir = join(getRootFolder() ?? process.cwd(), 'demo-vault');
  const map: PopulateFilesParams = {};
  collect(demoVaultDir, demoVaultDir, map);
  return map;
}

function collect(root: string, dir: string, map: PopulateFilesParams): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_NAMES.has(entry.name)) {
      continue;
    }

    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(root, abs, map);
      continue;
    }

    const relPath = relative(root, abs).split(sep).join('/');
    map[relPath] = readFileSync(abs);
  }
}
