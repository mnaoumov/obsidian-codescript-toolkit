import { registerDemoVaultCoverageSuite } from '@mnaoumov/obsidian-dev-toolkit/demo-vault-coverage';
import { ObsidianPluginRepoPaths } from '@mnaoumov/obsidian-dev-toolkit/obsidian-plugin-repo-paths';
import { getRootFolder } from '@mnaoumov/typescript-dev-toolkit/root';
import {
  join,
  relative
} from '@mnaoumov/typescript-lib/path';
import {
  existsSync,
  readdirSync,
  readFileSync
} from 'node:fs';
import process from 'node:process';
import {
  expect,
  it
} from 'vitest';

const ASSETS_FOLDER = '_assets';
const MARKDOWN_EXTENSION = '.md';
const ROOT_FOLDER = getRootFolder() ?? process.cwd();
const SOURCE_EXTENSION = '.ts';
const SOURCE_FOLDER = 'src';
const VAULT_README = 'README.md';

// A reference to a note from source: a GitHub blob URL (`%20`-encoded) or a plain path in a comment,
// With an optional `#fragment`. The path part stops at characters that never occur in a note path.
const NOTE_REFERENCE_REGEXP = /demo-vault\/(?<notePath>(?:[^\n"#'()<>`{}])+?\.md)(?:#(?<fragment>[\w-]+))?/g;

// Keeps the in-repo `demo-vault/` in sync with the plugin's public surface WITHOUT
// launching Obsidian: it reflects the real API/config from source and asserts
// every feature is demonstrated, and that the notes reference no API member that no
// longer exists (rename drift). The runtime behavior of the plugin is covered by the
// other integration tests, not by the demo vault.
//
// No `docs` spec: the demo vault IS the documentation now, so there is no second
// surface to check parity against. `docs/` holds only redirect stubs pointing here.
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
    expectDemoNote: '07 Code buttons in depth/43 Code button context.md',
    expectMember: 'registerTempPlugin',
    interfaceName: 'CodeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  },
  rootFolder: ROOT_FOLDER
});

// JSDoc and messages in `src/` link to notes by path, and the notes are renumbered whenever one is
// Inserted. Nothing else resolves those links, so a renumbering used to strand them as GitHub 404s.
it('resolves every demo-vault note reference in src to an existing note and heading', () => {
  const demoVaultFolder = join(ROOT_FOLDER, ObsidianPluginRepoPaths.DemoVault);
  const brokenReferences: string[] = [];
  let referenceCount = 0;

  for (const sourceFile of collectFiles(join(ROOT_FOLDER, SOURCE_FOLDER), SOURCE_EXTENSION)) {
    const sourceText = readFileSync(sourceFile, 'utf-8');
    for (const match of sourceText.matchAll(NOTE_REFERENCE_REGEXP)) {
      referenceCount++;
      const notePath = decodeURIComponent(match.groups?.['notePath'] ?? '');
      const fragment = match.groups?.['fragment'];
      const location = `${relative(ROOT_FOLDER, sourceFile)}: ${match[0]}`;
      const noteFile = join(demoVaultFolder, notePath);
      if (!existsSync(noteFile)) {
        brokenReferences.push(`${location} (no such note)`);
      } else if (fragment && !collectHeadingSlugs(noteFile).has(fragment.toLowerCase())) {
        brokenReferences.push(`${location} (no such heading)`);
      }
    }
  }

  expect(referenceCount).toBeGreaterThan(0);
  expect(brokenReferences).toEqual([]);
});

// `_assets/` holds code fixtures — `code-script` modules, `Templater` templates, a vendored
// `node_modules` — that are notes only by their extension: they carry no `# H1`, no intro prose,
// and nothing links to them from `00 Start.md`, so the authoring checks the vault's real notes must
// Pass do not apply to them. The vault's own `.markdownlint-cli2.jsonc` exempts the same folder with
// An `_assets/**` ignore, but `excludedNotes` matches exact relative paths rather than globs — hence
// the list is enumerated here, derived at run time so a new fixture cannot redden the suite.
// `README.md` addresses someone browsing the repo on GitHub rather than a reader working through the
// vault; it is the checker's own default exemption, which passing `excludedNotes` replaces.
function collectAssetNotePaths(): string[] {
  const demoVaultFolder = join(ROOT_FOLDER, ObsidianPluginRepoPaths.DemoVault);
  return collectFiles(join(demoVaultFolder, ASSETS_FOLDER), MARKDOWN_EXTENSION).map((file) => relative(demoVaultFolder, file));
}

function collectFiles(folder: string, extension: string): string[] {
  const filePaths: string[] = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = join(folder, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...collectFiles(entryPath, extension));
    } else if (entry.name.endsWith(extension)) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

// GitHub's anchor for a heading: lowercased, punctuation dropped, spaces turned into hyphens.
function collectHeadingSlugs(noteFile: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of readFileSync(noteFile, 'utf-8').split('\n')) {
    const heading = /^#{1,6}\s+(?<text>.+?)\s*$/.exec(line)?.groups?.['text'];
    if (heading) {
      slugs.add(heading.toLowerCase().replaceAll(/[^\w\s-]/g, '').replaceAll(/\s/g, '-'));
    }
  }
  return slugs;
}
