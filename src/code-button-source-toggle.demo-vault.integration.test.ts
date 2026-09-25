import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

const NOTE_PATH = '01 Where your code lives/04 Relative path.md';
// Well under the transport's ~30 s per-closure cap; a note rendering lands in well under a second.
const SETTLE_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;

describe('code button source toggle', () => {
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
      input: { intervalMs: POLL_INTERVAL_MS, notePath: NOTE_PATH, settleTimeoutMs: SETTLE_TIMEOUT_MS },
      vaultPath: getTemporaryVault().path
    });

    expect(result.toggleCount).toBeGreaterThan(0);
    expect(result.isCollapsed).toBe(true);
  });
});
