import { readdirSync } from 'node:fs';
import process from 'node:process';
import { ObsidianPluginRepoPaths } from 'obsidian-dev-utils/obsidian/plugin/obsidian-plugin-repo-paths';
import {
  join,
  relative
} from 'obsidian-dev-utils/path';
import { registerDemoVaultCoverageSuite } from 'obsidian-dev-utils/script-utils/demo-vault-coverage';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';

const ASSETS_FOLDER = '_assets';
const MARKDOWN_EXTENSION = '.md';
const ROOT_FOLDER = getRootFolder() ?? process.cwd();
const VAULT_README = 'README.md';

// Keeps the in-repo `demo-vault/` in sync with the plugin's public surface WITHOUT
// Launching Obsidian: it reflects the real API/config from source and asserts
// Every feature is demonstrated, and that the notes reference no API member that no
// Longer exists (rename drift). The runtime behavior of the plugin is covered by the
// Other integration tests, not by the demo vault.
//
// No `docs` spec: the demo vault IS the documentation now, so there is no second
// Surface to check parity against. `docs/` holds only redirect stubs pointing here.
registerDemoVaultCoverageSuite({
  authoring: {
    excludedNotes: [VAULT_README, ...collectAssetNotePaths()]
  },
  configInterfaces: [{ interfaceName: 'CodeButtonBlockConfig', sourcePath: 'src/code-button-block-config.ts' }],
  interfaces: [{
    interfaceName: 'CodeButtonContext',
    kind: 'methods',
    receiver: 'codeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  }],
  nonTrivialGuard: {
    expectDemoNote: '42 Code button context.md',
    expectMember: 'registerTempPlugin',
    interfaceName: 'CodeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  },
  rootFolder: ROOT_FOLDER
});

// `_assets/` holds code fixtures — `code-script` modules, Templater templates, a vendored
// `node_modules` — that are notes only by their extension: they carry no `# H1`, no intro prose,
// And nothing links to them from `00 Start.md`, so the authoring checks the vault's real notes must
// Pass do not apply to them. The vault's own `.markdownlint-cli2.jsonc` exempts the same folder with
// An `_assets/**` ignore, but `excludedNotes` matches exact relative paths rather than globs — hence
// The list is enumerated here, derived at run time so a new fixture cannot redden the suite.
// `README.md` addresses someone browsing the repo on GitHub rather than a reader working through the
// Vault; it is the checker's own default exemption, which passing `excludedNotes` replaces.
function collectAssetNotePaths(): string[] {
  const demoVaultFolder = join(ROOT_FOLDER, ObsidianPluginRepoPaths.DemoVault);
  return collectMarkdownFiles(join(demoVaultFolder, ASSETS_FOLDER)).map((file) => relative(demoVaultFolder, file));
}

function collectMarkdownFiles(folder: string): string[] {
  const filePaths: string[] = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = join(folder, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...collectMarkdownFiles(entryPath));
    } else if (entry.name.endsWith(MARKDOWN_EXTENSION)) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}
