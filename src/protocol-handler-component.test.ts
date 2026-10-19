import type { ConsoleDebugComponent } from '@mnaoumov/obsidian-lib/components/console-debug-component';
import type {
  ObsidianProtocolData,
  ObsidianProtocolHandler,
  Workspace
} from 'obsidian';
import type { Mock } from 'vitest';

import {
  createFunction,
  noop
} from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  ensureGenericObject,
  ensureNonNullable
} from '@mnaoumov/typescript-lib/type-guards';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import { App } from 'obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';

import { ProtocolHandlerComponent } from './protocol-handler-component.ts';

interface MockSettings {
  shouldHandleProtocolUrls: boolean;
}

describe('ProtocolHandlerComponent', () => {
  let component: ProtocolHandlerComponent;
  let mockRequireStringAsync: Mock<RequireHandlerFactoryComponent['requireStringAsync']>;
  let mockDebug: Mock<(message: string, ...$arguments: unknown[]) => void>;
  let handlers: Map<string, ObsidianProtocolHandler>;
  let registeredHandler: (query: ObsidianProtocolData) => Promise<void>;
  let mockSettings: MockSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireStringAsync = vi.fn().mockResolvedValue(undefined);
    mockDebug = vi.fn();
    handlers = new Map();
    mockSettings = { shouldHandleProtocolUrls: true };

    component = createComponent();
    component.load();
    registeredHandler = ensureNonNullable(handlers.get('CodeScriptToolkit')) as (query: ObsidianProtocolData) => Promise<void>;
  });

  function createComponent(): ProtocolHandlerComponent {
    // Mirrors Obsidian's `WorkspaceProtocolHandler`: a duplicate action throws, and an unregister removes only the handler it names.
    const workspace = strictProxy<Workspace>({
      protocolHandler: strictProxy<Workspace['protocolHandler']>({ handlers }),
      registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
        if (handlers.has(action)) {
          throw new Error(`Action "${action}" is already registered as a handler.`);
        }
        handlers.set(action, handler);
      },
      unregisterObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
        if (handlers.get(action) === handler) {
          handlers.delete(action);
        }
      }
    });

    return new ProtocolHandlerComponent({
      app: strictProxy<App>({ workspace }),
      consoleDebugComponent: strictProxy<ConsoleDebugComponent>({ consoleDebug: mockDebug }),
      pluginSettingsComponent: strictProxy<PluginSettingsComponent>({
        settings: strictProxy<PluginSettingsComponent['settings']>(mockSettings)
      }),
      RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>({
        requireStringAsync: mockRequireStringAsync
      })
    });
  }

  describe('onload', () => {
    it('should register a protocol handler with the correct action name', () => {
      expect(handlers.get('CodeScriptToolkit')).toEqual(expect.any(Function));
    });

    it('should unregister the handler when the component unloads', () => {
      component.unload();
      expect(handlers.has('CodeScriptToolkit')).toBe(false);
    });

    it('should register again after an unload and reload', () => {
      component.unload();
      component.load();
      expect(handlers.get('CodeScriptToolkit')).toEqual(expect.any(Function));
    });

    it('should replace a stale handler left behind by a previous instance instead of throwing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        noop();
      });
      const secondComponent = createComponent();

      expect(() => {
        secondComponent.load();
      }).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Replacing the stale "CodeScriptToolkit" protocol handler left behind by a previous plugin instance.');
      expect(handlers.get('CodeScriptToolkit')).not.toBe(registeredHandler);

      component.unload();
      expect(handlers.has('CodeScriptToolkit')).toBe(true);

      secondComponent.unload();
      expect(handlers.has('CodeScriptToolkit')).toBe(false);
      warnSpy.mockRestore();
    });
  });

  describe('processQuery', () => {
    it('should warn and return when protocol URLs are disabled', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        noop();
      });
      mockSettings.shouldHandleProtocolUrls = false;
      await registeredHandler(castTo<ObsidianProtocolData>({ action: 'CodeScriptToolkit' }));
      expect(warnSpy).toHaveBeenCalledWith('Handling of protocol URLs is disabled in plugin settings.');
      expect(mockRequireStringAsync).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw when neither module nor code is provided', async () => {
      await expect(registeredHandler(castTo<ObsidianProtocolData>({ action: 'CodeScriptToolkit' })))
        .rejects.toThrow('URL provided neither module nor code parameters');
    });

    it('should throw when both module and code are provided', async () => {
      await expect(registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        code: 'console.log("hi")',
        module: 'my-module'
      })))
        .rejects.toThrow('URL provided both module and code parameters');
    });

    it('should construct code from module and call requireStringAsync', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
        // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
        args: 'app',
        functionName: 'invoke',
        module: 'my-module'
      });

      expect(mockRequireStringAsync).toHaveBeenCalledWith({
        code: expect.stringContaining('my-module') as string,
        path: 'dynamic-script-from-url-handler.ts'
      });
    });

    it('should use custom functionName when provided', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        functionName: 'run',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
        // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
        args: '',
        functionName: 'run',
        module: 'my-module'
      });
    });

    it('should use custom args when provided', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
        args: 'arg1, arg2',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
        // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
        args: 'arg1, arg2',
        functionName: 'invoke',
        module: 'my-module'
      });
    });

    it('should default args to app when functionName is invoke', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith(
        'Invoking script file from URL action:',
        expect.objectContaining({
          // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
          args: 'app'
        }) as unknown
      );
    });

    it('should default args to empty string when functionName is not invoke', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        functionName: 'custom',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith(
        'Invoking script file from URL action:',
        expect.objectContaining({
          // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
          args: ''
        }) as unknown
      );
    });

    it('should generate code that executes without reference errors when module is provided', async () => {
      const mockModule = { invoke: vi.fn() };
      const mockRequireAsync = vi.fn().mockResolvedValue(mockModule);

      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        module: '//Scripts/Test.js'
      }));

      interface MockCall {
        code: string;
      }
      const generatedCode = (mockRequireStringAsync.mock.calls[0] as [MockCall])[0].code;
      const genericObjectWindow = ensureGenericObject(window);

      const originalRequireAsync = genericObjectWindow['requireAsync'];
      try {
        genericObjectWindow['requireAsync'] = mockRequireAsync;
        const $function = createFunction<() => Promise<void>>({
          functionBody: `return (async () => { ${generatedCode} })()`
        });
        await $function();
      } finally {
        genericObjectWindow['requireAsync'] = originalRequireAsync;
      }

      expect(mockRequireAsync).toHaveBeenCalledWith('//Scripts/Test.js');
      expect(mockModule.invoke).toHaveBeenCalledWith(expect.any(App));
    });

    it('should call requireStringAsync with code when code is provided', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        code: 'console.log("hello")'
      }));

      expect(mockDebug).toHaveBeenCalledWith('Invoking code from URL action:', {
        code: 'console.log("hello")'
      });

      expect(mockRequireStringAsync).toHaveBeenCalledWith({
        code: 'console.log("hello")',
        path: 'dynamic-script-from-url-handler.ts'
      });
    });
  });
});
