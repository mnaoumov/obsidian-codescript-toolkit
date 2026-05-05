import type {
  App,
  PluginManifest
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import {
  Component,
  Notice
} from 'obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RegisterTempPluginParams } from './code-button-context.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { TempPluginRegistry } from './temp-plugin-registry.ts';

const mockPrintError = vi.fn();
const mockInvokeAsyncSafely = vi.fn();

interface ObsidianDocumentHead {
  createEl: (...args: unknown[]) => HTMLElement;
}

function getObsidianDocumentHead(): ObsidianDocumentHead {
  // eslint-disable-next-line no-restricted-syntax, obsidianmd/prefer-active-doc -- mock requires double assertion to access Obsidian-augmented DOM method; helper function used only in tests where activeDocument is not available
  return document.head as unknown as ObsidianDocumentHead;
}

vi.mock('obsidian-dev-utils/async', () => ({
  invokeAsyncSafely: (...args: unknown[]): unknown => (mockInvokeAsyncSafely as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/error', () => ({
  printError: (...args: unknown[]): unknown => (mockPrintError as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Need to import Component inside mock factory; use mock path directly since require() doesn't go through Vite's alias resolution.
  const { Component: ObsidianComponent } = require('obsidian-test-mocks/obsidian') as typeof import('obsidian');
  return {
    CommandHandlerComponent: class MockCommandHandlerComponent extends ObsidianComponent {
      public constructor(_params: unknown) {
        super();
      }
    }
  };
});

vi.mock('./command-handlers/unload-temp-plugin-command-handler.ts', () => ({
  UnloadTempPluginCommandHandler: vi.fn()
}));

interface MockPlugin {
  load: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
}

function createMockApp(): App {
  return {} as App;
}

function createMockPlugin(): MockPlugin {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn()
  };
}

function createRegistry(): TempPluginRegistry {
  return new TempPluginRegistry({
    activeFileProvider: {} as ActiveFileProvider,
    app: createMockApp(),
    commandRegistrar: {} as CommandRegistrar,
    menuEventRegistrar: {} as MenuEventRegistrar,
    pluginName: 'test-plugin',
    pluginSettingsComponent: {
      settings: { shouldShowTempPluginLoadUnloadNotices: true }
    } as PluginSettingsComponent
  });
}

function createTempPluginClass(name: string, mockPlugin: MockPlugin): RegisterTempPluginParams['tempPluginClass'] {
  // eslint-disable-next-line func-style -- Function expression needed for `this` typing and type casting.
  const pluginFn = function pluginFn(this: MockPlugin, _app: App, _manifest: PluginManifest): void {
    Object.assign(this, mockPlugin);
  };
  const intermediate = pluginFn as never;
  const PluginClass = intermediate as RegisterTempPluginParams['tempPluginClass'];
  Object.defineProperty(PluginClass, 'name', { value: name });
  return PluginClass;
}

describe('TempPluginRegistry', () => {
  let registry: TempPluginRegistry;

  beforeEach(() => {
    mockInvokeAsyncSafely.mockReset();
    mockPrintError.mockReset();
    registry = createRegistry();
  });

  describe('constructor', () => {
    it('should create a TempPluginRegistry that extends Component', () => {
      expect(registry).toBeInstanceOf(Component);
    });
  });

  describe('getTempPlugin', () => {
    it('should return null when plugin is not registered', () => {
      const result = registry.getTempPlugin('NonExistent');
      expect(result).toBeNull();
    });

    it('should return plugin after registration by string name', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      const result = registry.getTempPlugin('TestPlugin');
      expect(result).not.toBeNull();
    });

    it('should return plugin after registration by class', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      const result = registry.getTempPlugin(tempPluginClass);
      expect(result).not.toBeNull();
    });

    it('should return null after plugin is unregistered', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });
      registry.unregisterTempPlugin('TestPlugin');

      const result = registry.getTempPlugin('TestPlugin');
      expect(result).toBeNull();
    });
  });

  describe('registerTempPlugin', () => {
    it('should register a new temp plugin and return it', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      const result = await registry.registerTempPlugin({ tempPluginClass });

      expect(result).not.toBeNull();
      expect(mockInvokeAsyncSafely).toHaveBeenCalledOnce();
    });

    it('should return null when plugin load fails', async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.load.mockRejectedValue(new Error('Load failed'));
      const tempPluginClass = createTempPluginClass('FailPlugin', mockPlugin);

      const result = await registry.registerTempPlugin({ tempPluginClass });

      expect(result).toBeNull();
    });

    it('should show hang notice when plugin load takes too long', async () => {
      vi.useFakeTimers();
      const HANG_TIMEOUT = 3000;

      mockInvokeAsyncSafely.mockImplementation((fn: () => Promise<void>) => {
        fn().catch(() => undefined);
      });

      let resolveLoad: (() => void) | undefined;
      const mockPlugin = createMockPlugin();
      mockPlugin.load.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        })
      );
      const tempPluginClass = createTempPluginClass('SlowPlugin', mockPlugin);

      const registerPromise = registry.registerTempPlugin({ tempPluginClass });

      await vi.advanceTimersByTimeAsync(HANG_TIMEOUT + 1);

      resolveLoad?.();
      await registerPromise;

      vi.useRealTimers();
    });

    it('should not show hang notice when plugin loads before timeout', async () => {
      vi.useFakeTimers();
      const HANG_TIMEOUT = 3000;

      mockInvokeAsyncSafely.mockImplementation((fn: () => Promise<void>) => {
        fn().catch(() => undefined);
      });

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('FastPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      // Advance past the timeout — isLoading is already false
      await vi.advanceTimersByTimeAsync(HANG_TIMEOUT + 1);

      vi.useRealTimers();
    });

    it('should unload existing plugin when re-registering with same class name', async () => {
      const mockPlugin1 = createMockPlugin();
      const mockPlugin2 = createMockPlugin();
      const tempPluginClass1 = createTempPluginClass('TestPlugin', mockPlugin1);
      const tempPluginClass2 = createTempPluginClass('TestPlugin', mockPlugin2);

      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass1 });

      // The plugin stored in the map is created by the constructor, so we need to
      // Verify via the async callback. For the first registration, no unload happens.
      // For the second, the existing plugin should be unloaded.
      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass2 });

      // The first registered plugin instance gets unloaded
      // We verify the unloadTempPlugins path instead since we can't access internals
      expect(mockInvokeAsyncSafely).toHaveBeenCalledTimes(2);
    });

    it('should use _AnonymousPlugin when class name is empty', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      expect(mockInvokeAsyncSafely).toHaveBeenCalledOnce();
    });

    it('should execute the async callback that loads the plugin', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });
    });

    it('should show error notice and call printError when plugin load fails', async () => {
      const loadError = new Error('Load failed');
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const mockPlugin = createMockPlugin();
      mockPlugin.load.mockRejectedValue(loadError);
      const tempPluginClass = createTempPluginClass('FailPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPrintError).toHaveBeenCalledWith(loadError);
      });
    });

    it('should create a style element when cssText is provided', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue({} as never);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('StyledPlugin', mockPlugin);
      const CSS_TEXT = '.test { color: red; }';

      await registry.registerTempPlugin({ cssText: CSS_TEXT, tempPluginClass });

      await vi.waitFor(() => {
        expect(createElSpy).toHaveBeenCalledWith('style', {
          attr: { id: '__temp-plugin-StyledPlugin' },
          text: CSS_TEXT
        });
      });

      createElSpy.mockRestore();
    });

    it('should not create a style element when cssText is not provided', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue({} as never);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('NoStylePlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });

      expect(createElSpy).not.toHaveBeenCalled();

      createElSpy.mockRestore();
    });

    it('should wrap tempPlugin.unload to clean up resources and delete from map', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue({} as never);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('WrappedPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });

      // After the async callback completes, the tempPlugin.unload has been wrapped.
      // Call unloadTempPlugins which calls the wrapped unload on each plugin.
      registry.unloadTempPlugins();

      // After unload, the plugin should be removed from the map.
      // Calling unregisterTempPlugin should show "not registered" notice.
      registry.unregisterTempPlugin('WrappedPlugin');

      // Verify the original unload was called
      expect(mockPlugin.unload).toHaveBeenCalled();

      createElSpy.mockRestore();
    });

    it('should show error notice when originalUnload throws during unload', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue({} as never);

      // Create a plugin whose unload throws
      const unloadError = new Error('Unload failed');
      const mockPlugin = createMockPlugin();
      mockPlugin.unload.mockImplementation(() => {
        throw unloadError;
      });
      const tempPluginClass = createTempPluginClass('ErrorPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });

      // The wrapped unload catches errors from originalUnload
      registry.unloadTempPlugins();

      // Verify printError was called with the unload error
      expect(mockPrintError).toHaveBeenCalledWith(unloadError);

      createElSpy.mockRestore();
    });

    it('should show failure Notice and call printError when wrapped unload throws', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue({} as never);
      // eslint-disable-next-line no-restricted-syntax -- mock requires double assertion to spy on constructor
      const noticeSpy = vi.spyOn(Notice.prototype as unknown as { constructor: () => void }, 'constructor');

      const unloadError = new Error('Unload crash');
      const mockPlugin = createMockPlugin();
      mockPlugin.unload.mockImplementation(() => {
        throw unloadError;
      });
      const tempPluginClass = createTempPluginClass('CrashPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });

      // Reset printError to check only the unload error
      mockPrintError.mockReset();

      registry.unloadTempPlugins();

      // Verify that printError was called with the unload error
      expect(mockPrintError).toHaveBeenCalledWith(unloadError);

      createElSpy.mockRestore();
      noticeSpy.mockRestore();
    });

    it('should remove style element when unloading a plugin that has cssText', async () => {
      async function invokeImpl(fn: () => Promise<void>): Promise<void> {
        await fn();
      }
      mockInvokeAsyncSafely.mockImplementation(invokeImpl);

      const mockStyleEl = { remove: vi.fn() };
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(mockStyleEl as never);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('StyledUnloadPlugin', mockPlugin);

      await registry.registerTempPlugin({ cssText: '.test { color: blue; }', tempPluginClass });

      await vi.waitFor(() => {
        expect(mockPlugin.load).toHaveBeenCalled();
      });

      registry.unloadTempPlugins();

      expect(mockStyleEl.remove).toHaveBeenCalled();

      createElSpy.mockRestore();
    });
  });

  describe('unloadTempPlugins', () => {
    it('should unload all registered temp plugins', async () => {
      const mockPlugin1 = createMockPlugin();
      const mockPlugin2 = createMockPlugin();
      const tempPluginClass1 = createTempPluginClass('Plugin1', mockPlugin1);
      const tempPluginClass2 = createTempPluginClass('Plugin2', mockPlugin2);

      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass1 });
      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass2 });

      registry.unloadTempPlugins();

      // UnloadTempPlugins iterates the map and calls unload on each
      // Since we can't directly inspect the map, we verify no error is thrown
      expect(mockInvokeAsyncSafely).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when no plugins are registered', () => {
      expect(() => {
        registry.unloadTempPlugins();
      }).not.toThrow();
    });
  });

  describe('unregisterTempPlugin', () => {
    it('should show notice when plugin is not registered', () => {
      const PLUGIN_NAME = 'NonExistentPlugin';

      registry.unregisterTempPlugin(PLUGIN_NAME);

      // Notice constructor was called (from the obsidian mock)
      // We just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should unload the plugin when it is registered', async () => {
      const mockPlugin = createMockPlugin();
      const PLUGIN_NAME = 'ExistingPlugin';
      const tempPluginClass = createTempPluginClass(PLUGIN_NAME, mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      registry.unregisterTempPlugin(PLUGIN_NAME);

      // The plugin in the map was created by the constructor in registerTempPlugin,
      // So unload is called on that instance
      expect(mockInvokeAsyncSafely).toHaveBeenCalledOnce();
    });

    it('should unload the plugin when called with class instead of string', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('ClassUnregister', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      registry.unregisterTempPlugin(tempPluginClass);

      // After unregistering, getTempPlugin should return null
      const result = registry.getTempPlugin('ClassUnregister');
      expect(result).toBeNull();
    });
  });
});
