import type { App } from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Mock } from 'vitest';

import { Component } from 'obsidian';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { App as ObsidianTestApp } from 'obsidian-test-mocks/obsidian';
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
import { ScriptRegistryComponent } from './script-registry.ts';

const mockPrintError = vi.fn();

const INVOCABLE_SCRIPTS_FOLDER = 'scripts';

// Only `printError` is stubbed (a thin return-value passthrough so the test can assert which error
// Was reported). All other real exports of `obsidian-dev-utils/error` (e.g. `getStackTrace`, used by
// The real command-handler infrastructure) are preserved via `importOriginal`. No dev-utils logic is
// Reimplemented (printError only logs to console).
vi.mock('obsidian-dev-utils/error', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/error')>(),
  printError: (...$arguments: unknown[]): unknown => (mockPrintError as (...a: unknown[]) => unknown)(...$arguments)
}));

// `getCodeScriptToolkitNoteSettings` is the plugin's OWN sibling module; stubbing it is allowed.
vi.mock('./code-script-toolkit-note-settings.ts', () => ({
  getCodeScriptToolkitNoteSettings: vi.fn().mockResolvedValue({
    defaultCodeScriptName: '',
    invocableCodeScriptName: '',
    isInvocable: false
  })
}));

interface CreateRegistryOverrides {
  app?: App;
  consoleDebugComponent?: ConsoleDebugComponent;
  pluginNoticeComponent?: PluginNoticeComponent;
  RequireHandlerFactoryComponent?: RequireHandlerFactoryComponent;
}

interface MockRequireHandlerFactoryComponent {
  requireVaultScriptAsync: Mock<(id: string) => Promise<unknown>>;
}

function createApp(files: Record<string, string> = {}): App {
  return ObsidianTestApp.createConfigured__({ files }).asOriginalType__();
}

function createConsoleDebugComponent(): ConsoleDebugComponent {
  return strictProxy<ConsoleDebugComponent>({
    consoleDebug: vi.fn<(message: string, ...$arguments: unknown[]) => void>()
  });
}

function createPluginNoticeComponent(): PluginNoticeComponent {
  return strictProxy<PluginNoticeComponent>({
    showNotice: vi.fn()
  });
}

function createPluginSettingsComponent(): PluginSettingsComponent {
  return strictProxy<PluginSettingsComponent>({
    settings: strictProxy<PluginSettingsComponent['settings']>({
      getInvocableScriptsFolder: (): string => INVOCABLE_SCRIPTS_FOLDER
    })
  });
}

function createRegistry(overrides?: CreateRegistryOverrides): ScriptRegistryComponent {
  return new ScriptRegistryComponent({
    app: overrides?.app ?? createApp(),
    commandHandlerComponent: strictProxy<CommandHandlerComponent>({
      registerCommandHandlers: vi.fn(() => ({ dispose: vi.fn(), [Symbol.dispose]: vi.fn() }))
    }),
    consoleDebugComponent: overrides?.consoleDebugComponent ?? createConsoleDebugComponent(),
    pluginNoticeComponent: overrides?.pluginNoticeComponent ?? createPluginNoticeComponent(),
    pluginSettingsComponent: createPluginSettingsComponent(),
    RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>(
      overrides?.RequireHandlerFactoryComponent ?? createRequireHandlerFactoryComponent()
    )
  });
}

function createRequireHandlerFactoryComponent(): MockRequireHandlerFactoryComponent {
  return {
    requireVaultScriptAsync: vi.fn()
  };
}

describe('ScriptRegistry', () => {
  let consoleDebugComponent: ConsoleDebugComponent;
  let consoleDebug: Mock<(message: string, ...$arguments: unknown[]) => void>;
  let pluginNoticeComponent: PluginNoticeComponent;
  let requireHandlerFactoryComponent: MockRequireHandlerFactoryComponent;
  let registry: ScriptRegistryComponent;
  let showNotice: Mock<PluginNoticeComponent['showNotice']>;

  beforeEach(() => {
    mockPrintError.mockReset();
    vi.mocked(getCodeScriptToolkitNoteSettings).mockReset().mockResolvedValue({
      defaultCodeScriptName: '',
      invocableCodeScriptName: '',
      isInvocable: false
    });

    consoleDebug = vi.fn();
    consoleDebugComponent = strictProxy<ConsoleDebugComponent>({ consoleDebug });
    showNotice = vi.fn<PluginNoticeComponent['showNotice']>();
    pluginNoticeComponent = strictProxy<PluginNoticeComponent>({ showNotice });
    requireHandlerFactoryComponent = createRequireHandlerFactoryComponent();
  });

  function createRegistryWithFiles(files: Record<string, string> = {}): ScriptRegistryComponent {
    return createRegistry({
      app: createApp(files),
      consoleDebugComponent,
      pluginNoticeComponent,
      RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>(requireHandlerFactoryComponent)
    });
  }

  describe('constructor', () => {
    it('should create a ScriptRegistry that extends Component', () => {
      registry = createRegistryWithFiles();
      expect(registry).toBeInstanceOf(Component);
    });
  });

  describe('getScriptOrCommand', () => {
    it('should throw when script file does not exist', async () => {
      const SCRIPT_PATH = 'nonexistent.js';
      registry = createRegistryWithFiles();

      await expect(registry['getScriptOrCommand'](SCRIPT_PATH)).rejects.toThrow(
        `Script not found: '${SCRIPT_PATH}'.`
      );
    });

    it('should throw when markdown file is not invocable', async () => {
      const SCRIPT_PATH = 'note.md';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: '',
        isInvocable: false
      });

      await expect(registry['getScriptOrCommand'](SCRIPT_PATH)).rejects.toThrow(
        `Script is not invocable: '${SCRIPT_PATH}'.`
      );
    });

    it('should append codeScriptName query param for markdown with invocable code script name', async () => {
      const SCRIPT_PATH = 'note.md';
      const CODE_SCRIPT_NAME = 'myScript';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: CODE_SCRIPT_NAME,
        isInvocable: true
      });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry['getScriptOrCommand'](SCRIPT_PATH);

      expect(requireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}?codeScriptName=${CODE_SCRIPT_NAME}`
      );
    });

    it('should require vault script for invocable markdown without code script name', async () => {
      const SCRIPT_PATH = 'note.md';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      vi.mocked(getCodeScriptToolkitNoteSettings).mockResolvedValue({
        defaultCodeScriptName: '',
        invocableCodeScriptName: '',
        isInvocable: true
      });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry['getScriptOrCommand'](SCRIPT_PATH);

      expect(requireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`
      );
    });

    it('should require vault script for non-markdown files', async () => {
      const SCRIPT_PATH = 'script.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({ invoke: vi.fn() });

      await registry['getScriptOrCommand'](SCRIPT_PATH);

      expect(requireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(
        `${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`
      );
    });
  });

  describe('invokeScriptPath', () => {
    it('should throw when no command is registered for the script path', async () => {
      const SCRIPT_PATH = 'unregistered.js';
      registry = createRegistryWithFiles();

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        `No command registered for script path: ${SCRIPT_PATH}`
      );
    });

    it('should debug log when invoking a script path', async () => {
      const SCRIPT_PATH = 'registered.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(consoleDebug).toHaveBeenCalledWith(
        `Invoking script: ${SCRIPT_PATH}.`
      );
    });
  });

  describe('registerScript', () => {
    it('should register a script and add it to the internal map', async () => {
      const SCRIPT_PATH = 'test.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);

      // After registration, invokeScriptPath should NOT throw "No command registered".
      await expect(registry.invokeScriptPath(SCRIPT_PATH)).resolves.toBeUndefined();
    });

    it('should handle require error gracefully', async () => {
      const SCRIPT_PATH = 'broken.js';
      registry = createRegistryWithFiles();

      await registry.registerScript(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error requiring script: ${SCRIPT_PATH}`
        })
      );
    });

    it('should not register the script when require fails', async () => {
      const SCRIPT_PATH = 'broken.js';
      registry = createRegistryWithFiles();

      await registry.registerScript(SCRIPT_PATH);

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        `No command registered for script path: ${SCRIPT_PATH}`
      );
    });
  });

  describe('unregisterInvocableCommands', () => {
    it('should clear all registered commands so they cannot be invoked', async () => {
      const SCRIPT_PATH = 'test.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: vi.fn()
      });

      await registry.registerScript(SCRIPT_PATH);
      registry.unregisterInvocableCommands();

      await expect(registry.invokeScriptPath(SCRIPT_PATH)).rejects.toThrow(
        'No command registered for script path:'
      );
    });

    it('should do nothing when no commands are registered', () => {
      registry = createRegistryWithFiles();
      expect(() => {
        registry.unregisterInvocableCommands();
      }).not.toThrow();
    });

    it('should clear multiple registered commands', async () => {
      const SCRIPT_PATH_1 = 'test1.js';
      const SCRIPT_PATH_2 = 'test2.js';
      registry = createRegistryWithFiles({
        [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH_1}`]: '',
        [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH_2}`]: ''
      });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
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
    it('should invoke script with invoke function successfully', async () => {
      const SCRIPT_PATH = 'invoke-test.js';
      const app = createApp({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry = createRegistry({
        app,
        consoleDebugComponent,
        RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>(requireHandlerFactoryComponent)
      });
      registry.load();
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockInvoke).toHaveBeenCalledWith(app);
      expect(consoleDebug).toHaveBeenCalledWith(
        `${SCRIPT_PATH} invocable script executed successfully`
      );
    });

    it('should handle error from invoke function gracefully', async () => {
      const SCRIPT_PATH = 'error-invoke.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const invokeError = new Error('invoke failed');
      const mockInvoke = vi.fn().mockRejectedValue(invokeError);
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH}`
        })
      );
    });
  });

  describe('CommandWrapperCommandHandler via registerScript + invokeScriptPath', () => {
    it('should invoke script with buildInvokeCommand callback successfully', async () => {
      const SCRIPT_PATH = 'command-test.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCallback = vi.fn();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          callback: mockCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).toHaveBeenCalled();
      expect(consoleDebug).toHaveBeenCalledWith(
        `${SCRIPT_PATH} command executed successfully`
      );
    });

    it('should pass the app to buildInvokeCommand', async () => {
      const SCRIPT_PATH = 'command-app.js';
      const app = createApp({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry = createRegistry({
        app,
        consoleDebugComponent,
        RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>(requireHandlerFactoryComponent)
      });
      registry.load();
      const mockBuildInvokeCommand = vi.fn(() => ({ callback: vi.fn() }));
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: mockBuildInvokeCommand
      });

      await registry.registerScript(SCRIPT_PATH);

      expect(mockBuildInvokeCommand).toHaveBeenCalledWith(app);
    });

    it('should await an async buildInvokeCommand', async () => {
      const SCRIPT_PATH = 'command-async.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCallback = vi.fn();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => Promise.resolve({ callback: mockCallback })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).toHaveBeenCalled();
      expect(consoleDebug).toHaveBeenCalledWith(
        `${SCRIPT_PATH} command executed successfully`
      );
    });

    it('should report the error and register a failing command when buildInvokeCommand throws', async () => {
      const SCRIPT_PATH = 'command-build-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const buildError = new Error('build failed');
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => {
          throw buildError;
        }
      });

      await registry.registerScript(SCRIPT_PATH);

      // The failure is reported as soon as it happens, not deferred to the first invocation.
      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: buildError,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );

      // The registered command stays invocable, but invoking it only re-reports the build failure.
      mockPrintError.mockClear();
      showNotice.mockClear();
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: buildError,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );
    });

    it('should wrap a non-Error value thrown by buildInvokeCommand', async () => {
      const SCRIPT_PATH = 'command-build-non-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const THROWN_VALUE = 'build failed';
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- Throwing a non-Error value is what this test covers.
          throw THROWN_VALUE;
        }
      });

      await registry.registerScript(SCRIPT_PATH);

      // The thrown string is normalized to an `Error` so the `cause` chain stays printable.
      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: expect.objectContaining({
            cause: THROWN_VALUE,
            name: 'ErrorWrapper'
          }) as unknown,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
    });

    it('should report the error when an async buildInvokeCommand rejects', async () => {
      const SCRIPT_PATH = 'command-build-async-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const buildError = new Error('async build failed');
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => Promise.reject(buildError)
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: buildError,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
    });

    it('should handle error from buildInvokeCommand callback', async () => {
      const SCRIPT_PATH = 'command-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const callbackError = new Error('callback failed');
      const mockCallback = vi.fn().mockImplementation(() => {
        throw callbackError;
      });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          callback: mockCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH} command`
        })
      );
    });

    it('should invoke checkCallback and execute when check passes', async () => {
      const SCRIPT_PATH = 'check-pass.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCheckCallback = vi.fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(undefined);
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          checkCallback: mockCheckCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      // CheckCallback should be called twice: once with true (check), once with false (execute)
      expect(mockCheckCallback).toHaveBeenCalledTimes(2);
      expect(mockCheckCallback).toHaveBeenCalledWith(true);
      expect(mockCheckCallback).toHaveBeenCalledWith(false);
    });

    it('should show notice when checkCallback returns false (condition not met)', async () => {
      const SCRIPT_PATH = 'check-fail.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCheckCallback = vi.fn().mockReturnValue(false);
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          checkCallback: mockCheckCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      // Only called once with true (the check), not called with false (execute)
      expect(mockCheckCallback).toHaveBeenCalledTimes(1);
      expect(mockCheckCallback).toHaveBeenCalledWith(true);
    });

    it('should handle error from checkCallback check phase', async () => {
      const SCRIPT_PATH = 'check-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const thrownFailure = new Error('check failed');
      const mockCheckCallback = vi.fn().mockImplementation(() => {
        throw thrownFailure;
      });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          checkCallback: mockCheckCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error checking ${SCRIPT_PATH} command check condition`
        })
      );
    });

    it('should handle error from checkCallback execution phase', async () => {
      const SCRIPT_PATH = 'check-exec-error.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const execError = new Error('execution failed');
      const mockCheckCallback = vi.fn()
        .mockReturnValueOnce(true)
        .mockImplementationOnce(() => {
          throw execError;
        });
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          checkCallback: mockCheckCallback
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error invoking ${SCRIPT_PATH} command`
        })
      );
    });

    it('should use custom command properties when provided', async () => {
      const SCRIPT_PATH = 'custom-cmd.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCallback = vi.fn();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({
          callback: mockCallback,
          icon: 'star',
          id: 'custom-id',
          name: 'Custom Name'
        })
      });

      await registry.registerScript(SCRIPT_PATH);
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should report the error when script exports neither invoke nor buildInvokeCommand', async () => {
      const SCRIPT_PATH = 'no-handler.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({});

      // `ComponentEx` swallows an `onloadAsync()` rejection into its load errors, so the failure is
      // Reported eagerly instead of thrown, and registration of the remaining scripts keeps going.
      await registry.registerScript(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: expect.objectContaining({
            message: `${SCRIPT_PATH} does not export \`invoke()\` or \`buildInvokeCommand()\` functions`
          }) as unknown,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );
    });

    it('should re-surface the reason when a script exporting neither invoke nor buildInvokeCommand is invoked', async () => {
      const SCRIPT_PATH = 'no-handler-invoke.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({});

      await registry.registerScript(SCRIPT_PATH);
      mockPrintError.mockClear();
      showNotice.mockClear();
      await registry.invokeScriptPath(SCRIPT_PATH);

      // Invoking the failing command reports the reason again instead of silently doing nothing.
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );
      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
    });

    it('should report the error when script exports the deprecated invokeCommand', async () => {
      const SCRIPT_PATH = 'deprecated-invoke-command.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: { callback: vi.fn() }
      });

      await registry.registerScript(SCRIPT_PATH);

      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: expect.objectContaining({
            message: `${SCRIPT_PATH} exports deprecated \`invokeCommand\`. Rewrite it to use \`buildInvokeCommand()\` instead.`
          }) as unknown,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );
    });

    it('should not run the deprecated invokeCommand callback', async () => {
      const SCRIPT_PATH = 'deprecated-invoke-command-run.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockCallback = vi.fn();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invokeCommand: { callback: mockCallback }
      });

      await registry.registerScript(SCRIPT_PATH);
      showNotice.mockClear();
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(showNotice).toHaveBeenCalledWith(
        `Error building invoke command for ${SCRIPT_PATH}. See console for details.`
      );
    });

    it('should prefer the deprecated invokeCommand error over buildInvokeCommand when both are exported', async () => {
      const SCRIPT_PATH = 'deprecated-and-build.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      const mockBuildInvokeCommand = vi.fn(() => ({ callback: vi.fn() }));
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: mockBuildInvokeCommand,
        invokeCommand: { callback: vi.fn() }
      });

      await registry.registerScript(SCRIPT_PATH);

      expect(mockBuildInvokeCommand).not.toHaveBeenCalled();
      expect(mockPrintError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: expect.objectContaining({
            message: `${SCRIPT_PATH} exports deprecated \`invokeCommand\`. Rewrite it to use \`buildInvokeCommand()\` instead.`
          }) as unknown,
          message: `Error building invoke command for ${SCRIPT_PATH}`
        })
      );
    });

    it('should do nothing when the built command has neither callback nor checkCallback', async () => {
      const SCRIPT_PATH = 'empty-command.js';
      registry = createRegistryWithFiles({ [`${INVOCABLE_SCRIPTS_FOLDER}/${SCRIPT_PATH}`]: '' });
      registry.load();
      requireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        buildInvokeCommand: () => ({})
      });

      await registry.registerScript(SCRIPT_PATH);

      // ForceInvoke with no callback/checkCallback should just complete without error.
      await registry.invokeScriptPath(SCRIPT_PATH);

      expect(consoleDebug).toHaveBeenCalledWith(
        `Invoking script: ${SCRIPT_PATH}.`
      );
    });
  });
});
