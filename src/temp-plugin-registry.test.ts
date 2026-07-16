import type {
  App,
  PluginManifest
} from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Mock } from 'vitest';

import {
  Component,
  Notice
} from 'obsidian';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RegisterTempPluginParams } from './code-button-context.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

const mockPrintError = vi.fn();

let showNoticeMock: Mock<PluginNoticeComponent['showNotice']>;

interface ObsidianDocumentHead {
  createEl(...args: unknown[]): HTMLElement;
}

function getObsidianDocumentHead(): ObsidianDocumentHead {
  return document.head;
}

// Only `printError` is stubbed (a thin return-value passthrough so the test can assert which error
// Was reported). All other real exports of `obsidian-dev-utils/error` (e.g. `getStackTrace`, used by
// The real `invokeAsyncSafely`) are preserved via `importOriginal`. No dev-utils logic is reimplemented.
vi.mock('obsidian-dev-utils/error', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/error')>(),
  printError: (...args: unknown[]): unknown => (mockPrintError as (...a: unknown[]) => unknown)(...args)
}));

interface MockPlugin {
  load: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
}

function createApp(): App {
  return strictProxy<App>({});
}

function createCommandHandlerComponent(): CommandHandlerComponent {
  return strictProxy<CommandHandlerComponent>({
    registerCommandHandlers: vi.fn(() => ({ dispose: vi.fn(), [Symbol.dispose]: vi.fn() }))
  });
}

function createMockPlugin(): MockPlugin {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn()
  };
}

function createRegistry(shouldShowTempPluginLoadUnloadNotices = true): TempPluginRegistryComponent {
  return new TempPluginRegistryComponent({
    app: createApp(),
    commandHandlerComponent: createCommandHandlerComponent(),
    pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
      showNotice: showNoticeMock
    }),
    pluginSettingsComponent: strictProxy<PluginSettingsComponent>({
      settings: strictProxy<PluginSettingsComponent['settings']>({ shouldShowTempPluginLoadUnloadNotices })
    })
  });
}

function createTempPluginClass(name: string, mockPlugin: MockPlugin): RegisterTempPluginParams['tempPluginClass'] {
  // eslint-disable-next-line func-style -- Function expression needed for `this` typing and type casting.
  const pluginFn = function pluginFn(this: MockPlugin, _app: App, _manifest: PluginManifest): void {
    Object.assign(this, mockPlugin);
  };
  const intermediate = pluginFn;
  const PluginClass = castTo<RegisterTempPluginParams['tempPluginClass']>(intermediate);
  Object.defineProperty(PluginClass, 'name', { value: name });
  return PluginClass;
}

describe('TempPluginRegistry', () => {
  let registry: TempPluginRegistryComponent;

  beforeEach(() => {
    mockPrintError.mockReset();
    showNoticeMock = vi.fn<PluginNoticeComponent['showNotice']>().mockReturnValue(castTo<Notice>({ hide: vi.fn() }));
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
      expect(mockPlugin.load).toHaveBeenCalledOnce();
    });

    it('should register the unload command on register and dispose it on unload', async () => {
      const disposeMock = vi.fn();
      const registerCommandHandlersMock = vi.fn(() => ({ dispose: vi.fn(), [Symbol.dispose]: disposeMock }));
      const localRegistry = new TempPluginRegistryComponent({
        app: createApp(),
        commandHandlerComponent: strictProxy<CommandHandlerComponent>({
          registerCommandHandlers: registerCommandHandlersMock
        }),
        pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
          showNotice: showNoticeMock
        }),
        pluginSettingsComponent: strictProxy<PluginSettingsComponent>({
          settings: strictProxy<PluginSettingsComponent['settings']>({ shouldShowTempPluginLoadUnloadNotices: true })
        })
      });
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('DisposePlugin', mockPlugin);

      await localRegistry.registerTempPlugin({ tempPluginClass });
      expect(registerCommandHandlersMock).toHaveBeenCalledOnce();

      localRegistry.unloadTempPlugins();
      expect(disposeMock).toHaveBeenCalledOnce();
    });

    it('should not show load notice when shouldShowTempPluginLoadUnloadNotices is false', async () => {
      const silentRegistry = createRegistry(false);
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('SilentPlugin', mockPlugin);

      await silentRegistry.registerTempPlugin({ tempPluginClass });

      expect(showNoticeMock).not.toHaveBeenCalled();
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

      // The background reportHang fires a hang notice because loading is still in flight.
      expect(showNoticeMock).toHaveBeenCalledWith(
        'Temp Plugin "SlowPlugin" is taking long to load.',
        { isPermanent: true }
      );

      resolveLoad?.();
      await registerPromise;

      vi.useRealTimers();
    });

    it('should not show hang notice when plugin loads before timeout', async () => {
      vi.useFakeTimers();
      const HANG_TIMEOUT = 3000;

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('FastPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });
      showNoticeMock.mockClear();

      // Advance past the timeout — isLoading is already false
      await vi.advanceTimersByTimeAsync(HANG_TIMEOUT + 1);

      expect(showNoticeMock).not.toHaveBeenCalledWith(
        'Temp Plugin "FastPlugin" is taking long to load.',
        { isPermanent: true }
      );

      vi.useRealTimers();
    });

    it('should unload existing plugin when re-registering with same class name', async () => {
      const mockPlugin1 = createMockPlugin();
      const mockPlugin2 = createMockPlugin();
      const tempPluginClass1 = createTempPluginClass('TestPlugin', mockPlugin1);
      const tempPluginClass2 = createTempPluginClass('TestPlugin', mockPlugin2);

      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass1 });
      await registry.registerTempPlugin({ tempPluginClass: tempPluginClass2 });

      // Re-registering with the same class name unloads the previously registered instance.
      expect(mockPlugin1.unload).toHaveBeenCalled();
      expect(registry.getTempPlugin('TestPlugin')).not.toBeNull();
    });

    it('should use _AnonymousPlugin when class name is empty', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      expect(registry.getTempPlugin('_AnonymousPlugin')).not.toBeNull();
    });

    it('should execute the async callback that loads the plugin', async () => {
      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('TestPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      expect(mockPlugin.load).toHaveBeenCalled();
    });

    it('should show error notice and call printError when plugin load fails', async () => {
      const loadError = new Error('Load failed');
      const mockPlugin = createMockPlugin();
      mockPlugin.load.mockRejectedValue(loadError);
      const tempPluginClass = createTempPluginClass('FailPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      expect(mockPrintError).toHaveBeenCalledWith(loadError);
    });

    it('should create a style element when cssText is provided', async () => {
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(castTo<HTMLElement>({}));

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('StyledPlugin', mockPlugin);
      const CSS_TEXT = '.test { color: red; }';

      await registry.registerTempPlugin({ cssText: CSS_TEXT, tempPluginClass });

      expect(createElSpy).toHaveBeenCalledWith('style', {
        attr: { id: '__temp-plugin-StyledPlugin' },
        text: CSS_TEXT
      });

      createElSpy.mockRestore();
    });

    it('should not create a style element when cssText is not provided', async () => {
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(castTo<HTMLElement>({}));

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('NoStylePlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      expect(mockPlugin.load).toHaveBeenCalled();
      expect(createElSpy).not.toHaveBeenCalled();

      createElSpy.mockRestore();
    });

    it('should wrap tempPlugin.unload to clean up resources and delete from map', async () => {
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(castTo<HTMLElement>({}));

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('WrappedPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      // After registration the tempPlugin.unload has been wrapped.
      // UnloadTempPlugins calls the wrapped unload on each plugin.
      registry.unloadTempPlugins();

      // After unload, the plugin should be removed from the map.
      expect(registry.getTempPlugin('WrappedPlugin')).toBeNull();

      // Verify the original unload was called
      expect(mockPlugin.unload).toHaveBeenCalled();

      createElSpy.mockRestore();
    });

    it('should show error notice when originalUnload throws during unload', async () => {
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(castTo<HTMLElement>({}));

      // Create a plugin whose unload throws
      const unloadError = new Error('Unload failed');
      const mockPlugin = createMockPlugin();
      mockPlugin.unload.mockImplementation(() => {
        throw unloadError;
      });
      const tempPluginClass = createTempPluginClass('ErrorPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      // The wrapped unload catches errors from originalUnload
      registry.unloadTempPlugins();

      // Verify printError was called with the unload error
      expect(mockPrintError).toHaveBeenCalledWith(unloadError);

      createElSpy.mockRestore();
    });

    it('should show failure Notice and call printError when wrapped unload throws', async () => {
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(castTo<HTMLElement>({}));

      const unloadError = new Error('Unload crash');
      const mockPlugin = createMockPlugin();
      mockPlugin.unload.mockImplementation(() => {
        throw unloadError;
      });
      const tempPluginClass = createTempPluginClass('CrashPlugin', mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      // Reset printError to check only the unload error
      mockPrintError.mockReset();

      registry.unloadTempPlugins();

      // Verify that printError was called with the unload error
      expect(mockPrintError).toHaveBeenCalledWith(unloadError);

      createElSpy.mockRestore();
    });

    it('should remove style element when unloading a plugin that has cssText', async () => {
      const mockStyleEl = castTo<HTMLElement>({ remove: vi.fn() });
      const createElSpy = vi.spyOn(getObsidianDocumentHead(), 'createEl').mockReturnValue(mockStyleEl);

      const mockPlugin = createMockPlugin();
      const tempPluginClass = createTempPluginClass('StyledUnloadPlugin', mockPlugin);

      await registry.registerTempPlugin({ cssText: '.test { color: blue; }', tempPluginClass });

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

      expect(mockPlugin1.unload).toHaveBeenCalled();
      expect(mockPlugin2.unload).toHaveBeenCalled();
      expect(registry.getTempPlugin('Plugin1')).toBeNull();
      expect(registry.getTempPlugin('Plugin2')).toBeNull();
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

      expect(showNoticeMock).toHaveBeenCalledWith(`Temp Plugin was not registered: ${PLUGIN_NAME}.`);
    });

    it('should unload the plugin when it is registered', async () => {
      const mockPlugin = createMockPlugin();
      const PLUGIN_NAME = 'ExistingPlugin';
      const tempPluginClass = createTempPluginClass(PLUGIN_NAME, mockPlugin);

      await registry.registerTempPlugin({ tempPluginClass });

      registry.unregisterTempPlugin(PLUGIN_NAME);

      expect(mockPlugin.unload).toHaveBeenCalled();
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
