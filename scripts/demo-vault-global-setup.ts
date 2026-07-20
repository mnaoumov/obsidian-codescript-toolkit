import type { PopulateFilesParams } from 'obsidian-integration-testing';

import { createSetup } from 'obsidian-integration-testing/vitest-global-setup';

import { readDemoVaultTree } from './helpers/read-demo-vault-tree.ts';

const DATA_JSON_INDENT = 2;

// Mirrors the demo-vault-helper's CST configuration (src/obsidian/demo-vault-helper.ts in that
// Plugin). Written before Obsidian opens so CST loads with the right modulesRoot — otherwise every
// Root-relative `/foo.js` require in the notes resolves to the vault root and fails.
const CODE_SCRIPT_TOOLKIT_DATA_JSON_PATH = '.obsidian/plugins/fix-require-modules/data.json';
const CODE_SCRIPT_TOOLKIT_SETTINGS = {
  invocableScriptsFolder: 'Invocables',
  modulesRoot: '_assets/CodeScriptToolkit',
  shouldHandleProtocolUrls: true,
  startupScriptPath: 'startup.ts'
};

function populate(): PopulateFilesParams {
  const tree = readDemoVaultTree();
  tree[CODE_SCRIPT_TOOLKIT_DATA_JSON_PATH] = `${JSON.stringify(CODE_SCRIPT_TOOLKIT_SETTINGS, null, DATA_JSON_INDENT)}\n`;
  return tree;
}

// Pre-populates the whole `demo-vault/` tree (plus CST config) before Obsidian opens, so its startup
// Scan indexes every note and CST is configured on first load. Used by `integration-tests:demo-vault`.
const { setup, teardown } = createSetup({ populate });

export {
  setup,
  teardown
};
