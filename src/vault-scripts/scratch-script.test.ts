import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { App } from 'obsidian';
import type { Mock } from 'vitest';

import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import { App as ObsidianTestApp } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerFactoryComponent } from '../require-handlers/require-handler-factory.ts';
import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';

import {
  SCRATCH_SCRIPT_TEMPLATE,
  ScratchScript
} from './scratch-script.ts';

const mockPrintError = vi.fn();

// Only `printError` is stubbed, so the test can assert what was reported; every other export stays real.
vi.mock('@mnaoumov/typescript-lib/error', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mnaoumov/typescript-lib/error')>(),
  printError: (...$arguments: unknown[]): unknown => (mockPrintError as (...a: unknown[]) => unknown)(...$arguments)
}));

interface CreateScratchScriptParams {
  readonly files?: Record<string, string>;
  readonly path?: string;
}

interface Fixture {
  readonly app: App;
  readonly requireVaultScriptAsync: Mock<(id: string) => Promise<unknown>>;
  readonly scratchScript: ScratchScript;
  readonly showNotice: Mock<PluginNoticeComponent['showNotice']>;
}

function createFixture(params: CreateScratchScriptParams = {}): Fixture {
  const app = ObsidianTestApp.createConfigured__({ files: params.files ?? {} }).asOriginalType__();
  const showNotice = vi.fn<PluginNoticeComponent['showNotice']>();
  const requireVaultScriptAsync = vi.fn<(id: string) => Promise<unknown>>();
  const scratchScript = new ScratchScript({
    app,
    pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
      showNotice
    }),
    pluginSettingsComponent: strictProxy<PluginSettingsComponent>({
      settings: strictProxy<PluginSettingsComponent['settings']>({
        getScratchScriptPath: (): string => params.path ?? 'Scratch script.md'
      })
    }),
    requireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>({
      requireVaultScriptAsync
    })
  });
  return { app, requireVaultScriptAsync, scratchScript, showNotice };
}

function getActiveFilePath(app: App): string | undefined {
  return app.workspace.getActiveFile()?.path;
}

describe('ScratchScript', () => {
  beforeEach(() => {
    mockPrintError.mockClear();
  });

  describe('edit', () => {
    it('should create the note from the template and open it when it does not exist', async () => {
      const { app, scratchScript } = createFixture({ path: 'Scripts/Scratch/Scratch script.md' });

      await scratchScript.edit();

      expect(await app.vault.adapter.read('Scripts/Scratch/Scratch script.md')).toBe(SCRATCH_SCRIPT_TEMPLATE);
      expect(getActiveFilePath(app)).toBe('Scripts/Scratch/Scratch script.md');
    });

    it('should open the existing note without rewriting it', async () => {
      const { app, scratchScript } = createFixture({ files: { 'Scratch script.md': 'my code' } });

      await scratchScript.edit();

      expect(await app.vault.adapter.read('Scratch script.md')).toBe('my code');
      expect(getActiveFilePath(app)).toBe('Scratch script.md');
    });

    it('should report a path that is not configured', async () => {
      const { requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ path: '' });

      await scratchScript.edit();

      expect(showNotice).toHaveBeenCalledWith('Scratch script path is not configured. Set it in the plugin settings.');
      expect(requireVaultScriptAsync).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should invoke the script and report that it finished', async () => {
      const { app, requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ files: { 'Scratch script.md': 'my code' } });
      const invoke = vi.fn<(app: App) => Promise<void>>().mockResolvedValue(undefined);
      requireVaultScriptAsync.mockResolvedValue({ invoke });

      await scratchScript.run();

      expect(requireVaultScriptAsync).toHaveBeenCalledWith('Scratch script.md');
      expect(invoke).toHaveBeenCalledWith(app);
      expect(showNotice).toHaveBeenCalledWith('Scratch script finished');
    });

    it('should create and open a missing note instead of running it', async () => {
      const { app, requireVaultScriptAsync, scratchScript, showNotice } = createFixture();

      await scratchScript.run();

      expect(requireVaultScriptAsync).not.toHaveBeenCalled();
      expect(await app.vault.adapter.read('Scratch script.md')).toBe(SCRATCH_SCRIPT_TEMPLATE);
      expect(getActiveFilePath(app)).toBe('Scratch script.md');
      expect(showNotice).toHaveBeenCalledWith('Scratch script created: Scratch script.md. Write your code in it, then run the command again.');
    });

    it('should report a script that throws', async () => {
      const { requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ files: { 'Scratch script.md': 'my code' } });
      requireVaultScriptAsync.mockResolvedValue({
        invoke: (): never => {
          throw new Error('boom');
        }
      });

      await scratchScript.run();

      expect(mockPrintError).toHaveBeenCalledOnce();
      expect(showNotice).toHaveBeenCalledWith('Error running scratch script Scratch script.md: boom\nSee console for details.');
      expect(showNotice).not.toHaveBeenCalledWith('Scratch script finished');
    });

    it('should report a script that does not export invoke()', async () => {
      const { requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ files: { 'Scratch script.md': 'my code' } });
      requireVaultScriptAsync.mockResolvedValue({});

      await scratchScript.run();

      expect(showNotice).toHaveBeenCalledWith(expect.stringContaining('does not export an `invoke()` function'));
    });

    it('should report a non-Error rejection', async () => {
      const { requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ files: { 'Scratch script.md': 'my code' } });
      requireVaultScriptAsync.mockRejectedValue('plain string');

      await scratchScript.run();

      expect(showNotice).toHaveBeenCalledWith('Error running scratch script Scratch script.md: plain string\nSee console for details.');
    });

    it('should report a path that is not configured', async () => {
      const { requireVaultScriptAsync, scratchScript, showNotice } = createFixture({ path: '' });

      await scratchScript.run();

      expect(showNotice).toHaveBeenCalledWith('Scratch script path is not configured. Set it in the plugin settings.');
      expect(requireVaultScriptAsync).not.toHaveBeenCalled();
    });
  });
});
