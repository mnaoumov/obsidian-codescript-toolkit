import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import {
  assertClickBudgetsFitTransportCap,
  formatFailures
} from 'obsidian-dev-utils/script-utils/demo-vault-buttons';
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
 * Under the transport's ~30s per-closure cap, and now ONE BUTTON per closure rather than a whole note.
 * Sizing alone could never make that true: a note's buttons are clicked in a loop whose length is a
 * runtime DOM fact, so a single closure holding the loop declared SETTLE + RESULT x buttonCount — 34s
 * for a two-button note, 70s for a five-button one. The eval is killed at the cap first and reported as
 * a bare transport timeout naming only `AppiumTransport.evaluate`, i.e. the harness rather than the wait
 * that overran. Hence the split below: the note is opened and enumerated once, and each button is then
 * found and clicked in a call of its own. `clickButtonByCaption` spends BOTH budgets — it re-finds the
 * button before clicking it — so it is their SUM the cap bounds, which is what the assert below enforces.
 * A note rendering and a code button reporting its result both land in well under a second, so the
 * ceilings are headroom, not budget. Both constants feed nothing but closure input, so no Node-side wait
 * sees the change.
 */
const SETTLE_TIMEOUT_MS = 10_000;
const BUTTON_RESULT_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 100;

// The pair a single `clickButtonByCaption` call spends, refused here rather than at the transport: a sum
// at or over the cap dies as a bare `script timeout` naming neither budget. Borrowed from the shared
// suite this file is the specialized copy of, so the two cannot drift apart on what the cap is.
assertClickBudgetsFitTransportCap({
  buttonResultTimeoutInMilliseconds: BUTTON_RESULT_TIMEOUT_MS,
  settleTimeoutInMilliseconds: SETTLE_TIMEOUT_MS
});

const DEMO_VAULT_DIR = join(getRootFolder() ?? process.cwd(), 'demo-vault');
const REPORT_PATH = join(tmpdir(), 'demo-vault-execution-report.json');

// The plugin-integration notes each install a third-party plugin from the community store before their
// buttons can do anything, so they are read rather than clicked — the same exclusion as before the notes
// were grouped, when this folder was skipped merely because the walk did not recurse into it.
const EXCLUDED_FOLDERS = new Set(['08 Working with other plugins']);

const FENCE_REG_EXP = /^\s*(?<fence>`{3,})(?<info>.*)$/;
const CODE_BUTTON_FENCE_INFO = 'code-button';
const FRONT_MATTER_DELIMITER = '---';
const RAW_MODE_CONFIG_REG_EXP = /^isRaw:\s*true\s*$/m;

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
 * One demo-vault note and how many buttons its source declares.
 */
interface DemoVaultNote {
  /**
   * How many buttons the note's source declares — top-level `code-button` fences that are not `isRaw`.
   */
  readonly buttonCount: number;

  /**
   * The note's path relative to the demo vault root.
   */
  readonly name: string;
}

interface NoteReport {
  readonly captions: string[];
  readonly expectedButtonCount: number;
  readonly note: string;
  readonly results: ButtonResult[];
}

const report: NoteReport[] = [];

/**
 * Lists the demo-vault notes that declare at least one button, walking the group folders too.
 *
 * Recurses, because the notes live in group folders: a top-level-only walk would find just the handful of
 * notes left at the vault root and still pass every assertion, silently clicking almost nothing.
 *
 * A note declaring NO button is dropped rather than walked. That is what retires the former
 * `00 Start.md` / `README.md` name list: a note with no buttons is excluded by what it contains instead of
 * by what they are called, which cannot go stale, and a README that one day gains a button gets clicked
 * rather than skipped. It also reclaims the render budget each of those notes used to spend timing out.
 *
 * @param folder - The folder to walk.
 * @param relativeFolder - Its path relative to the demo vault root.
 * @returns The notes, unsorted.
 */
function collectNotes(folder: string, relativeFolder: string): DemoVaultNote[] {
  const notes: DemoVaultNote[] = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const relativePath = relativeFolder === EMPTY ? entry.name : `${relativeFolder}/${entry.name}`;
    if (entry.isDirectory()) {
      // `_assets` holds code fixtures and `.obsidian` holds vault config; neither contains demo notes.
      if (!entry.name.startsWith('_') && !entry.name.startsWith('.') && !EXCLUDED_FOLDERS.has(entry.name)) {
        notes.push(...collectNotes(join(folder, entry.name), relativePath));
      }
    } else if (entry.name.endsWith('.md')) {
      const buttonCount = countRenderedButtons(readFileSync(join(folder, entry.name), 'utf-8'));
      if (buttonCount > 0) {
        notes.push({ buttonCount, name: relativePath });
      }
    }
  }

  return notes;
}

/**
 * Counts the buttons a note's source will actually render.
 *
 * Two kinds of ` ```code-button ` fence render no button, and both are common in THIS vault because it
 * documents code buttons with code buttons:
 *
 * - A fence nested inside a longer (````) fence is a markdown SAMPLE being shown to the reader. A bare
 *   `/^\s*```code-button/gm` count — which is what the shared suite in `obsidian-dev-utils` uses — reads
 *   `07 Code buttons in depth/42 Code button config.md` as declaring 15 buttons where it renders 2.
 * - An `isRaw` fence renders its own output directly and no button element at all
 *   (`code-button-block.ts`: `buttonEl` stays `null`), so it can never be clicked or enumerated.
 *
 * Counting either of them would make the shortfall assertion unsatisfiable, which is the same failure as
 * not asserting at all.
 *
 * @param source - The note's markdown.
 * @returns How many buttons it renders.
 */
function countRenderedButtons(source: string): number {
  let count = 0;
  let openFenceLength = 0;
  let isInsideCodeButtonFence = false;
  let fenceBody: string[] = [];

  for (const line of source.split(/\r?\n/)) {
    const match = FENCE_REG_EXP.exec(line);
    if (!match) {
      if (isInsideCodeButtonFence) {
        fenceBody.push(line);
      }
      continue;
    }

    const fenceLength = (match.groups?.['fence'] ?? EMPTY).length;
    const info = (match.groups?.['info'] ?? EMPTY).trim();

    if (openFenceLength === 0) {
      openFenceLength = fenceLength;
      isInsideCodeButtonFence = info === CODE_BUTTON_FENCE_INFO;
      fenceBody = [];
      continue;
    }

    // A closing fence is at least as long as the one that opened it and carries no info string; anything
    // else is an inner fence, which is exactly how a ````markdown sample holds a ```code-button.
    if (fenceLength >= openFenceLength && info === EMPTY) {
      if (isInsideCodeButtonFence && !isRawFence(fenceBody)) {
        count++;
      }
      openFenceLength = 0;
      isInsideCodeButtonFence = false;
      continue;
    }

    if (isInsideCodeButtonFence) {
      fenceBody.push(line);
    }
  }

  return count;
}

/**
 * Whether a `code-button` fence's own YAML config asks for raw mode.
 *
 * Read from the leading `---` block rather than from the whole body, so a `isRaw: true` written inside a
 * button's CODE — a button that demonstrates the key, which this vault has — is not mistaken for the
 * button's own config.
 *
 * @param fenceBody - The fence's lines, without the fence markers.
 * @returns Whether the fence renders no button.
 */
function isRawFence(fenceBody: string[]): boolean {
  if (fenceBody[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return false;
  }

  const endIndex = fenceBody.findIndex((line, index) => index > 0 && line.trim() === FRONT_MATTER_DELIMITER);
  if (endIndex === -1) {
    return false;
  }

  return RAW_MODE_CONFIG_REG_EXP.test(fenceBody.slice(1, endIndex).join('\n'));
}

function listSelfContainedNotes(): DemoVaultNote[] {
  // DEMO_NOTES="a.md,Sub/b.md" runs exactly those notes (subfolder paths allowed) for fast iteration.
  const filter = process.env['DEMO_NOTES'];
  if (filter) {
    return filter.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({
      buttonCount: countRenderedButtons(readFileSync(join(DEMO_VAULT_DIR, name), 'utf-8')),
      name
    }));
  }

  return collectNotes(DEMO_VAULT_DIR, EMPTY).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

const NOTES = listSelfContainedNotes();

afterAll(() => {
  mkdirSync(join(REPORT_PATH, '..'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
});

/**
 * Finds one button by its caption and clicks it, then classifies what it reported.
 *
 * One transport call per button is the whole point: this closure spends its two budgets once, whatever the
 * note's button count, so no note can declare a budget the transport cannot honour.
 *
 * The button is addressed by CAPTION and re-found here rather than handed over from the enumeration call.
 * A DOM element cannot cross the transport, and the obvious alternative — parking the enumerated elements
 * on the renderer's `window` and clicking them by index — cannot work once the enumeration has to scroll:
 * reading view evicts the sections it scrolls past, so the stashed references are to elements that have
 * been unmounted by the time they are clicked. Re-finding also survives a `removeAfterExecution` button
 * rewriting and re-rendering its note, which invalidates any element captured before it ran.
 *
 * @param notePath - The note holding the button.
 * @param buttonCaption - The button's rendered caption.
 * @returns The {@link ButtonResult}.
 */
async function clickButtonByCaption(notePath: string, buttonCaption: string): Promise<ButtonResult> {
  return evalInObsidian({
    async callback({
      app,
      buttonResultTimeoutMs,
      caption,
      intervalMs,
      lib: { pressKey, waitUntil },
      notePath: path,
      obsidianModule,
      settleTimeoutMs
    }): Promise<ButtonResult> {
      function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
        return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      }

      function previewEl(): HTMLElement | null {
        // A markdown leaf in preview mode holds BOTH renderings; only the reading one scrolls. Preferring
        // the scrollable candidate picks it without depending on which wrapper class is where.
        const candidates = [...activeView()?.containerEl.querySelectorAll<HTMLElement>(':scope .markdown-preview-view') ?? []];
        return candidates.find((candidate) => candidate.scrollHeight > candidate.clientHeight) ?? candidates[0] ?? null;
      }

      function findButton(): HTMLButtonElement | undefined {
        return [...activeView()?.containerEl.querySelectorAll<HTMLButtonElement>(':scope .block-language-code-button button.mod-cta') ?? []]
          .find((candidate) => candidate.textContent === caption);
      }

      // Reading view mounts lazily and unmounts sections far off-screen, so NO single scroll position
      // holds a whole note's buttons. Advance a viewport at a time and wrap back to the top, remounting
      // every section in turn until the one being looked for appears.
      const SCROLL_BOTTOM_TOLERANCE_IN_PIXELS = 4;
      const SCROLL_STEP_RATIO = 0.8;
      function advanceScroll(): void {
        const scroller = previewEl();
        if (!scroller) {
          return;
        }
        const isAtBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - SCROLL_BOTTOM_TOLERANCE_IN_PIXELS;
        scroller.scrollTop = isAtBottom ? 0 : scroller.scrollTop + Math.floor(scroller.clientHeight * SCROLL_STEP_RATIO);
      }

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
        // Re-opened before every click rather than assuming the previous button left the workspace where
        // it was found: opening a note is one of the most ordinary things a demo button does, and every
        // helper above reads the ACTIVE view.
        await app.workspace.openLinkText(path.replace(/\.md$/, ''), '', false);
        await app.workspace.getLeaf(false).setViewState({
          state: { file: path, mode: 'preview' },
          type: 'markdown'
        });

        // Held from the predicate rather than re-queried after it: the walk keeps moving the viewport, so
        // a button found on one poll can be unmounted again by the next.
        let button: HTMLButtonElement | undefined;
        try {
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            message: `code button "${caption}" never rendered`,
            predicate: (): boolean => {
              advanceScroll();
              button = findButton();
              return button !== undefined;
            },
            timeoutInMilliseconds: settleTimeoutMs
          });
        } catch {
          return { caption, output: EMPTY, status: 'timeout' };
        }

        if (!button) {
          return { caption, output: EMPTY, status: 'timeout' };
        }

        const block = button.closest<HTMLElement>('.block-language-code-button') ?? button.parentElement;
        button.scrollIntoView();
        button.click();

        let status: ButtonResult['status'] = 'timeout';
        try {
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            message: `button "${caption}" never reported a result`,
            predicate: async (): Promise<boolean> => {
              // A button may open a modal (alert/confirm/prompt) and await it; dismiss it so the
              // awaited call resolves and the ✅/❌ banner appears for classification.
              await dismissModals();
              return /Executed (?:successfully|with error)/.test(block?.textContent ?? EMPTY);
            },
            timeoutInMilliseconds: buttonResultTimeoutMs
          });
          const text = block?.textContent ?? EMPTY;
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

        return { caption, output: (block?.textContent ?? EMPTY).slice(0, 600), status };
      } finally {
        // Dismiss any modal/suggester this button opened so it cannot block the next one, or the next note.
        await dismissModals();
      }
    },
    input: {
      buttonResultTimeoutMs: BUTTON_RESULT_TIMEOUT_MS,
      caption: buttonCaption,
      intervalMs: POLL_INTERVAL_MS,
      notePath,
      settleTimeoutMs: SETTLE_TIMEOUT_MS
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Opens a note in reading view and lists the captions of the buttons that mounted, deduplicated and in
 * document order.
 *
 * Two quirks of reading view shape this. It renders lazily and unmounts sections far off-screen, so no
 * single scroll position holds a whole note's buttons — the preview is walked top to bottom and back while
 * waiting, and the captions seen along the way are ACCUMULATED rather than read once at the end. Reading
 * ONCE is what this file used to do, and it is why a third of the vault's buttons had never been clicked
 * by anything. And while it settles, reading view can hold SEVERAL elements per fence — so the captions
 * are deduplicated, which also stops a single-button note being clicked twice.
 *
 * This is the first of the note's transport calls, and the only one that spends its budget without
 * clicking anything.
 *
 * @param note - The note to open.
 * @returns The distinct button captions.
 */
async function openNoteAndListButtonCaptions(note: DemoVaultNote): Promise<string[]> {
  return evalInObsidian({
    async callback({ app, expectedButtonCount, intervalMs, lib: { waitUntil }, notePath: path, obsidianModule, settleTimeoutMs }): Promise<string[]> {
      function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
        return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      }

      function previewEl(): HTMLElement | null {
        const candidates = [...activeView()?.containerEl.querySelectorAll<HTMLElement>(':scope .markdown-preview-view') ?? []];
        return candidates.find((candidate) => candidate.scrollHeight > candidate.clientHeight) ?? candidates[0] ?? null;
      }

      // Accumulated across the walk below, never read from one snapshot: with the viewport moving, any
      // single reading holds only the sections currently mounted. A Set keyed on the caption also keeps
      // the order the buttons were first seen in, which — walking top to bottom — is document order, and
      // some notes need that (`37 Invocable scripts.md` adds a broken script and then removes it again).
      const seenCaptions = new Set<string>();
      function captions(): string[] {
        for (const button of activeView()?.containerEl.querySelectorAll<HTMLButtonElement>(':scope .block-language-code-button button.mod-cta') ?? []) {
          if (button.textContent !== '') {
            seenCaptions.add(button.textContent);
          }
        }
        return [...seenCaptions];
      }

      const SCROLL_BOTTOM_TOLERANCE_IN_PIXELS = 4;
      const SCROLL_STEP_RATIO = 0.8;
      function advanceScroll(): void {
        const scroller = previewEl();
        if (!scroller) {
          return;
        }
        const isAtBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - SCROLL_BOTTOM_TOLERANCE_IN_PIXELS;
        scroller.scrollTop = isAtBottom ? 0 : scroller.scrollTop + Math.floor(scroller.clientHeight * SCROLL_STEP_RATIO);
      }

      await app.workspace.openLinkText(path.replace(/\.md$/, ''), '', false);
      await app.workspace.getLeaf(false).setViewState({
        state: { file: path, mode: 'preview' },
        type: 'markdown'
      });

      try {
        await waitUntil({
          intervalInMilliseconds: intervalMs,
          message: `"${path}" never mounted all ${String(expectedButtonCount)} of its buttons`,
          predicate: (): boolean => {
            advanceScroll();
            return captions().length >= expectedButtonCount;
          },
          timeoutInMilliseconds: settleTimeoutMs
        });
      } catch {
        // The captions are returned either way; the caller asserts on them and reports the shortfall.
      }

      return captions();
    },
    input: {
      expectedButtonCount: note.buttonCount,
      intervalMs: POLL_INTERVAL_MS,
      notePath: note.name,
      settleTimeoutMs: SETTLE_TIMEOUT_MS
    },
    vaultPath: getTemporaryVault().path
  });
}

describe('demo vault execution', () => {
  // A `for` loop rather than `it.each`, so each note's case carries its own literal name: the count of
  // registered cases is the first thing to check when this suite goes quiet, and an interpolated title
  // hides it behind one collapsed entry.
  for (const note of NOTES) {
    it(`runs every code button in "${note.name}" without error`, async () => {
      // The note's buttons are enumerated in one transport call and clicked in one call each; the per-note
      // result is accumulated HERE, in Node, where nothing is capped.
      const captions = await openNoteAndListButtonCaptions(note);
      const results: ButtonResult[] = [];
      for (const caption of captions) {
        results.push(await clickButtonByCaption(note.name, caption));
      }

      report.push({ captions, expectedButtonCount: note.buttonCount, note: note.name, results });

      // Asserted against the note's SOURCE rather than against whatever rendered, so a fence that silently
      // stayed a plain code block fails instead of passing vacuously.
      expect(captions.length, `"${note.name}" declares ${String(note.buttonCount)} button(s) but only ${String(captions.length)} rendered: ${JSON.stringify(captions)}`)
        .toBeGreaterThanOrEqual(note.buttonCount);

      const broken = results.filter((buttonResult) =>
        (buttonResult.status === 'error' || buttonResult.status === 'timeout')
        && EXPECTED_NON_OK.every((expected) =>
          !(expected.note === note.name
            && expected.status === buttonResult.status
            && buttonResult.caption.includes(expected.captionIncludes))
        )
      );
      expect(broken, formatFailures(note.name, broken)).toEqual([]);
    });
  }

  // The vault opts every button into showing its source through the plugin's vault-wide
  // default-code-button-config setting, so no note carries a per-block `sourceVisibility`.
  // This asserts that vault-wide opt-in actually reaches a real note — the whole point of
  // the setting, and the thing a reader of the demo vault sees first.
  it('shows the source toggle on a real note without any per-note config', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, notePath: path, obsidianModule, settleTimeoutMs }) {
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
          timeoutInMilliseconds: settleTimeoutMs
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
      input: { intervalMs: POLL_INTERVAL_MS, notePath: '01 Where your code lives/04 Relative path.md', settleTimeoutMs: SETTLE_TIMEOUT_MS },
      vaultPath: getTemporaryVault().path
    });

    expect(result.toggleCount).toBeGreaterThan(0);
    expect(result.isCollapsed).toBe(true);
  });
});
