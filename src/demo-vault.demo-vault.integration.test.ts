import {
  mkdirSync,
  readdirSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  afterAll,
  describe,
  expect,
  it
} from 'vitest';

// The first code-button execution in a fresh Obsidian session loads babel-standalone and primes the require pipeline, a one-time cost far larger than a warm run.
const RENDER_TIMEOUT_MS = 15_000;
const BUTTON_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 100;

const DEMO_VAULT_DIR = join(getRootFolder() ?? process.cwd(), 'demo-vault');
const REPORT_PATH = join(tmpdir(), 'demo-vault-execution-report.json');

const EXCLUDED_TOP_LEVEL = new Set(['00 Start.md', 'README.md']);

interface ExpectedNonOk {
  captionIncludes: string;
  note: string;
  status: 'error' | 'timeout';
}

// Buttons that legitimately do not report success: by-design error demos, and buttons
// That suppress system messages (so no ✅/❌ banner appears for the classifier to read).
const EXPECTED_NON_OK: ExpectedNonOk[] = [
  { captionIncludes: 'on error only', note: '38 Code buttons.md', status: 'error' },
  { captionIncludes: 'shouldShowSystemMessages=false', note: '38 Code buttons.md', status: 'timeout' }
];

interface ButtonResult {
  readonly caption: string;
  readonly output: string;
  readonly status: 'error' | 'ok' | 'timeout' | 'unknown';
}

interface NoteExecutionResult {
  readonly buttonCount: number;
  readonly renderOk: boolean;
  readonly results: ButtonResult[];
}

interface NoteReport extends NoteExecutionResult {
  readonly note: string;
}

const report: NoteReport[] = [];

function listSelfContainedNotes(): string[] {
  // DEMO_NOTES="a.md,Sub/b.md" runs exactly those notes (subfolder paths allowed) for fast iteration.
  const filter = process.env['DEMO_NOTES'];
  if (filter) {
    return filter.split(',').map((name) => name.trim()).filter(Boolean);
  }

  return readdirSync(DEMO_VAULT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !EXCLUDED_TOP_LEVEL.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const NOTES = listSelfContainedNotes();

afterAll(() => {
  mkdirSync(join(REPORT_PATH, '..'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
});

describe('demo vault execution', () => {
  it.each(NOTES)('runs every code button in "%s" without error', async (noteName) => {
    const result = await evalInObsidian({
      args: { buttonTimeoutMs: BUTTON_TIMEOUT_MS, intervalMs: POLL_INTERVAL_MS, notePath: noteName, renderTimeoutMs: RENDER_TIMEOUT_MS },
      async fn({ app, buttonTimeoutMs, intervalMs, lib: { waitUntil }, notePath: path, obsidianModule, renderTimeoutMs }): Promise<NoteExecutionResult> {
        function dismissModals(): void {
          for (const closeButton of document.querySelectorAll<HTMLElement>('.modal-container .modal-close-button')) {
            closeButton.click();
          }
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        }

        function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
          return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        }

        function runButtons(): HTMLButtonElement[] {
          return [...activeView()?.containerEl.querySelectorAll<HTMLButtonElement>('.block-language-code-button button.mod-cta') ?? []];
        }

        try {
          await app.workspace.openLinkText(path.replace(/\.md$/, ''), '', false);
          const leaf = app.workspace.getLeaf(false);
          await leaf.setViewState({
            state: { file: path, mode: 'preview' },
            type: 'markdown'
          });

          let renderOk = true;
          try {
            await waitUntil({
              intervalInMilliseconds: intervalMs,
              predicate: (): boolean => runButtons().length > 0,
              timeoutInMilliseconds: renderTimeoutMs
            });
          } catch {
            renderOk = false;
          }

          const buttons = runButtons();
          const results: ButtonResult[] = [];

          for (const button of buttons) {
            const caption = button.textContent;
            const block = button.closest<HTMLElement>('.block-language-code-button') ?? button.parentElement;
            button.click();

            let status: ButtonResult['status'] = 'timeout';
            try {
              await waitUntil({
                intervalInMilliseconds: intervalMs,
                predicate: (): boolean => {
                  // A button may open a modal (alert/confirm/prompt) and await it; dismiss it so the
                  // Awaited call resolves and the ✅/❌ banner appears for classification.
                  dismissModals();
                  return /Executed (?:successfully|with error)/.test(block?.textContent ?? '');
                },
                timeoutInMilliseconds: buttonTimeoutMs
              });
              const text = block?.textContent ?? '';
              if (text.includes('Executed with error')) {
                status = 'error';
              } else if (text.includes('Executed successfully')) {
                status = 'ok';
              } else {
                status = 'unknown';
              }
            } catch {
              status = 'timeout';
            }

            results.push({ caption, output: (block?.textContent ?? '').slice(0, 600), status });
          }

          return { buttonCount: buttons.length, renderOk, results };
        } finally {
          // Dismiss any modal/suggester a button opened so it cannot block the next note.
          dismissModals();
        }
      },
      vaultPath: getTempVault().path
    });

    report.push({ note: noteName, ...result });

    const broken = result.results.filter((buttonResult) =>
      (buttonResult.status === 'error' || buttonResult.status === 'timeout')
      && !EXPECTED_NON_OK.some((expected) =>
        expected.note === noteName
        && expected.status === buttonResult.status
        && buttonResult.caption.includes(expected.captionIncludes)
      )
    );
    expect(broken, `"${noteName}" (renderOk=${String(result.renderOk)}, buttons=${String(result.buttonCount)}):\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
  });
});
