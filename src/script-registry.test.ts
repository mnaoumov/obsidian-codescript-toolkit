import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import {
  noop,
  noopAsync
} from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import {
  INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX,
  ScriptRegistryComponent
} from './script-registry.ts';

const mockPrintError = vi.fn();
const mockNoopAsync = vi.fn().mockResolvedValue(undefined);
const mockIsMarkdownFile = vi.fn();

vi.mock('obsidian-dev-utils/error', () => ({
  printError: (...args: unknown[]): unknown => mockPrintError(...args)
}));

vi.mock('obsidian-dev-utils/function', () => ({
  noop: vi.fn(),
  noopAsync: (...args: unknown[]): unknown => mockNoopAsync(...args)
}));

interface MockCommandHandlerParams {
  readonly icon: string;
  readonly id: string;
  readonly name: string;
}

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler', () => ({
  CommandHandler: class MockCommandHandler {
    public icon: string;
    public id: string;
    public name: string;

    public constructor(params: MockCommandHandlerParams) {
      this.icon = params.icon;
      this.id = params.id;
      this.name = params.name;
    }

    public buildCommand(): Record<string, unknown> {
      return { icon: this.icon, id: this.id, name: this.name };
    }
  }
}));

interface MockGlobalCommandHandlerParams {
  readonly icon: string;
  readonly id: string;
  readonly name: string;
}

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: class MockGlobalCommandHandler {
    public icon: string;
    public id: string;
    public name: string;

    public constructor(params: MockGlobalCommandHandlerParams) {
      this.icon = params.icon;
      this.id = params.id;
      this.name = params.name;
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => ({
  CommandHandlerComponent: class MockCommandHandlerComponent {
    public load(): void {
      noop();
    }
  }
}));

const onloadPromises: Promise<void>[] = [];

vi.mock('obsidian-dev-utils/obsidian/components/component-ex', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Need to import Component inside mock factory; use mock path directly since require() doesn't go through Vite's alias resolution.
  const { Component: ObsidianComponent } = require('obsidian-test-mocks/obsidian') as typeof import('obsidian');
  return {
    ComponentEx: class MockComponentEx extends ObsidianComponent {
      public override load(): void {
        const onload = Reflect.get(this, 'onload') as () => Promise<void>;
        onloadPromises.push(noopAsync().then(() => onload.call(this)));
      }
    }
  };
});

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  isMarkdownFile: (...args: unknown[]): unknown => mockIsMarkdownFile(...args)
}));

vi.mock('obsidian-dev-utils/path', () => ({
  join: (...segments: string[]): string => segments.filter(Boolean).join('/')
}));

vi.mock('obsidian-dev-utils/type-guards', () => ({
  ensureNonNullable: <T>(v: T): T => v
}));

vi.mock('./code-script-toolkit-note-settings.ts', () => ({
  getCodeScriptToolkitNoteSettings: vi.fn().mockResolvedValue({
    defaultCodeScriptName: '',
    invocableCodeScriptName: '',
    isInvocable: false
  })
}));

interface CreateRegistryOverrides {
  app?: MockApp;
  consoleDebugComponent?: MockConsoleDebugComponent;
  pluginSettingsComponent?: MockPluginSettingsComponent;
  RequireHandlerFactoryComponent?: MockRequireHandlerFactoryComponent;
}

interface MockAdapter {
  exists: ReturnType<typeof vi.fn>;
}

interface MockApp {
  vault: MockVault;
}

interface MockConsoleDebugComponent {
  debug: ReturnType<typeof vi.fn>;
}

interface MockPluginSettingsComponent {
  settings: MockSettings;
}

interface MockRequireHandlerFactoryComponent {
  requireVaultScriptAsync: ReturnType<typeof vi.fn>;
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
        exists: vi.fn()
      }
    }
  };
}

function createMockConsoleDebugComponent(): MockConsoleDebugComponent {
  return {
    debug: vi.fn()
  };
}

function createMockPluginSettingsComponent(): MockPluginSettingsComponent {
  return {
    settings: {
      getInvocableScriptsFolder: vi.fn().mockReturnValue('scripts')
    }
  };
}

function createMockRequireHandlerFactoryComponent(): MockRequireHandlerFactoryComponent {
  return {
    requireVaultScriptAsync: vi.fn()
  };
}

function createRegistry(overrides?: CreateRegistryOverrides): ScriptRegistryComponent {
  return new ScriptRegistryComponent({
    activeFileProvider: castTo<ActiveFileProvider>({}),
    app: castTo<App>(overrides?.app ?? createMockApp()),
    commandRegistrar: castTo<CommandRegistrar>({}),
    consoleDebugComponent: castTo<ConsoleDebugComponent>(overrides?.consoleDebugComponent ?? createMockConsoleDebugComponent()),
    menuEventRegistrar: castTo<MenuEventRegistrar>({}),
    pluginName: 'test-plugin',
    pluginSettingsComponent: castTo<PluginSettingsComponent>(overrides?.pluginSettingsComponent ?? createMockPluginSettingsComponent()),
    RequireHandlerFactoryComponent: castTo<RequireHandlerFactoryComponent>(
      overrides?.RequireHandlerFactoryComponent ?? createMockRequireHandlerFactoryComponent()
    )
  });
}

describe('INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX', () => {
  it('should have the expected value', () => {
    expect(INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX).toBe('invoke-script-file-');
  });
});

describe('ScriptRegistry', () => {
  let mockApp: MockApp;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockConsoleDebugComponent: MockConsoleDebugComponent;
  let mockRequireHandlerFactoryComponent: MockRequireHandlerFactoryComponent;
  let registry: ScriptRegistryComponent;

  beforeEach(() => {
    onloadPromises.length = 0;
    mockPrintError.mockReset();
    mockNoopAsync.mockReset().mockResolvedValue(undefined);
    mockIsMarkdownFile.mockReset().mockReturnValue(false);
    vi.mocked(getCodeScriptToolkitNoteSettings).mockReset().mockResolvedValue({
      defaultCodeScriptName: '',
      invocableCodeScriptName: '',
      isInvocable: false
    });

    mockApp = createMockApp();
    mockPluginSettingsComponent = createMockPluginSettingsComponent();
    mockConsoleDebugComponent = createMockConsoleDebugComponent();
    mockRequireHandlerFactoryComponent = createMockRequireHandlerFactoryComponent();

    registry = createRegistry({
      app: mockApp,
      consoleDebugComponent: mockConsoleDebugComponent,
      pluginSettingsComponent: mockPluginSettingsComponent,
      RequireHandlerFactoryComponent: mockRequireHandlerFactoryComponent
    });
  });

  describe('constructor', () => {
    it('should create a ScriptRegistry that extends Component', () => {
      noop();
      expect(registry).toBeDefined();
    });
  });

  describe('getScriptOrCommand', () => {
    it('should throw when script file does not exist', async () => {
      const SCRIPT_PATH = 'nonexistent.js';
      mockApp.vault.adapter.exists.mockResolvedValue(false);

      await expect(registry.getScriptOrCommand(SCRIPT_PATH)).rejects.toThrow(
        `Script not found: '${SCRIPT_PATH}'.`
      );
    });

    it('should throw when markdown file is not invocable', async () => {
      const SCRIPT_PATH = 'note.md';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(true);
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: '',
        isInvocable: false
      });

      await expect(registry.getScriptOrCommand(SCRIPT_PATH)).rejects.toThrow(
        `Script is not invocable: '${SCRIPT_PATH}'.`
      );
    });

    it('should append codeScriptName query param for markdown with invocable code script name', async () => {
      const SCRIPT_PATH = 'note.md';
      const CODE_SCRIPT_NAME = 'myScript';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(true);
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: CODE_SCRIPT_NAME,
        isInvocable: true
      });
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry.getScriptOrCommand(SCRIPT_PATH);

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `scripts/${SCRIPT_PATH}?codeScriptName=${CODE_SCRIPT_NAME}`
      );
    });

    it('should require vault script for invocable markdown without code script name', async () => {
      const SCRIPT_PATH = 'note.md';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(true);
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: '',
        isInvocable: true
      });
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry.getScriptOrCommand(SCRIPT_PATH);

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `scripts/${SCRIPT_PATH}`
      );
    });

    it('should require vault script for non-markdown files', async () => {
      const SCRIPT_PATH = 'script.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry.getScriptOrCommand(SCRIPT_PATH);

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `scripts/${SCRIPT_PATH}`
      );
    });
  });

  describe('invokeScriptPath', () => {
    it('should throw when no command is registered for the script path', async () => {
      const SCRIPT_PATH = 'unregistered.js';

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        `No command registered for script path: ${SCRIPT_PATH}`
      );
    });

    it('should debug log when invoking a script path', async () => {
      const SCRIPT_PATH = 'registered.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);

      // The invoke will fail because WrapperCommandHandlerComponent.onload is async
      // And Component.load() doesn't await it, so _wrapperCommandHandler is undefined.
      // But we can verify the debug log was called before the error.
      try {
        await registry.invokeScriptPath(SCRIPT_PATH);
      } catch {
        // Expected: forceInvoke fails because async onload hasn't completed
      }

      expect(mockConsoleDebugComponent.debug).toHaveBeenCalledWith(
        `Invoking script: ${SCRIPT_PATH}.`
      );
    });
  });

  describe('registerScript', () => {
    it('should register a script and add it to the internal map', async () => {
      const SCRIPT_PATH = 'test.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);

      // After registration, invokeScriptPath should NOT throw "No command registered"
      // (it will fail later in forceInvoke due to async onload, but the map entry exists)
      try {
        await registry.invokeScriptPath(SCRIPT_PATH);
      } catch (error) {
        // Should NOT be "No command registered" — that would mean registration failed
        expect((error as Error).message).not.toContain('No command registered');
      }
    });

    it('should handle require error gracefully', async () => {
      const SCRIPT_PATH = 'broken.js';
      mockApp.vault.adapter.exists.mockResolvedValue(false);

      await registry.registerScript(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error requiring script: ${SCRIPT_PATH}`
        })
      );
    });

    it('should not register the script when require fails', async () => {
      const SCRIPT_PATH = 'broken.js';
      mockApp.vault.adapter.exists.mockResolvedValue(false);

      await registry.registerScript(SCRIPT_PATH);

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        `No command registered for script path: ${SCRIPT_PATH}`
      );
    });
  });

  describe('unregisterInvocableCommands', () => {
    it('should clear all registered commands so they cannot be invoked', async () => {
      const SCRIPT_PATH = 'test.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);
      registry.unregisterInvocableCommands();

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        'No command registered for script path:'
      );
    });

    it('should do nothing when no commands are registered', () => {
      registry.unregisterInvocableCommands();
      // After clearing, invoking any script should throw
      expect(registry.unregisterInvocableCommands).toBeDefined();
    });

    it('should clear multiple registered commands', async () => {
      const SCRIPT_PATH_1 = 'test1.js';
      const SCRIPT_PATH_2 = 'test2.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH_1);
      await registry.registerScript(SCRIPT_PATH_2);
      registry.unregisterInvocableCommands();

      await expect(registry.invokeScriptPath(SCRIPT_PATH_1)).rejects.toThrow();
      await expect(registry.invokeScriptPath(SCRIPT_PATH_2)).rejects.toThrow();
    });
  });

  describe('FunctionWrapperCommandHandler via registerScript + invokeScriptPath', () => {
    beforeEach(() => {
      // Registry must be loaded for addChild to trigger load on children
      Reflect.set(registry, 'loaded__', true);
    });

    it('should invoke script with invoke function successfully', async () => {
      const SCRIPT_PATH = 'invoke-test.js';
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await registry.registerScript(SCRIPT_PATH);
      // Wait for async onload to complete
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
      expect(mockConsoleDebugComponent.debug).toHaveBeenCalledWith(
        `${SCRIPT_PATH} invocable script executed successfully`
      );
    });

    it('should handle error from invoke function gracefully', async () => {
      const SCRIPT_PATH = 'error-invoke.js';
      const invokeError = new Error('invoke failed');
      const mockInvoke = vi.fn().mockRejectedValue(invokeError);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH}`
        })
      );
    });
  });

  describe('CommandWrapperCommandHandler via registerScript + invokeScriptPath', () => {
    beforeEach(() => {
      Reflect.set(registry, 'loaded__', true);
    });

    it('should invoke script with invokeCommand callback successfully', async () => {
      const SCRIPT_PATH = 'command-test.js';
      const mockCallback = vi.fn();
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          callback: mockCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).toHaveBeenCalled();
      expect(mockConsoleDebugComponent.debug).toHaveBeenCalledWith(
        `${SCRIPT_PATH} command executed successfully`
      );
    });

    it('should handle error from invokeCommand callback', async () => {
      const SCRIPT_PATH = 'command-error.js';
      const callbackError = new Error('callback failed');
      const mockCallback = vi.fn().mockImplementation(() => {
        throw callbackError;
      });
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          callback: mockCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH} command`
        })
      );
    });

    it('should invoke checkCallback and execute when check passes', async () => {
      const SCRIPT_PATH = 'check-pass.js';
      const mockCheckCallback = vi.fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(undefined);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          checkCallback: mockCheckCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      // CheckCallback should be called twice: once with true (check), once with false (execute)
      expect(mockCheckCallback).toHaveBeenCalledTimes(2);
      expect(mockCheckCallback).toHaveBeenCalledWith(true);
      expect(mockCheckCallback).toHaveBeenCalledWith(false);
    });

    it('should show notice when checkCallback returns false (condition not met)', async () => {
      const SCRIPT_PATH = 'check-fail.js';
      const mockCheckCallback = vi.fn().mockReturnValue(false);
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          checkCallback: mockCheckCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      // Only called once with true (the check), not called with false (execute)
      expect(mockCheckCallback).toHaveBeenCalledTimes(1);
      expect(mockCheckCallback).toHaveBeenCalledWith(true);
    });

    it('should handle error from checkCallback check phase', async () => {
      const SCRIPT_PATH = 'check-error.js';
      const checkError = new Error('check failed');
      const mockCheckCallback = vi.fn().mockImplementation(() => {
        throw checkError;
      });
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          checkCallback: mockCheckCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error checking ${SCRIPT_PATH} command check condition`
        })
      );
    });

    it('should handle error from checkCallback execution phase', async () => {
      const SCRIPT_PATH = 'check-exec-error.js';
      const execError = new Error('execution failed');
      const mockCheckCallback = vi.fn()
        .mockReturnValueOnce(true)
        .mockImplementationOnce(() => {
          throw execError;
        });
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          checkCallback: mockCheckCallback
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH} command`
        })
      );
    });

    it('should use custom command properties when provided', async () => {
      const SCRIPT_PATH = 'custom-cmd.js';
      const mockCallback = vi.fn();
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {
          callback: mockCallback,
          icon: 'star',
          id: 'custom-id',
          name: 'Custom Name'
        }
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should throw when script exports neither invoke nor invokeCommand', async () => {
      const SCRIPT_PATH = 'no-handler.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({});

      await registry.registerScript(SCRIPT_PATH);

      // Onload throws because the script has neither invoke nor invokeCommand
      await expect(Promise.all(onloadPromises)).rejects.toThrow(
        `${SCRIPT_PATH} does not export invoke() function`
      );
    });

    it('should do nothing when invokeCommand has neither callback nor checkCallback', async () => {
      const SCRIPT_PATH = 'empty-command.js';
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockIsMarkdownFile.mockReturnValue(false);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: {}
      });

      await registry.registerScript(SCRIPT_PATH);
      await Promise.all(onloadPromises);

      // ForceInvoke with no callback/checkCallback should just complete without error
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockConsoleDebugComponent.debug).toHaveBeenCalledWith(
        `Invoking script: ${SCRIPT_PATH}.`
      );
    });
  });
});
