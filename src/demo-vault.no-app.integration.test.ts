import {
  readdirSync,
  readFileSync
} from 'node:fs';
import {
  join,
  relative
} from 'node:path';
import process from 'node:process';
import {
  describe,
  expect,
  it
} from 'vitest';

// This test keeps the in-repo `demo-vault/` in sync with the plugin's public
// Surface WITHOUT launching Obsidian: it reflects the real API/config/docs from
// Source and asserts every feature is demonstrated, and that the notes reference
// No API member that no longer exists (rename drift). The runtime behavior of the
// Plugin is covered by the other integration tests, not by the demo vault.

const ROOT = process.cwd();
const DEMO_VAULT_DIR = join(ROOT, 'demo-vault');
const DOCS_DIR = join(ROOT, 'docs');

// Docs that are not per-feature demo pages, so they need no demo note.
const NON_FEATURE_DOCS = new Set(['core-functions', 'usage']);

function collectMarkdownFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      result.push(...collectMarkdownFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      result.push(join(dir, entry.name));
    }
  }
  return result;
}

function extractInterfaceBody(source: string, interfaceName: string): string {
  const match = new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`).exec(source);
  if (!match?.[1]) {
    throw new Error(`Could not find interface ${interfaceName}`);
  }
  return match[1];
}

function extractMethodNames(interfaceBody: string): string[] {
  return [...interfaceBody.matchAll(/^ {2}(?<name>\w+)(?:<[^>]*>)?\(/gm)].map((match) => match.groups?.['name'] ?? '');
}

function extractPropertyNames(interfaceBody: string): string[] {
  return [...interfaceBody.matchAll(/^ {2}(?<name>\w+)\??:/gm)].map((match) => match.groups?.['name'] ?? '');
}

function readDemoCorpus(): string {
  return collectMarkdownFiles(DEMO_VAULT_DIR)
    .map((file) => readFileSync(file, 'utf-8'))
    .join('\n');
}

const corpus = readDemoCorpus();

describe('demo-vault coverage', () => {
  it('demonstrates every code button context method', () => {
    const source = readFileSync(join(ROOT, 'src', 'code-button-context.ts'), 'utf-8');
    const methods = extractMethodNames(extractInterfaceBody(source, 'CodeButtonContext'));
    expect(methods.length).toBeGreaterThan(0);

    const missing = methods.filter((method) => !corpus.includes(`codeButtonContext.${method}`));
    expect(missing, `code button context methods with no demo: ${missing.join(', ')}`).toEqual([]);
  });

  it('references no code button context member that no longer exists', () => {
    const source = readFileSync(join(ROOT, 'src', 'code-button-context.ts'), 'utf-8');
    const body = extractInterfaceBody(source, 'CodeButtonContext');
    const validMembers = new Set([...extractMethodNames(body), ...extractPropertyNames(body)]);

    const referenced = [...corpus.matchAll(/codeButtonContext\.(?<member>\w+)/g)].map((match) => match.groups?.['member'] ?? '');
    const stale = [...new Set(referenced)].filter((member) => !validMembers.has(member));
    expect(stale, `stale codeButtonContext references in demo notes: ${stale.join(', ')}`).toEqual([]);
  });

  it('demonstrates every code button config option', () => {
    const source = readFileSync(join(ROOT, 'src', 'code-button-block-config.ts'), 'utf-8');
    const options = extractPropertyNames(extractInterfaceBody(source, 'CodeButtonBlockConfig'));
    expect(options.length).toBeGreaterThan(0);

    const missing = options.filter((option) => !corpus.includes(option));
    expect(missing, `code button config options with no demo: ${missing.join(', ')}`).toEqual([]);
  });

  it('links a demo note for every feature doc', () => {
    const featureDocs = readdirSync(DOCS_DIR)
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
      .filter((name) => !NON_FEATURE_DOCS.has(name));
    expect(featureDocs.length).toBeGreaterThan(0);

    const linkedDocs = new Set([...corpus.matchAll(/docs\/(?<doc>[\w-]+)\.md/g)].map((match) => match.groups?.['doc'] ?? ''));
    const missing = featureDocs.filter((doc) => !linkedDocs.has(doc));
    expect(missing, `feature docs not linked from any demo note: ${missing.join(', ')}`).toEqual([]);
  });

  it('keeps the reflected surface non-trivial', () => {
    // Guards against a parsing regression silently emptying the checks above.
    const contextSource = readFileSync(join(ROOT, 'src', 'code-button-context.ts'), 'utf-8');
    const demoNotes = collectMarkdownFiles(DEMO_VAULT_DIR).map((file) => relative(DEMO_VAULT_DIR, file));
    expect(extractMethodNames(extractInterfaceBody(contextSource, 'CodeButtonContext'))).toContain('registerTempPlugin');
    expect(demoNotes).toContain('Code buttons.md');
  });
});
