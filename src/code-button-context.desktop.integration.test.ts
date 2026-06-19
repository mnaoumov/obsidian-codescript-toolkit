import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

// The first code-button execution in a fresh Obsidian session loads babel-standalone and primes the require pipeline — a one-time cost far larger than a warm run. The poll timeout is generous enough to absorb that cold start; the first such test effectively warms the pipeline for the rest.
const POLL_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 100;
const MODULES_ROOT = '_int-test-ctx';
const PLUGIN_ID = 'fix-require-modules';

beforeAll(() => {
  const vault = getTempVault();

  vault.populate({
    '_int-test-ctx-notes/auto-output.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldAutoOutput: true
      shouldShowSystemMessages: false
      ---
      42 + 1
      \`\`\`
    `,
    '_int-test-ctx-notes/insert-after.md': dedent`
      Some text before.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      await codeButtonContext.insertAfterCodeButtonBlock("Inserted after.");
      \`\`\`

      Some text after.
    `,
    '_int-test-ctx-notes/insert-before.md': dedent`
      Some text before.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      await codeButtonContext.insertBeforeCodeButtonBlock("Inserted before.");
      \`\`\`

      Some text after.
    `,
    '_int-test-ctx-notes/remove-after-success.md': dedent`
      Before.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      removeAfterExecution:
        when: onSuccess
        shouldKeepGap: false
      ---
      window.__removeAfterSuccess = true;
      \`\`\`

      After.
    `,
    '_int-test-ctx-notes/remove-block.md': dedent`
      Before block.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      await codeButtonContext.removeCodeButtonBlock();
      \`\`\`

      After block.
    `,
    '_int-test-ctx-notes/render-markdown.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      await codeButtonContext.renderMarkdown("**bold text**");
      \`\`\`
    `,
    '_int-test-ctx-notes/replace-block.md': dedent`
      Before block.

      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldShowSystemMessages: false
      ---
      await codeButtonContext.replaceCodeButtonBlock("Replacement text.");
      \`\`\`

      After block.
    `,
    '_int-test-ctx-notes/wrap-console.md': dedent`
      \`\`\`code-button
      ---
      shouldAutoRun: true
      shouldWrapConsole: true
      shouldShowSystemMessages: false
      ---
      codeButtonContext.console.log("wrapped-output");
      \`\`\`
    `,
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      defaultCodeButtonConfig: '',
      invocableScriptsFolder: '',
      mobileChangesCheckingIntervalInSeconds: 30,
      modulesRoot: MODULES_ROOT,
      shouldHandleProtocolUrls: false,
      shouldUseSyncFallback: false,
      startupScriptPath: ''
    })
  });
});

afterEach(async () => {
  // Detach markdown leaves between tests so a prior test's still-in-flight async code-button execution cannot interfere with the next test's rendering.
  await evalInObsidian({
    fn({ app }) {
      app.workspace.detachLeavesOfType('markdown');
    },
    vaultPath: getTempVault().path
  });
});

afterAll(async () => {
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

describe('CodeButtonContext integration', () => {
  it('should render markdown inside the container', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/render-markdown', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/render-markdown.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(() => getBoldEl() !== null);

        const boldEl = getBoldEl();
        return { hasBold: boldEl !== null, text: boldEl?.textContent ?? '' };

        function getBoldEl(): HTMLElement | null {
          const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          return view?.containerEl.querySelector('strong') ?? null;
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.hasBold).toBe(true);
    expect(result.text).toBe('bold text');
  });

  it('should insert markdown after the code button block', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/insert-after', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/insert-after.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(async () => (await readContent())?.includes('Inserted after.') ?? false);

        const content = await readContent();
        if (content === null) {
          return { content: '', error: 'File not found' };
        }
        return { content };

        async function readContent(): Promise<null | string> {
          const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/insert-after.md');
          if (!file || !('path' in file)) {
            return null;
          }
          return await app.vault.read(file as import('obsidian').TFile);
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.content).toContain('Inserted after.');
  });

  it('should insert markdown before the code button block', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/insert-before', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/insert-before.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(async () => (await readContent())?.includes('Inserted before.') ?? false);

        const content = await readContent();
        if (content === null) {
          return { content: '', error: 'File not found' };
        }
        return { content };

        async function readContent(): Promise<null | string> {
          const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/insert-before.md');
          if (!file || !('path' in file)) {
            return null;
          }
          return await app.vault.read(file as import('obsidian').TFile);
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.content).toContain('Inserted before.');
  });

  it('should remove the code button block from the note', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/remove-block', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/remove-block.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(async () => {
          const current = await readContent();
          return current !== null && !current.includes('code-button');
        });

        const content = await readContent();
        if (content === null) {
          return { content: '', error: 'File not found' };
        }
        return { content };

        async function readContent(): Promise<null | string> {
          const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/remove-block.md');
          if (!file || !('path' in file)) {
            return null;
          }
          return await app.vault.read(file as import('obsidian').TFile);
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.content).not.toContain('code-button');
    expect(result.content).toContain('Before block.');
    expect(result.content).toContain('After block.');
  });

  it('should replace the code button block with new markdown', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/replace-block', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/replace-block.md', mode: 'preview' },
          type: 'markdown'
        });

        // Capture the content at the instant the replacement is observed: a preview re-render can re-run the now-stale block and briefly restore the original, so re-reading after the poll would race that revert.
        const content = await pollForContent();
        if (content === null) {
          return { content: '', error: 'Replacement not observed' };
        }
        return { content };

        async function readContent(): Promise<null | string> {
          const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/replace-block.md');
          if (!file || !('path' in file)) {
            return null;
          }
          return await app.vault.read(file as import('obsidian').TFile);
        }

        async function pollForContent(): Promise<null | string> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const current = await readContent();
            if (current !== null && current.includes('Replacement text.') && !current.includes('code-button')) {
              return current;
            }
            await sleep(intervalMs);
          }
          return null;
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.content).not.toContain('code-button');
    expect(result.content).toContain('Replacement text.');
    expect(result.content).toContain('Before block.');
    expect(result.content).toContain('After block.');
  });

  it('should auto-output the last expression when shouldAutoOutput is true', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/auto-output', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/auto-output.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(() => getOutput().includes('43'));

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { error: 'No active MarkdownView', output: '' };
        }

        return { output: getOutput() };

        function getOutput(): string {
          const activeView = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          const resultEl = activeView?.containerEl.querySelector('.fix-require-modules.console-log-container');
          return resultEl?.textContent ?? '';
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.output).toContain('43');
  });

  it('should wrap console output when shouldWrapConsole is true', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, obsidianModule, timeoutMs }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/wrap-console', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/wrap-console.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(() => getOutput().includes('wrapped-output'));

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { error: 'No active MarkdownView', output: '' };
        }

        return { output: getOutput() };

        function getOutput(): string {
          const activeView = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          const resultEl = activeView?.containerEl.querySelector('.fix-require-modules.console-log-container');
          return resultEl?.textContent ?? '';
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.output).toContain('wrapped-output');
  });

  it('should remove code button block after successful execution with removeAfterExecution.when: onSuccess', async () => {
    const result = await evalInObsidian({
      args: { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
      async fn({ app, intervalMs, timeoutMs }) {
        Reflect.deleteProperty(window, '__removeAfterSuccess');

        await app.workspace.openLinkText('_int-test-ctx-notes/remove-after-success', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/remove-after-success.md', mode: 'preview' },
          type: 'markdown'
        });

        await waitUntil(async () => {
          const executed = Reflect.get(window, '__removeAfterSuccess') === true;
          const current = await readContent();
          return executed && current !== null && !current.includes('code-button');
        });

        const content = await readContent();
        if (content === null) {
          return { content: '', error: 'File not found' };
        }
        const windowResult = Reflect.get(window, '__removeAfterSuccess') === true;
        return { content, executed: windowResult };

        async function readContent(): Promise<null | string> {
          const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/remove-after-success.md');
          if (!file || !('path' in file)) {
            return null;
          }
          return await app.vault.read(file as import('obsidian').TFile);
        }

        async function waitUntil(check: () => boolean | Promise<boolean>): Promise<void> {
          const maxAttempts = Math.ceil(timeoutMs / intervalMs);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (await check()) {
              return;
            }
            await sleep(intervalMs);
          }
        }
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.content).not.toContain('code-button');
  });
});
