import type { ObsidianProtocolData } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { ObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';

import {
  createFunction,
  noop
} from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
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

const mockConvertAsyncToSync = vi.fn((fn: unknown) => fn);
const mockToJson = vi.fn((obj: unknown) => JSON.stringify(obj));

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Component: class MockComponent {
    public onload(): void {
      noop();
    }
  }
}));

vi.mock('obsidian-dev-utils/async', () => ({
  convertAsyncToSync: (...args: unknown[]): unknown => (mockConvertAsyncToSync as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/object-utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is required for the mock cast to work at call sites.
  castTo: <T>(value: unknown): T => value as T,
  toJson: (...args: unknown[]): unknown => (mockToJson as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/type-guards', () => ({
  ensureGenericObject: (value: unknown): Record<string, unknown> => value as Record<string, unknown>,
  ensureNonNullable: <T>(value: T | undefined): T => {
    if (value === undefined || value === null) {
      throw new Error('Value is null or undefined');
    }
    return value;
  }
}));

interface MockSettings {
  shouldHandleProtocolUrls: boolean;
}

describe('ProtocolHandlerComponent', () => {
  let component: ProtocolHandlerComponent;
  let mockRequireStringAsync: ReturnType<typeof vi.fn>;
  let mockDebug: ReturnType<typeof vi.fn>;
  let mockRegisterObsidianProtocolHandler: ReturnType<typeof vi.fn>;
  let registeredHandler: (query: ObsidianProtocolData) => Promise<void>;
  let mockSettings: MockSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireStringAsync = vi.fn().mockResolvedValue(undefined);
    mockDebug = vi.fn();
    mockRegisterObsidianProtocolHandler = vi.fn();
    mockSettings = { shouldHandleProtocolUrls: true };

    mockConvertAsyncToSync.mockImplementation((fn: unknown) => fn);

    component = new ProtocolHandlerComponent({
      consoleDebugComponent: castTo<ConsoleDebugComponent>({ consoleDebug: mockDebug }),
      obsidianProtocolHandlerRegistrar: castTo<ObsidianProtocolHandlerRegistrar>({
        registerObsidianProtocolHandler: mockRegisterObsidianProtocolHandler
      }),
      pluginSettingsComponent: castTo<PluginSettingsComponent>({
        settings: mockSettings
      }),
      RequireHandlerFactoryComponent: castTo<RequireHandlerFactoryComponent>({
        requireStringAsync: mockRequireStringAsync
      })
    });

    component.onload();
    registeredHandler = mockRegisterObsidianProtocolHandler.mock.calls[0]?.[1] as (query: ObsidianProtocolData) => Promise<void>;
  });

  describe('onload', () => {
    it('should register a protocol handler with the correct action name', () => {
      expect(mockRegisterObsidianProtocolHandler).toHaveBeenCalledWith(
        'CodeScriptToolkit',
        expect.any(Function) as unknown
      );
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
