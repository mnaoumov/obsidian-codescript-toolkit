import type { ObsidianProtocolData } from 'obsidian';

import { noop } from 'obsidian-dev-utils/function';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

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
  toJson: (...args: unknown[]): unknown => (mockToJson as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/type-guards', () => ({
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
      consoleDebugComponent: { debug: mockDebug } as never,
      obsidianProtocolHandlerRegistrar: {
        registerObsidianProtocolHandler: mockRegisterObsidianProtocolHandler
      } as never,
      pluginSettingsComponent: {
        settings: mockSettings
      } as never,
      requireHandlerFactory: {
        requireStringAsync: mockRequireStringAsync
      } as never
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
      await registeredHandler({ action: 'CodeScriptToolkit' } as ObsidianProtocolData);
      expect(warnSpy).toHaveBeenCalledWith('Handling of protocol URLs is disabled in plugin settings.');
      expect(mockRequireStringAsync).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw when neither module nor code is provided', async () => {
      await expect(registeredHandler({ action: 'CodeScriptToolkit' } as ObsidianProtocolData))
        .rejects.toThrow('URL provided neither module nor code parameters');
    });

    it('should throw when both module and code are provided', async () => {
      await expect(registeredHandler({
        action: 'CodeScriptToolkit',
        code: 'console.log("hi")',
        module: 'my-module'
      } as never))
        .rejects.toThrow('URL provided both module and code parameters');
    });

    it('should construct code from module and call requireStringAsync', async () => {
      await registeredHandler({
        action: 'CodeScriptToolkit',
        module: 'my-module'
      } as never);

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
      await registeredHandler({
        action: 'CodeScriptToolkit',
        functionName: 'run',
        module: 'my-module'
      } as never);

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
        args: '',
        functionName: 'run',
        module: 'my-module'
      });
    });

    it('should use custom args when provided', async () => {
      await registeredHandler({
        action: 'CodeScriptToolkit',
        args: 'arg1, arg2',
        module: 'my-module'
      } as never);

      expect(mockDebug).toHaveBeenCalledWith('Invoking script file from URL action:', {
        args: 'arg1, arg2',
        functionName: 'invoke',
        module: 'my-module'
      });
    });

    it('should default args to app when functionName is invoke', async () => {
      await registeredHandler({
        action: 'CodeScriptToolkit',
        module: 'my-module'
      } as never);

      expect(mockDebug).toHaveBeenCalledWith(
        'Invoking script file from URL action:',
        expect.objectContaining({
          args: 'app'
        }) as unknown
      );
    });

    it('should default args to empty string when functionName is not invoke', async () => {
      await registeredHandler({
        action: 'CodeScriptToolkit',
        functionName: 'custom',
        module: 'my-module'
      } as never);

      expect(mockDebug).toHaveBeenCalledWith(
        'Invoking script file from URL action:',
        expect.objectContaining({
          args: ''
        }) as unknown
      );
    });

    it('should call requireStringAsync with code when code is provided', async () => {
      await registeredHandler({
        action: 'CodeScriptToolkit',
        code: 'console.log("hello")'
      } as never);

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
