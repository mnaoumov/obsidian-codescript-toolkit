import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

// The first code-button execution in a fresh Obsidian session loads babel-standalone and primes the require pipeline — a one-time cost far larger than a warm run. The poll timeout is generous enough to absorb that cold start; the first such test effectively warms the pipeline for the rest.
const POLL_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 100;
// The dirty-editor test polls twice and settles twice in one evalInObsidian call, which the transport caps at 30 s, so it cannot use the cold-start budget above. Run first and cold (vitest -t), its opening render still lands well inside this budget.
const DIRTY_EDITOR_POLL_TIMEOUT_MS = 8000;

beforeAll(() => {
  const vault = getTemporaryVault();

  vault.populate({
    '_int-test-buttons/auto-run.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      window.__autoRunResult = "auto-ran";
      \`\`\`
    `,
    '_int-test-buttons/basic.md': dedent`
      \`\`\`code-button
      window.__codeButtonResult = 42;
      \`\`\`
    `,
    // Counts its own renders, so a test can edit the note in Live Preview and wait for the re-render that edit causes.
    '_int-test-buttons/dirty-editor.md': dedent`
      Intro line.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      window.__dirtyEditorRenderCount = (window.__dirtyEditorRenderCount ?? 0) + 1;
      \`\`\`
    `,
    // Regression fixture for GitHub issue #56: a code-button block near an empty code block followed by trailing unclosed text used to freeze Obsidian (catastrophic regex backtracking in obsidian-dev-utils' getCodeBlockMarkdownInfo, fixed in 87.0.3). Faithful reproduction, with console.log swapped for an auto-run flag the test can assert on.
    '_int-test-buttons/issue-56.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      window.__issue56Result = "issue-56-ran";
      \`\`\`

      \`\`\`

      \`\`\`

      some text
      some text
      some text
    `,
    '_int-test-buttons/raw.md': dedent`
      \`\`\`code-button
      ---
      isRaw: true
      shouldShowSystemMessages: false
      ---
      window.__rawResult = "raw-executed";
      \`\`\`
    `,
    '_int-test-buttons/source-visibility.md': dedent`
      \`\`\`code-button
      ---
      caption: With source
      sourceVisibility: collapsed
      ---
      window.__sourceVisibilityResult = "source-visibility";
      \`\`\`
    `,
    '_int-test-buttons/with-import.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      import { Notice } from "obsidian";
      window.__importResult = typeof Notice;
      \`\`\`
    `
  });
});

function vaultPath(): string {
  return getTemporaryVault().path;
}

describe('CodeButtonBlock integration', () => {
  it('should render a code button in markdown', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-buttons/basic', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/basic.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => getButtonCount() > 0,
          timeoutInMilliseconds: timeoutMs
        });

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        return view ? { buttonCount: getButtonCount(), mode: view.getMode() } : { buttonCount: 0, error: 'No active MarkdownView' };

        function getButtonCount(): number {
          const activeView = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          return activeView?.containerEl.querySelectorAll('.fix-require-modules').length ?? 0;
        }
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.buttonCount).toBeGreaterThan(0);
  });

  // A render used to save the note: obsidian-dev-utils' getCodeBlockMarkdownInfo saved the dirty editor before locating the block, so every Live Preview re-render wrote the note to disk mid-typing. Since obsidian-dev-utils 107 it reads the open view's text instead. The view's own debounced autosave is stubbed out meanwhile, so any write seen here can only have come from the render.
  it('should not save a dirty editor when a Live Preview edit re-renders the block', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
        const FILE_PATH = '_int-test-buttons/dirty-editor.md';
        const TYPED_TEXT = '// typed without saving';
        const SETTLE_MS = 1000;
        Reflect.deleteProperty(window, '__dirtyEditorRenderCount');

        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: FILE_PATH, mode: 'source', source: false },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => getRenderCount() > 0,
          timeoutInMilliseconds: timeoutMs
        });

        // Live Preview renders the block more than once on open. Wait until those renders stop, so the one counted below is the edit's own and not an opening render already past its read.
        let settledRenderCount: number;
        do {
          settledRenderCount = getRenderCount();
          await delay(SETTLE_MS);
        } while (getRenderCount() !== settledRenderCount);

        const view = leaf.view;
        if (!(view instanceof obsidianModule.MarkdownView) || !view.file) {
          return { error: 'No MarkdownView for the fixture note' };
        }

        const file = view.file;
        const mtimeBefore = file.stat.mtime;
        const diskBefore = await app.vault.adapter.read(FILE_PATH);
        const renderCountBefore = getRenderCount();
        const wasDirtyBefore = Reflect.get(view, 'dirty');

        const originalRequestSave = view.requestSave.bind(view);
        // Keeps the half of requestSave that marks the view dirty, which is what a save-before-read keys on, and drops the scheduled save.
        view.requestSave = (): void => {
          Reflect.set(view, 'dirty', true);
        };

        try {
          const codeLine = view.editor.getValue().split('\n').findIndex((line) => line.startsWith('window.__dirtyEditorRenderCount'));
          view.editor.replaceRange(`${TYPED_TEXT}\n`, { ch: 0, line: codeLine });
          const isDirtyAfterEdit = Reflect.get(view, 'dirty');

          await waitUntil({
            intervalInMilliseconds: intervalMs,
            predicate: (): boolean => getRenderCount() > renderCountBefore,
            timeoutInMilliseconds: timeoutMs
          });

          // The render awaits an animation frame before reading the note, so give a save it issued time to land.
          await delay(SETTLE_MS);

          return {
            diskAfter: await app.vault.adapter.read(FILE_PATH),
            diskBefore,
            editorHasTypedText: view.editor.getValue().includes(TYPED_TEXT),
            isDirtyAfterEdit,
            mtimeAfter: file.stat.mtime,
            mtimeBefore,
            renderCountAfter: getRenderCount(),
            renderCountBefore,
            wasDirtyBefore
          };
        } finally {
          view.requestSave = originalRequestSave;
        }

        async function delay(milliseconds: number): Promise<void> {
          await new Promise((resolve) => {
            window.setTimeout(resolve, milliseconds);
          });
        }

        function getRenderCount(): number {
          return (Reflect.get(window, '__dirtyEditorRenderCount') as number | undefined) ?? 0;
        }
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: DIRTY_EDITOR_POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.error).toBeUndefined();
    expect(result.wasDirtyBefore).toBe(false);
    expect(result.isDirtyAfterEdit).toBe(true);
    expect(result.editorHasTypedText).toBe(true);
    expect(result.renderCountAfter).toBeGreaterThan(result.renderCountBefore ?? 0);
    expect(result.diskAfter).toBe(result.diskBefore);
    expect(result.mtimeAfter).toBe(result.mtimeBefore);
  });

  it('should auto-run code button with shouldAutoRun: true', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, timeoutMs }) {
        Reflect.deleteProperty(window, '__autoRunResult');

        await app.workspace.openLinkText('_int-test-buttons/auto-run', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/auto-run.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__autoRunResult') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        const autoRunResult = Reflect.get(window, '__autoRunResult') as string | undefined;
        return { autoRunResult };
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.autoRunResult).toBe('auto-ran');
  });

  // Regression test for GitHub issue #56: rendering this note used to hang the main thread (catastrophic regex backtracking in obsidian-dev-utils' getCodeBlockMarkdownInfo). Pre-fix the poll below would time out; post-fix the render completes and sets the flag.
  it('should render issue-56 note without freezing', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, timeoutMs }) {
        Reflect.deleteProperty(window, '__issue56Result');

        await app.workspace.openLinkText('_int-test-buttons/issue-56', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/issue-56.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__issue56Result') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        const issue56Result = Reflect.get(window, '__issue56Result') as string | undefined;
        return { issue56Result };
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.issue56Result).toBe('issue-56-ran');
  });

  it('should execute isRaw code button without visible button', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
        Reflect.deleteProperty(window, '__rawResult');

        await app.workspace.openLinkText('_int-test-buttons/raw', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/raw.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__rawResult') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        const rawResult = Reflect.get(window, '__rawResult') as string | undefined;

        // isRaw should NOT show a button
        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        const buttons = view?.containerEl.querySelectorAll('button.fix-require-modules-run-button') ?? [];

        return { buttonCount: buttons.length, rawResult };
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.rawResult).toBe('raw-executed');
    expect(result.buttonCount).toBe(0);
  });

  it('should render a source toggle that reveals the button source', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-buttons/source-visibility', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/source-visibility.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => query('.code-button-source-toggle') !== null,
          timeoutInMilliseconds: timeoutMs
        });

        const toggleEl = query('.code-button-source-toggle');
        const sourceEl = query('.code-button-source-container');

        const wasCollapsed = sourceEl?.classList.contains('is-collapsed') ?? false;
        toggleEl?.click();
        const isCollapsed = sourceEl?.classList.contains('is-collapsed') ?? true;

        return {
          isCollapsed,
          runButtonCount: activeView()?.containerEl.querySelectorAll('button.fix-require-modules-run-button').length ?? 0,
          sourceText: sourceEl?.textContent ?? '',
          toggleIconClass: toggleEl?.querySelector('svg')?.getAttribute('class') ?? '',
          wasCollapsed
        };

        function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
          return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        }

        function query(selector: string): HTMLElement | null {
          return activeView()?.containerEl.querySelector<HTMLElement>(selector) ?? null;
        }
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.wasCollapsed).toBe(true);
    expect(result.isCollapsed).toBe(false);
    expect(result.runButtonCount).toBeGreaterThan(0);
    expect(result.sourceText).toContain('__sourceVisibilityResult');
    // The docs call the toggle `</>`, which is Lucide's `code-xml`; plain `code` has no slash.
    expect(result.toggleIconClass).toContain('lucide-code-xml');
  });

  it('should transform import statements in code buttons', async () => {
    const result = await evalInObsidian({
      async callback({ app, intervalMs, lib: { waitUntil }, timeoutMs }) {
        Reflect.deleteProperty(window, '__importResult');

        await app.workspace.openLinkText('_int-test-buttons/with-import', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/with-import.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil({
          intervalInMilliseconds: intervalMs,
          predicate: (): boolean => Reflect.get(window, '__importResult') !== undefined,
          timeoutInMilliseconds: timeoutMs
        });

        const importResult = Reflect.get(window, '__importResult') as string | undefined;
        return { importResult };
      },
      input: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      vaultPath: vaultPath()
    });

    expect(result.importResult).toBe('function');
  });
});
