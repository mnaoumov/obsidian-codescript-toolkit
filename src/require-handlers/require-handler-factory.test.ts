import { Platform } from 'obsidian';
import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerConstructorParams } from './require-handler.ts';

import { RequireHandlerFactoryComponent } from './require-handler-factory.ts';

const mockClearCache = vi.fn();
const mockRequireAsync = vi.fn();
const mockRequireStringAsync = vi.fn();
const mockRequireVaultScriptAsync = vi.fn();

class MockRequireHandler {
  public clearCache = mockClearCache;
  public requireAsync = mockRequireAsync;
  public requireStringAsync = mockRequireStringAsync;
  public requireVaultScriptAsync = mockRequireVaultScriptAsync;
}

const mockAddChild = vi.fn((child: unknown) => child);

interface MockIsMobile {
  isMobile: boolean;
}

vi.mock('obsidian-dev-utils/obsidian/components/component-ex', () => ({
  ComponentEx: class MockComponentEx {
    public addChild = mockAddChild;

    public async loadWithPromises(): Promise<void> {
      await this.onloadAsync();
    }

    public onloadAsync(): Promise<void> {
      return noopAsync();
    }
  }
}));

vi.mock('obsidian-dev-utils/type-guards', () => ({
  ensureNonNullable: <T>(value: T | undefined): T => {
    if (value === undefined || value === null) {
      throw new Error('Value is null or undefined');
    }
    return value;
  }
}));

vi.mock('./require-handler-emulate-mobile.ts', () => ({
  RequireHandlerEmulateMobileComponent: MockRequireHandler
}));

vi.mock('./require-handler-mobile.ts', () => ({
  RequireHandlerMobileComponent: MockRequireHandler
}));

vi.mock('./require-handler-desktop.ts', () => ({
  RequireHandlerDesktopComponent: MockRequireHandler
}));

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Platform: {
    isMobile: false
  }
}));

describe('RequireHandlerFactoryComponent', () => {
  let factory: RequireHandlerFactoryComponent;
  let mockParams: RequireHandlerConstructorParams;

  beforeEach(() => {
    vi.clearAllMocks();
    (Platform as MockIsMobile).isMobile = false;
    activeDocument.body.classList.remove('emulate-mobile');
    activeDocument.body.hasClass = function hasClass(cls: string): boolean {
      return this.classList.contains(cls);
    };

    mockParams = castTo<RequireHandlerConstructorParams>({
      app: {},
      consoleDebugComponent: {},
      pluginRequire: vi.fn(),
      pluginSettingsComponent: {},
      tempPluginRegistry: {}
    });

    factory = new RequireHandlerFactoryComponent(mockParams);
  });

  describe('onload', () => {
    it('should create desktop handler when not mobile and not emulating mobile', async () => {
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
    });

    it('should create mobile handler when Platform.isMobile is true', async () => {
      (Platform as MockIsMobile).isMobile = true;
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
    });

    it('should create emulate-mobile handler when body has emulate-mobile class', async () => {
      activeDocument.body.classList.add('emulate-mobile');
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
    });

    it('should prefer emulate-mobile over mobile when both conditions are true', async () => {
      activeDocument.body.classList.add('emulate-mobile');
      (Platform as MockIsMobile).isMobile = true;
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
    });
  });

  describe('clearCache', () => {
    it('should delegate clearCache to the platform handler', async () => {
      await factory.loadWithPromises();
      factory.clearCache();
      expect(mockClearCache).toHaveBeenCalledOnce();
    });

    it('should throw if called before onload', () => {
      expect(() => {
        factory.clearCache();
      }).toThrow();
    });
  });

  describe('requireAsync', () => {
    it('should delegate requireAsync to the platform handler', async () => {
      const expectedResult = { foo: 'bar' };
      mockRequireAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const result = await factory.requireAsync('test-id', {});
      expect(mockRequireAsync).toHaveBeenCalledWith('test-id', {});
      expect(result).toBe(expectedResult);
    });
  });

  describe('requireStringAsync', () => {
    it('should delegate requireStringAsync to the platform handler', async () => {
      const expectedResult = { exported: true };
      mockRequireStringAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const params = { code: 'console.log("hi")', path: 'test.ts' };
      const result = await factory.requireStringAsync(params);
      expect(mockRequireStringAsync).toHaveBeenCalledWith(params);
      expect(result).toBe(expectedResult);
    });
  });

  describe('requireVaultScriptAsync', () => {
    it('should delegate requireVaultScriptAsync to the platform handler', async () => {
      const expectedResult = { script: true };
      mockRequireVaultScriptAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const result = await factory.requireVaultScriptAsync('my-script');
      expect(mockRequireVaultScriptAsync).toHaveBeenCalledWith('my-script');
      expect(result).toBe(expectedResult);
    });
  });
});
