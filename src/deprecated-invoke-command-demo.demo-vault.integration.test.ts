import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const NOTE_PATH = '06 Running scripts without a button/37 Invocable scripts.md';
const RELATIVE_SCRIPT_PATH = 'InvokeCommands/deprecatedInvokeCommand.ts';
const COMMAND_ID = `fix-require-modules:invoke-script-file-${RELATIVE_SCRIPT_PATH}`;
const ADD_BUTTON_CAPTION = 'Add the deliberately broken script';
const REMOVE_BUTTON_CAPTION = 'Remove the deliberately broken script';
const EXPECTED_BUTTON_COUNT = 2;
// The buttons sit roughly here in the note. Reading view renders lazily, so the view is scrolled to
// Them before they can be clicked; an approximate line is enough to bring their section into view.
const BUTTONS_LINE = 140;
// Each `evalInObsidian` is one `Runtime.evaluate`, which the CDP transport caps at 30 s — so every wait
// Inside a closure has to leave room for the round trip. The first code-button execution in a fresh
// Session also loads babel-standalone, which is far slower than any warm run.
const WAIT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 100;

interface ClickButtonResult {
  readonly isRegistered: boolean;
  readonly isSuccess: boolean;
  readonly output: string;
}

async function clickButton(caption: string): Promise<ClickButtonResult> {
  return await evalInObsidian({
    async callback({ app, caption: buttonCaption, commandId, intervalMs, lib: { waitUntil }, obsidianModule, timeoutMs }) {
      function block(): HTMLElement | undefined {
        return [
          ...app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.containerEl
            .querySelectorAll<HTMLElement>(':scope .block-language-code-button') ?? []
        ]
          .find((candidate) => candidate.textContent.includes(buttonCaption));
      }

      const button = block()?.querySelector<HTMLButtonElement>('button.mod-cta');
      if (!button) {
        throw new Error(`Button not found: ${buttonCaption}`);
      }

      button.click();

      // Captured inside the predicate rather than re-read afterwards: writing the script into the vault
      // Re-renders the reading view, which replaces the block and takes its results panel with it.
      let output = '';

      await waitUntil({
        intervalInMilliseconds: intervalMs,
        message: `"${buttonCaption}" to finish running`,
        predicate: (): boolean => {
          const text = block()?.textContent ?? '';
          if (!/Executed (?:successfully|with error)/.test(text)) {
            return false;
          }

          output = text;
          return true;
        },
        timeoutInMilliseconds: timeoutMs
      });

      const RESULT_TAIL_LENGTH = 1200;
      return {
        isRegistered: Object.hasOwn(app.commands.commands, commandId),
        isSuccess: output.includes('Executed successfully'),
        // The block's text starts with the caption and the whole source panel, so only its tail — where
        // The results panel is — is worth reporting when an assertion fails.
        output: output.slice(-RESULT_TAIL_LENGTH)
      };
    },
    input: { caption, commandId: COMMAND_ID, intervalMs: POLL_INTERVAL_MS, timeoutMs: WAIT_TIMEOUT_MS },
    vaultPath: vaultPath()
  });
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

// The deliberately-broken script demonstrates what the plugin does when a script exports the removed
// `invokeCommand` object: it reports the deprecation when the script is REGISTERED, and again on every
// Invocation. Registering it at vault load meant four error stacks greeted every first-time visitor, so
// The script now lives outside the invocable scripts folder and the note's two buttons put it there on
// Demand and take it back out. This asserts both halves: nothing at load, everything on demand.
describe('deprecated invokeCommand demo', () => {
  it('registers no command for the deliberately broken script when the vault loads', async () => {
    const result = await evalInObsidian({
      callback({ app, commandId }) {
        return { isRegistered: Object.hasOwn(app.commands.commands, commandId) };
      },
      input: { commandId: COMMAND_ID },
      vaultPath: vaultPath()
    });

    expect(result.isRegistered).toBe(false);
  });

  describe('the note buttons', () => {
    beforeAll(async () => {
      const result = await evalInObsidian({
        async callback({ app, buttonsLine, expectedButtonCount, intervalMs, lib: { waitUntil }, notePath, obsidianModule, timeoutMs }) {
          function activeView(): InstanceType<typeof obsidianModule.MarkdownView> | null {
            return app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          }

          function blockCount(): number {
            return activeView()?.containerEl.querySelectorAll(':scope .block-language-code-button button.mod-cta').length ?? 0;
          }

          await app.workspace.openLinkText(notePath.replace(/\.md$/, ''), '', false);
          const leaf = app.workspace.getLeaf(false);
          await leaf.setViewState({
            state: { file: notePath, mode: 'preview' },
            type: 'markdown'
          });
          await app.workspace.revealLeaf(leaf);

          // Reading view renders lazily and both buttons are far below the fold, so the predicate scrolls
          // On every poll until they have materialized rather than waiting for a view that never grows.
          await waitUntil({
            intervalInMilliseconds: intervalMs,
            message: 'both code buttons to render',
            predicate: (): boolean => {
              activeView()?.currentMode.applyScroll(buttonsLine);
              return blockCount() >= expectedButtonCount;
            },
            timeoutInMilliseconds: timeoutMs
          });

          return { blockCount: blockCount() };
        },
        input: {
          buttonsLine: BUTTONS_LINE,
          expectedButtonCount: EXPECTED_BUTTON_COUNT,
          intervalMs: POLL_INTERVAL_MS,
          notePath: NOTE_PATH,
          timeoutMs: WAIT_TIMEOUT_MS
        },
        vaultPath: vaultPath()
      });

      expect(result.blockCount).toBeGreaterThanOrEqual(EXPECTED_BUTTON_COUNT);
    });

    it('registers the command while armed and unregisters it again', async () => {
      const armed = await clickButton(ADD_BUTTON_CAPTION);
      expect(armed.isSuccess, armed.output).toBe(true);
      expect(armed.isRegistered).toBe(true);

      const disarmed = await clickButton(REMOVE_BUTTON_CAPTION);
      expect(disarmed.isSuccess, disarmed.output).toBe(true);
      expect(disarmed.isRegistered).toBe(false);
    });
  });
});
