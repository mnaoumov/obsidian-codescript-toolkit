import type { ConsoleDebugComponent } from '@mnaoumov/obsidian-lib/components/console-debug-component';
import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { App } from 'obsidian';
import type { Mock } from 'vitest';

import { noop } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';
import type { InvocableScriptsFolderTrust } from './invocable-scripts-folder-trust.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import { ScriptRegistryComponent } from './script-registry.ts';
import { ScriptManager } from './script.ts';

interface SelectItemArguments {
  readonly itemTextFunction: (s: string) => string;
}

const mockSelectItem = vi.fn();

vi.mock('@mnaoumov/obsidian-lib/modals/select-item', () => ({
  selectItem: (...$arguments: unknown[]): unknown => mockSelectItem(...$arguments)
}));

vi.mock('./code-script-toolkit-note-settings.ts', () => ({
  getCodeScriptToolkitNoteSettings: vi.fn().mockResolvedValue({ defaultCodeScriptName: '', invocableCodeScriptName: '', isInvocable: false })
}));

vi.mock('./script-registry.ts', () => ({
  ScriptRegistryComponent: class MockScriptRegistryComponent {
    public invokeScriptPath = vi.fn().mockResolvedValue(undefined);
    public registerScript = vi.fn().mockResolvedValue(undefined);
    public unregisterInvocableCommands = vi.fn();
  }
}));

interface MockAdapter {
  readonly exists: ReturnType<typeof vi.fn>;
  readonly list: ReturnType<typeof vi.fn>;
}

interface MockApp {
  readonly vault: MockVault;
}

interface MockConsoleDebugComponent {
  readonly consoleDebug: ReturnType<typeof vi.fn>;
}

interface MockPluginSettingsComponent {
  readonly settings: MockSettings;
}

interface MockSettings {
  readonly getInvocableScriptsFolder: ReturnType<typeof vi.fn>;
}

interface MockTrust {
  readonly isTrusted: ReturnType<typeof vi.fn>;
  readonly promptForTrust: Mock<() => Promise<boolean>>;
  readonly shouldPromptAutomatically: ReturnType<typeof vi.fn>;
}

interface MockVault {
  readonly adapter: MockAdapter;
}

function createMockApp(): MockApp {
  return {
    vault: {
      adapter: {
        exists: vi.fn(),
        list: vi.fn().mockResolvedValue({ files: [], folders: [] })
      }
    }
  };
}

function createMockConsoleDebugComponent(): MockConsoleDebugComponent {
  return {
    consoleDebug: vi.fn()
  };
}

function createMockPluginSettingsComponent(): MockPluginSettingsComponent {
  return {
    settings: {
      getInvocableScriptsFolder: vi.fn()
    }
  };
}

describe('ScriptManager', () => {
  let mockApp: MockApp;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockConsoleDebugComponent: MockConsoleDebugComponent;
  let scriptRegistry: ScriptRegistryComponent;
  let scriptManager: ScriptManager;
  let mockTrust: MockTrust;

  beforeEach(() => {
    mockSelectItem.mockReset();
    vi.mocked(getCodeScriptToolkitNoteSettings).mockReset();
    vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
      defaultCodeScriptName: '',
      invocableCodeScriptName: '',
      isInvocable: false
    });

    mockApp = createMockApp();
    mockPluginSettingsComponent = createMockPluginSettingsComponent();
    mockConsoleDebugComponent = createMockConsoleDebugComponent();
    scriptRegistry = castTo<ScriptRegistryComponent>(new ScriptRegistryComponent(castTo<ConstructorParameters<typeof ScriptRegistryComponent>[0]>({})));

    mockTrust = {
      isTrusted: vi.fn().mockReturnValue(true),
      promptForTrust: vi.fn().mockResolvedValue(false),
      shouldPromptAutomatically: vi.fn().mockReturnValue(false)
    };

    scriptManager = new ScriptManager({
      app: castTo<App>(mockApp),
      consoleDebugComponent: castTo<ConsoleDebugComponent>(mockConsoleDebugComponent),
      invocableScriptsFolderTrust: castTo<InvocableScriptsFolderTrust>(mockTrust),
      pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
        showNotice: vi.fn()
      }),
      pluginSettingsComponent: castTo<PluginSettingsComponent>(mockPluginSettingsComponent),
      scriptRegistry
    });
  });

  describe('registerInvocableScripts', () => {
    it('should unregister existing commands before registering new ones', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.unregisterInvocableCommands).toHaveBeenCalledOnce();
    });

    it('should return early when invocable scripts folder is empty', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
    });

    it('should show error notice when folder does not exist', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(false);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        noop();
      });

      try {
        await scriptManager.registerInvocableScripts();

        expect(consoleErrorSpy).toHaveBeenCalledWith(`Invocable scripts folder not found: ${FOLDER}`);
        expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should register scripts found in the folder', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: ['scripts/hello.js', 'scripts/world.ts'],
        folders: []
      });

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.registerScript).toHaveBeenCalledTimes(2);
      expect(scriptRegistry.registerScript).toHaveBeenCalledWith('hello.js');
      expect(scriptRegistry.registerScript).toHaveBeenCalledWith('world.ts');
    });

    it('should register invocable markdown files', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: ['scripts/note.md'],
        folders: []
      });
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({ defaultCodeScriptName: '', invocableCodeScriptName: '', isInvocable: true });

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.registerScript).toHaveBeenCalledWith('note.md');
    });

    it('should skip non-script and non-invocable files', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: ['scripts/readme.txt', 'scripts/data.json'],
        folders: []
      });

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
    });

    it('should skip non-invocable markdown files', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: ['scripts/note.md'],
        folders: []
      });
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({ defaultCodeScriptName: '', invocableCodeScriptName: '', isInvocable: false });

      await scriptManager.registerInvocableScripts();

      expect(getCodeScriptToolkitNoteSettings).toHaveBeenCalledWith(
        mockApp,
        'scripts/note.md'
      );
      expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
    });

    it('should run concurrent registrations one at a time, and fold the ones queued behind a running one into one', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({ files: ['scripts/a.js'], folders: [] });

      let running = 0;
      let maxRunning = 0;
      let releaseFirst: () => void = noop;
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      let callCount = 0;
      vi.mocked(scriptRegistry.registerScript).mockImplementation(async () => {
        callCount++;
        running++;
        maxRunning = Math.max(maxRunning, running);
        if (callCount === 1) {
          await firstGate;
        }
        running--;
      });

      const first = scriptManager.registerInvocableScripts();
      await vi.waitFor(() => {
        expect(scriptRegistry.registerScript).toHaveBeenCalledOnce();
      });
      const second = scriptManager.registerInvocableScripts();
      const third = scriptManager.registerInvocableScripts();

      releaseFirst();
      await Promise.all([first, second, third]);

      expect(maxRunning).toBe(1);
      expect(scriptRegistry.unregisterInvocableCommands).toHaveBeenCalledTimes(2);
      expect(scriptRegistry.registerScript).toHaveBeenCalledTimes(2);
    });

    it('should still run a queued registration after the running one fails', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('scripts');
      mockApp.vault.adapter.exists.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(false);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(noop);

      try {
        const first = scriptManager.registerInvocableScripts();
        const firstAssertion = expect(first).rejects.toThrow('boom');
        await vi.waitFor(() => {
          expect(scriptRegistry.unregisterInvocableCommands).toHaveBeenCalledOnce();
        });
        const second = scriptManager.registerInvocableScripts();

        await firstAssertion;
        await expect(second).resolves.toBeUndefined();
        expect(scriptRegistry.unregisterInvocableCommands).toHaveBeenCalledTimes(2);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should recursively search subfolders', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list
        .mockResolvedValueOnce({
          files: ['scripts/root.js'],
          folders: ['scripts/sub']
        })
        .mockResolvedValueOnce({
          files: ['scripts/sub/nested.ts'],
          folders: []
        });

      await scriptManager.registerInvocableScripts();

      expect(scriptRegistry.registerScript).toHaveBeenCalledTimes(2);
      expect(scriptRegistry.registerScript).toHaveBeenCalledWith('root.js');
      expect(scriptRegistry.registerScript).toHaveBeenCalledWith('sub/nested.ts');
    });

    describe('when the folder is not trusted', () => {
      const FOLDER = 'scripts';

      beforeEach(() => {
        mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
        mockApp.vault.adapter.exists.mockResolvedValue(true);
        mockApp.vault.adapter.list.mockResolvedValue({ files: ['scripts/hello.js'], folders: [] });
        mockTrust.isTrusted.mockReturnValue(false);
      });

      it('should neither list nor register any script', async () => {
        await scriptManager.registerInvocableScripts();

        expect(mockApp.vault.adapter.list).not.toHaveBeenCalled();
        expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
      });

      it('should not prompt when the folder was already asked about', async () => {
        await scriptManager.registerInvocableScripts();

        expect(mockTrust.promptForTrust).not.toHaveBeenCalled();
      });

      it('should prompt, and register nothing when the user declines', async () => {
        mockTrust.shouldPromptAutomatically.mockReturnValue(true);

        await scriptManager.registerInvocableScripts();
        await vi.waitFor(() => {
          expect(mockTrust.promptForTrust).toHaveBeenCalledOnce();
        });

        expect(scriptRegistry.registerScript).not.toHaveBeenCalled();
      });

      it('should register the scripts once the user trusts the folder', async () => {
        mockTrust.shouldPromptAutomatically.mockReturnValueOnce(true);
        mockTrust.promptForTrust.mockImplementation(() => {
          mockTrust.isTrusted.mockReturnValue(true);
          return Promise.resolve(true);
        });

        await scriptManager.registerInvocableScripts();

        await vi.waitFor(() => {
          expect(scriptRegistry.registerScript).toHaveBeenCalledWith('hello.js');
        });
      });
    });
  });

  describe('selectAndInvokeScript', () => {
    it('should show error item when no folder is configured', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      expect(mockSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['Error: No Invocable scripts folder specified in the settings']
        })
      );
    });

    it('should show error item when folder does not exist', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(false);
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      expect(mockSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [`Error: Invocable scripts folder not found: ${FOLDER}`]
        })
      );
    });

    it('should list scripts when folder exists', async () => {
      const FOLDER = 'scripts';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: ['scripts/test.js'],
        folders: []
      });
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      expect(mockSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['test.js']
        })
      );
    });

    it('should debug log when no script is selected', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      expect(mockConsoleDebugComponent.consoleDebug).toHaveBeenCalledWith('No script selected');
    });

    it('should not invoke when an error item is selected', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue('Error: No Invocable scripts folder specified in the settings');

      await scriptManager.selectAndInvokeScript();

      expect(scriptRegistry.invokeScriptPath).not.toHaveBeenCalled();
    });

    it('should invoke the selected script', async () => {
      const FOLDER = 'scripts';
      const SCRIPT_PATH = 'test.js';
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.list.mockResolvedValue({
        files: [`${FOLDER}/${SCRIPT_PATH}`],
        folders: []
      });
      mockSelectItem.mockResolvedValue(SCRIPT_PATH);

      await scriptManager.selectAndInvokeScript();

      expect(scriptRegistry.invokeScriptPath).toHaveBeenCalledWith(SCRIPT_PATH);
    });

    describe('when the folder is not trusted', () => {
      const FOLDER = 'scripts';
      const SCRIPT_PATH = 'test.js';

      beforeEach(() => {
        mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue(FOLDER);
        mockApp.vault.adapter.exists.mockResolvedValue(true);
        mockApp.vault.adapter.list.mockResolvedValue({ files: [`${FOLDER}/${SCRIPT_PATH}`], folders: [] });
        mockSelectItem.mockResolvedValue(SCRIPT_PATH);
        mockTrust.isTrusted.mockReturnValue(false);
      });

      it('should not invoke the script when the user declines to trust the folder', async () => {
        await scriptManager.selectAndInvokeScript();

        expect(mockTrust.promptForTrust).toHaveBeenCalledOnce();
        expect(scriptRegistry.invokeScriptPath).not.toHaveBeenCalled();
      });

      it('should register the folder and invoke the script once the user trusts it', async () => {
        mockTrust.promptForTrust.mockImplementation(() => {
          mockTrust.isTrusted.mockReturnValue(true);
          return Promise.resolve(true);
        });

        await scriptManager.selectAndInvokeScript();

        expect(scriptRegistry.registerScript).toHaveBeenCalledWith(SCRIPT_PATH);
        expect(scriptRegistry.invokeScriptPath).toHaveBeenCalledWith(SCRIPT_PATH);
      });
    });

    it('should pass correct placeholder to selectItem', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      expect(mockSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: 'Choose a script to invoke'
        })
      );
    });

    it('should pass itemTextFunction that returns the script path as-is', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      const callArguments = mockSelectItem.mock.calls[0]?.[0] as SelectItemArguments | undefined;
      expect(callArguments?.itemTextFunction).toBeDefined();
      const result = callArguments?.itemTextFunction('test-script.js');
      expect(result).toBe('test-script.js');
    });
  });
});
