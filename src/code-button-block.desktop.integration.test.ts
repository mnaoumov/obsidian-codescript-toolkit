import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const RENDER_DELAY_MS = 3000;

beforeAll(() => {
  const vault = getTempVault();

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
    '_int-test-buttons/raw.md': dedent`
      \`\`\`code-button
      ---
      isRaw: true
      shouldShowSystemMessages: false
      ---
      window.__rawResult = "raw-executed";
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

afterAll(async () => {
  // Close any open leaves to avoid interfering with subsequent test files
  await evalInObsidian({
    fn({ app }) {
      app.workspace.detachLeavesOfType('markdown');
    },
    vaultPath: getTempVault().path
  });
});

function vaultPath(): string {
  return getTempVault().path;
}

describe('CodeButtonBlock integration', () => {
  it('should render a code button in markdown', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, obsidianModule, renderDelay }) {
        await app.workspace.openLinkText('_int-test-buttons/basic', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/basic.md', mode: 'preview' },
          type: 'markdown'
        });

        await sleep(renderDelay);

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { buttonCount: 0, error: 'No active MarkdownView' };
        }

        const codeButtons = view.containerEl.querySelectorAll('.fix-require-modules');
        return { buttonCount: codeButtons.length, mode: view.getMode() };
      },
      vaultPath: vaultPath()
    });

    expect(result.buttonCount).toBeGreaterThan(0);
  });

  it('should auto-run code button with shouldAutoRun: true', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        Reflect.deleteProperty(window, '__autoRunResult');

        await app.workspace.openLinkText('_int-test-buttons/auto-run', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/auto-run.md', mode: 'preview' },
          type: 'markdown'
        });

        await sleep(renderDelay);

        const autoRunResult = Reflect.get(window, '__autoRunResult') as string | undefined;
        return { autoRunResult };
      },
      vaultPath: vaultPath()
    });

    expect(result.autoRunResult).toBe('auto-ran');
  });

  it('should execute isRaw code button without visible button', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, obsidianModule, renderDelay }) {
        Reflect.deleteProperty(window, '__rawResult');

        await app.workspace.openLinkText('_int-test-buttons/raw', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/raw.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const rawResult = Reflect.get(window, '__rawResult') as string | undefined;

        // IsRaw should NOT show a button
        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        const buttons = view?.containerEl.querySelectorAll('button.fix-require-modules-run-button') ?? [];

        return { buttonCount: buttons.length, rawResult };
      },
      vaultPath: vaultPath()
    });

    expect(result.rawResult).toBe('raw-executed');
    expect(result.buttonCount).toBe(0);
  });

  it('should transform import statements in code buttons', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        Reflect.deleteProperty(window, '__importResult');

        await app.workspace.openLinkText('_int-test-buttons/with-import', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-buttons/with-import.md', mode: 'preview' },
          type: 'markdown'
        });

        await sleep(renderDelay);

        const importResult = Reflect.get(window, '__importResult') as string | undefined;
        return { importResult };
      },
      vaultPath: vaultPath()
    });

    expect(result.importResult).toBe('function');
  });
});
