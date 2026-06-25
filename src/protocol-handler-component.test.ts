import type { ObsidianProtocolData } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { ObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import type { Mock } from 'vitest';

import {
  createFunction,
  noop
} from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { ensureGenericObject } from 'obsidian-dev-utils/type-guards';
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
  let mockDebug: Mock<(message: string, ...args: unknown[]) => void>;
  let mockRegisterObsidianProtocolHandler: Mock<ObsidianProtocolHandlerRegistrar['registerObsidianProtocolHandler']>;
  let registeredHandler: (query: ObsidianProtocolData) => Promise<void>;
  let mockSettings: MockSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireStringAsync = vi.fn().mockResolvedValue(undefined);
    mockDebug = vi.fn();
    mockRegisterObsidianProtocolHandler = vi.fn();
    mockSettings = { shouldHandleProtocolUrls: true };

    component = new ProtocolHandlerComponent({
      consoleDebugComponent: strictProxy<ConsoleDebugComponent>({ consoleDebug: mockDebug }),
      obsidianProtocolHandlerRegistrar: strictProxy<ObsidianProtocolHandlerRegistrar>({
        registerObsidianProtocolHandler: mockRegisterObsidianProtocolHandler
      }),
      pluginSettingsComponent: strictProxy<PluginSettingsComponent>({
        settings: strictProxy<PluginSettingsComponent['settings']>(mockSettings)
      }),
      RequireHandlerFactoryComponent: strictProxy<RequireHandlerFactoryComponent>({
        requireStringAsync: mockRequireStringAsync
      })
    });

    component.load();
    registeredHandler = mockRegisterObsidianProtocolHandler.mock.calls[0]?.[0]?.handler as (query: ObsidianProtocolData) => Promise<void>;
  });

  describe('onload', () => {
    it('should register a protocol handler with the correct action name', () => {
      expect(mockRegisterObsidianProtocolHandler).toHaveBeenCalledWith({
        action: 'CodeScriptToolkit',
        handler: expect.any(Function) as unknown
      });
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
        args: '',
        functionName: 'run',
        module: 'my-module'
      });
    });

    it('should use custom args when provided', async () => {
      await registeredHandler(castTo<ObsidianProtocolData>({
        action: 'CodeScriptToolkit',
        args: 'arg1, arg2',
        module: 'my-module'
      }));

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
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
        const fn = createFunction<() => Promise<void>>({
          functionBody: `return (async () => { ${generatedCode} })()`
        });
        await fn();
      } finally {
        genericObjectWindow['requireAsync'] = originalRequireAsync;
      }

      expect(mockRequireAsync).toHaveBeenCalledWith('//Scripts/Test.js');
      // eslint-disable-next-line no-restricted-globals, @typescript-eslint/no-deprecated -- the generated code references the global `app`, so the assertion must too.
      expect(mockModule.invoke).toHaveBeenCalledWith(app);
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
