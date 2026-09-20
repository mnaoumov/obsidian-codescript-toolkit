import {
  mkdirSync,
  readdirSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';
import { EMPTY } from 'obsidian-dev-utils/string';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  afterAll,
  describe,
  expect,
  it
} from 'vitest';

// The first code-button execution in a fresh Obsidian session loads babel-standalone and primes the require pipeline, a one-time cost far larger than a warm run.
/*
 * Under the transport's ~30s per-closure cap, and now ONE of them per closure rather than a sum.
 * Sizing alone could never make that true: the note's buttons are clicked in a loop whose length is a
 * runtime DOM fact, so a single closure holding the loop declared RENDER + BUTTON x buttonCount — 34s
 * for a two-button note, 70s for a five-button one. The eval is killed at the cap first and reported as
 * a bare transport timeout naming only `AppiumTransport.evaluate`, i.e. the harness rather than the wait
 * that overran. Hence the split below: `openNoteAndStashButtons` spends RENDER once, `clickStashedButton`
 * spends BUTTON once, and nothing accumulates inside a transport call. A note rendering and a code button
 * reporting its result both land in well under a second, so the ceilings are headroom, not budget.
 * Both constants feed nothing but closure input, so no Node-side wait sees the change.
 */
const RENDER_TIMEOUT_MS = 10_000;
const BUTTON_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 100;

const DEMO_VAULT_DIR = join(getRootFolder() ?? process.cwd(), 'demo-vault');
const REPORT_PATH = join(tmpdir(), 'demo-vault-execution-report.json');

// Matched by BASENAME at every depth, not just the vault root: the notes are grouped into folders, and
// every group folder carries a `README.md` folder note. `00 Start.md` and the READMEs are navigation —
// they hold no code buttons, so running them would assert nothing.
const EXCLUDED_NOTE_NAMES = new Set(['00 Start.md', 'README.md']);

// The plugin-integration notes each install a third-party plugin from the community store before their
// buttons can do anything, so they are read rather than clicked — the same exclusion as before the notes
// were grouped, when this folder was skipped merely because the walk did not recurse into it.
const EXCLUDED_FOLDERS = new Set(['08 Working with other plugins']);

interface ExpectedNonOk {
  captionIncludes: string;
  note: string;
  status: 'error' | 'timeout';
}

// Buttons that legitimately do not report success: by-design error demos, and buttons
// that suppress system messages (so no ✅/❌ banner appears for the classifier to read).
const EXPECTED_NON_OK: ExpectedNonOk[] = [
  { captionIncludes: 'on error only', note: '01 Code buttons.md', status: 'error' },
  { captionIncludes: 'shouldShowSystemMessages=false', note: '01 Code buttons.md', status: 'timeout' }
];

interface ButtonResult {
  readonly caption: string;
  readonly output: string;
  readonly status: 'error' | 'ok' | 'timeout' | 'unknown';
}

/**
 * Where a note's enumerated buttons are parked between transport calls.
 *
 * A DOM element cannot cross the transport — only JSON does — so the buttons are captured ONCE on the
 * renderer's `window` and addressed by index afterwards. Re-querying per click instead would change what
 * is clicked: a `removeAfterExecution` button rewrites its note and re-renders it, so the element list a
 * later call finds is no longer the one the note started with. Holding the original references keeps the
 * walk identical to the single-closure version it replaces — CodeScript Toolkit writes a button's result
 * into its own block element even once that element is detached.
 */
interface DemoVaultButtonStash {
  codeScriptToolkitDemoVaultButtons?: HTMLButtonElement[];
}

interface NoteExecutionResult {
  readonly buttonCount: number;
  readonly renderOk: boolean;
  readonly results: ButtonResult[];
}

/**
 * What opening a note reports: how many buttons mounted, and whether any did within the render budget.
 */
interface NoteRenderResult {
  readonly buttonCount: number;
  readonly renderOk: boolean;
}

interface NoteReport extends NoteExecutionResult {
  readonly note: string;
}

const report: NoteReport[] = [];

// Recurses, because the notes live in group folders: a top-level-only walk would find just the handful of
// notes left at the vault root and still pass every assertion, silently clicking almost nothing.
function collectNotes(folder: string, relativeFolder: string): string[] {
  const notePaths: string[] = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const relativePath = relativeFolder === EMPTY ? entry.name : `${relativeFolder}/${entry.name}`;
    if (entry.isDirectory()) {
      // `_assets` holds code fixtures and `.obsidian` holds vault config; neither contains demo notes.
      if (!entry.name.startsWith('_') && !entry.name.startsWith('.') && !EXCLUDED_FOLDERS.has(entry.name)) {
        notePaths.push(...collectNotes(join(folder, entry.name), relativePath));
      }
    } else if (entry.name.endsWith('.md') && !EXCLUDED_NOTE_NAMES.has(entry.name)) {
      notePaths.push(relativePath);
    }
  }

  return notePaths;
}

function listSelfContainedNotes(): string[] {
  // DEMO_NOTES="a.md,Sub/b.md" runs exactly those notes (subfolder paths allowed) for fast iteration.
  const filter = process.env['DEMO_NOTES'];
  if (filter) {
    return filter.split(',').map((name) => name.trim()).filter(Boolean);
  }

  return collectNotes(DEMO_VAULT_DIR, EMPTY).sort();
}

const NOTES = listSelfContainedNotes();

afterAll(() => {
  mkdirSync(join(REPORT_PATH, '..'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
});

/**
 * Clicks one stashed button and classifies what it reported.
 *
 * One transport call per button is the whole point: this closure spends `BUTTON_TIMEOUT_MS` once,
 * whatever the note's button count, so no note can declare a budget the transport cannot honour.
 *
 * @param buttonIndex - The button's index in the {@link DemoVaultButtonStash} the note's open call parked.
 * @returns The {@link ButtonResult}.
 */
async function clickStashedButton(buttonIndex: number): Promise<ButtonResult> {
  return evalInObsidian({
    async callback({ buttonIndex: index, buttonTimeoutMs, intervalMs, lib: { pressKey, waitUntil } }): Promise<ButtonResult> {
      async function dismissModals(): Promise<void> {
        for (const closeButton of document.querySelectorAll<HTMLElement>('.modal-container .modal-close-button')) {
          closeButton.click();
        }

        /*
         * A trusted Escape — the key press a user makes — but only while something is actually open.
         * This runs on EVERY poll iteration, and unlike the dispatched event it replaces, a trusted key
         * press is one the app genuinely acts on: fired unconditionally it would rain real Escapes into
         * whatever the demo-vault buttons are doing between modals.
         */
        if (document.querySelector('.modal-container, .prompt')) {
          await pressKey({ key: 'Escape' });
        }
      }

      try {
        const button = (window as DemoVaultButtonStash & Window).codeScriptToolkitDemoVaultButtons?.[index];
        // Only reachable if the stash was lost between calls — an Obsidian reload, which no demo button
        // performs. Reported rather than thrown, so the note's other buttons still run.
        if (!button) {
          return { caption: `<button #${String(index)} was not stashed>`, output: '', status: 'unknown' };
        }

        const caption = button.textContent;
        const block = button.closest<HTMLElement>('.block-language-code-button') ?? button.parentElement;
        button.click();

        let status: ButtonResult['status'] = 'timeout';
        try {
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            predicate: async (): Promise<boolean> => {
              // A button may open a modal (alert/confirm/prompt) and await it; dismiss it so the
              // awaited call resolves and the ✅/❌ banner appears for classification.
              await dismissModals();
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

        return { caption, output: (block?.textContent ?? '').slice(0, 600), status };
      } finally {
        // Dismiss any modal/suggester this button opened so it cannot block the next one, or the next note.
        await dismissModals();
      }
    },
    input: { buttonIndex, buttonTimeoutMs: BUTTON_TIMEOUT_MS, intervalMs: POLL_INTERVAL_MS },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Opens a note in reading view, waits for its buttons to mount, and parks them on the renderer's `window`
 * for the per-button calls that follow.
 *
 * This is the first of the note's transport calls and the only one that spends `RENDER_TIMEOUT_MS`.
 *
 * @param noteName - The note's path relative to the demo vault root.
 * @returns The {@link NoteRenderResult}.
 */
async function openNoteAndStashButtons(noteName: string): Promise<NoteRenderResult> {
  return evalInObsidian({
    async callback({ app, intervalMs, lib: { waitUntil }, notePath: path, obsidianModule, renderTimeoutMs }): Promise<NoteRenderResult> {
      function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
        return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      }

      function runButtons(): HTMLButtonElement[] {
        return [...activeView()?.containerEl.querySelectorAll<HTMLButtonElement>(':scope .block-language-code-button button.mod-cta') ?? []];
      }

      await app.workspace.openLinkText(path.replace(/\.md$/, ''), '', false);
      const leaf = app.workspace.getLeaf(false);
      await leaf.setViewState({
        state: { file: path, mode: 'preview' },
        type: 'markdown'
      });

      let isRenderOk = true;
      try {
        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => runButtons().length > 0,
          timeoutInMilliseconds: renderTimeoutMs
        });
      } catch {
        isRenderOk = false;
      }

      const buttons = runButtons();
      (window as DemoVaultButtonStash & Window).codeScriptToolkitDemoVaultButtons = buttons;
      return { buttonCount: buttons.length, renderOk: isRenderOk };
    },
    input: { intervalMs: POLL_INTERVAL_MS, notePath: noteName, renderTimeoutMs: RENDER_TIMEOUT_MS },
    vaultPath: getTemporaryVault().path
  });
}

describe('demo vault execution', () => {
  it.each(NOTES)('runs every code button in "%s" without error', async (noteName) => {
    // The note's buttons are enumerated in one transport call and clicked in one call each; the per-note
    // result is accumulated HERE, in Node, where nothing is capped.
    const { buttonCount, renderOk } = await openNoteAndStashButtons(noteName);
    const results: ButtonResult[] = [];
    for (let buttonIndex = 0; buttonIndex < buttonCount; buttonIndex++) {
      results.push(await clickStashedButton(buttonIndex));
    }

    const result: NoteExecutionResult = { buttonCount, renderOk, results };
    report.push({ note: noteName, ...result });

    const broken = result.results.filter((buttonResult) =>
      (buttonResult.status === 'error' || buttonResult.status === 'timeout')
      && EXPECTED_NON_OK.every((expected) =>
        !(expected.note === noteName
          && expected.status === buttonResult.status
          && buttonResult.caption.includes(expected.captionIncludes))
      )
    );
    expect(broken, `"${noteName}" (renderOk=${String(result.renderOk)}, buttons=${String(result.buttonCount)}):\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
  });

  // The vault opts every button into showing its source through the plugin's vault-wide
  // default-code-button-config setting, so no note carries a per-block `sourceVisibility`.
  // This asserts that vault-wide opt-in actually reaches a real note — the whole point of
  // the setting, and the thing a reader of the demo vault sees first.
  it('shows the source toggle on a real note without any per-note config', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, notePath: path, obsidianModule, renderTimeoutMs }) {
        await app.workspace.openLinkText(path.replace(/\.md$/, ''), '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: path, mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          message: 'code button source toggle to render',
          predicate: (): boolean => query('.code-button-source-toggle') !== null,
          timeoutInMilliseconds: renderTimeoutMs
        });

        const sourceEl = query('.code-button-source-container');
        return {
          isCollapsed: sourceEl?.classList.contains('is-collapsed') ?? false,
          toggleCount: activeView()?.containerEl.querySelectorAll('.code-button-source-toggle').length ?? 0
        };

        function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
          return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        }

        function query(selector: string): HTMLElement | null {
          return activeView()?.containerEl.querySelector<HTMLElement>(selector) ?? null;
        }
      },
      input: { intervalMs: POLL_INTERVAL_MS, notePath: '01 Where your code lives/04 Relative path.md', renderTimeoutMs: RENDER_TIMEOUT_MS },
      vaultPath: getTemporaryVault().path
    });

    expect(result.toggleCount).toBeGreaterThan(0);
    expect(result.isCollapsed).toBe(true);
  });
});
