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
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, obsidianModule, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/render-markdown', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/render-markdown.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { error: 'No active MarkdownView', hasBold: false };
        }

        const boldEl = view.containerEl.querySelector('strong');
        return { hasBold: boldEl !== null, text: boldEl?.textContent ?? '' };
      },
      vaultPath: vaultPath()
    });

    expect(result.hasBold).toBe(true);
    expect(result.text).toBe('bold text');
  });

  it('should insert markdown after the code button block', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/insert-after', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/insert-after.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/insert-after.md');
        if (!file || !('path' in file)) {
          return { content: '', error: 'File not found' };
        }
        const content = await app.vault.read(file as import('obsidian').TFile);
        return { content };
      },
      vaultPath: vaultPath()
    });

    expect(result.content).toContain('Inserted after.');
  });

  it('should insert markdown before the code button block', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/insert-before', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/insert-before.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/insert-before.md');
        if (!file || !('path' in file)) {
          return { content: '', error: 'File not found' };
        }
        const content = await app.vault.read(file as import('obsidian').TFile);
        return { content };
      },
      vaultPath: vaultPath()
    });

    expect(result.content).toContain('Inserted before.');
  });

  it('should remove the code button block from the note', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/remove-block', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/remove-block.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/remove-block.md');
        if (!file || !('path' in file)) {
          return { content: '', error: 'File not found' };
        }
        const content = await app.vault.read(file as import('obsidian').TFile);
        return { content };
      },
      vaultPath: vaultPath()
    });

    expect(result.content).not.toContain('code-button');
    expect(result.content).toContain('Before block.');
    expect(result.content).toContain('After block.');
  });

  it('should replace the code button block with new markdown', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/replace-block', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/replace-block.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/replace-block.md');
        if (!file || !('path' in file)) {
          return { content: '', error: 'File not found' };
        }
        const content = await app.vault.read(file as import('obsidian').TFile);
        return { content };
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
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, obsidianModule, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/auto-output', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/auto-output.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { error: 'No active MarkdownView', output: '' };
        }

        const resultEl = view.containerEl.querySelector('.fix-require-modules-result');
        return { output: resultEl?.textContent ?? '' };
      },
      vaultPath: vaultPath()
    });

    expect(result.output).toContain('43');
  });

  it('should wrap console output when shouldWrapConsole is true', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, obsidianModule, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/wrap-console', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/wrap-console.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
        if (!view) {
          return { error: 'No active MarkdownView', output: '' };
        }

        const resultEl = view.containerEl.querySelector('.fix-require-modules-result');
        return { output: resultEl?.textContent ?? '' };
      },
      vaultPath: vaultPath()
    });

    expect(result.output).toContain('wrapped-output');
  });

  it('should remove code button block after successful execution with removeAfterExecution.when: onSuccess', async () => {
    const result = await evalInObsidian({
      args: { renderDelay: RENDER_DELAY_MS },
      async fn({ app, renderDelay }) {
        await app.workspace.openLinkText('_int-test-ctx-notes/remove-after-success', '', false);
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
          state: { file: '_int-test-ctx-notes/remove-after-success.md', mode: 'preview' },
          type: 'markdown'
        });
        await sleep(renderDelay);

        const file = app.vault.getAbstractFileByPath('_int-test-ctx-notes/remove-after-success.md');
        if (!file || !('path' in file)) {
          return { content: '', error: 'File not found' };
        }
        const content = await app.vault.read(file as import('obsidian').TFile);
        const windowResult = Reflect.get(window, '__removeAfterSuccess') === true;
        return { content, executed: windowResult };
      },
      vaultPath: vaultPath()
    });

    expect(result.executed).toBe(true);
    expect(result.content).not.toContain('code-button');
  });
});
