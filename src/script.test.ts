import type { App } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';

import { noop } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import { ScriptRegistryComponent } from './script-registry.ts';
import { ScriptManager } from './script.ts';

interface SelectItemArgs {
  itemTextFunc(s: string): string;
}

const mockSelectItem = vi.fn();

vi.mock('obsidian-dev-utils/obsidian/modals/select-item', () => ({
  selectItem: (...args: unknown[]): unknown => mockSelectItem(...args)
}));

vi.mock('obsidian-dev-utils/path', () => ({
  basename: (path: string): string => {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
  },
  join: (...segments: string[]): string => segments.filter(Boolean).join('/')
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
  exists: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
}

interface MockApp {
  vault: MockVault;
}

interface MockConsoleDebugComponent {
  consoleDebug: ReturnType<typeof vi.fn>;
}

interface MockPluginSettingsComponent {
  settings: MockSettings;
}

interface MockSettings {
  getInvocableScriptsFolder: ReturnType<typeof vi.fn>;
}

interface MockVault {
  adapter: MockAdapter;
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

    scriptManager = new ScriptManager({
      app: castTo<App>(mockApp),
      consoleDebugComponent: castTo<ConsoleDebugComponent>(mockConsoleDebugComponent),
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

    it('should pass itemTextFunc that returns the script path as-is', async () => {
      mockPluginSettingsComponent.settings.getInvocableScriptsFolder.mockReturnValue('');
      mockSelectItem.mockResolvedValue(null);

      await scriptManager.selectAndInvokeScript();

      const callArgs = mockSelectItem.mock.calls[0]?.[0] as SelectItemArgs | undefined;
      expect(callArgs?.itemTextFunc).toBeDefined();
      const result = callArgs?.itemTextFunc('test-script.js');
      expect(result).toBe('test-script.js');
    });
  });
});
